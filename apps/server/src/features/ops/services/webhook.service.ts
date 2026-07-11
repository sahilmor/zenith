import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { env } from '../../../config/env.js';
import { ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import { logger } from '../../../utils/logger.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { WebhookRepository } from '../repositories/ops.repository.js';
import type { CreateWebhookInput } from '../validation/ops.validation.js';
import { auditLogService } from './audit-log.service.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';

const webhookRoles = new Set(['owner', 'admin'] as const);

export class WebhookService {
  public constructor(
    private readonly webhooks = new WebhookRepository(),
    private readonly workspaces = new WorkspaceRepository(),
  ) {}

  public async create(userId: Types.ObjectId, input: CreateWebhookInput): Promise<unknown> {
    const workspaceId = new Types.ObjectId(input.workspaceId);
    await this.requireWebhookAccess(workspaceId, userId);
    await entitlementService.requireFeature(workspaceId, 'webhooks');
    await entitlementService.requireWithinLimit(workspaceId, 'webhooks');
    const secret = crypto.randomBytes(32).toString('hex');
    const webhook = await this.webhooks.create({
      workspaceId,
      url: input.url,
      events: input.events,
      secret,
      createdBy: userId,
    });
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'webhook',
      targetId: webhook.id,
      action: 'webhook.created',
      metadata: { url: webhook.url, events: webhook.events },
    });
    return {
      id: webhook.id,
      workspaceId: webhook.workspaceId.toString(),
      url: webhook.url,
      events: webhook.events,
      enabled: webhook.enabled,
      secret,
      createdAt: webhook.createdAt.toISOString(),
    };
  }

  public async list(workspaceId: Types.ObjectId, userId: Types.ObjectId): Promise<unknown[]> {
    await this.requireWebhookAccess(workspaceId, userId);
    return (await this.webhooks.list(workspaceId)).map((webhook) => ({
      id: webhook.id,
      workspaceId: webhook.workspaceId.toString(),
      url: webhook.url,
      events: webhook.events,
      enabled: webhook.enabled,
      failureCount: webhook.failureCount,
      lastDeliveredAt: webhook.lastDeliveredAt?.toISOString() ?? null,
      lastFailureAt: webhook.lastFailureAt?.toISOString() ?? null,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
    }));
  }

  public async delete(
    workspaceId: Types.ObjectId,
    webhookId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    await this.requireWebhookAccess(workspaceId, userId);
    const deleted = await this.webhooks.delete(webhookId, workspaceId);
    if (!deleted) throw new NotFoundError('Webhook not found');
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'webhook',
      targetId: webhookId.toString(),
      action: 'webhook.deleted',
    });
  }

  public async emit(input: {
    workspaceId: Types.ObjectId;
    event: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const endpoints = await this.webhooks.listEnabled(input.workspaceId, input.event);
    await Promise.all(
      endpoints.map(async (endpoint) => {
        const body = JSON.stringify({
          id: crypto.randomUUID(),
          event: input.event,
          workspaceId: input.workspaceId.toString(),
          data: input.payload,
          createdAt: new Date().toISOString(),
        });
        const signature = crypto
          .createHmac('sha256', endpoint.secret || env.WEBHOOK_SIGNING_SECRET)
          .update(body)
          .digest('hex');
        try {
          const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'user-agent': 'Zenith-Webhooks/1.0',
              'x-zenith-event': input.event,
              'x-zenith-signature': `sha256=${signature}`,
            },
            body,
          });
          if (!response.ok) throw new Error(`Webhook failed with ${response.status}`);
          await this.webhooks.markDelivered(endpoint._id);
        } catch (error) {
          logger.warn('Webhook delivery failed', {
            webhookId: endpoint.id,
            event: input.event,
            error: error instanceof Error ? error.message : String(error),
          });
          await this.webhooks.markFailed(endpoint._id);
        }
      }),
    );
  }

  private async requireWebhookAccess(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    const membership = await this.workspaces.findMembership(workspaceId, userId);
    if (
      !membership ||
      membership.status !== 'active' ||
      !webhookRoles.has(membership.role as 'owner' | 'admin')
    ) {
      throw new ForbiddenError('Webhook management requires workspace owner or admin access');
    }
  }
}

export const webhookService = new WebhookService();
