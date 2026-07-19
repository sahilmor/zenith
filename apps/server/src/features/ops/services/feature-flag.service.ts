import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { ForbiddenError } from '../../../utils/app-error.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { FeatureFlagRepository } from '../repositories/ops.repository.js';
import type { UpsertFeatureFlagInput } from '../validation/ops.validation.js';
import { auditLogService } from './audit-log.service.js';

export class FeatureFlagService {
  public constructor(
    private readonly flags = new FeatureFlagRepository(),
    private readonly workspaces = new WorkspaceRepository(),
  ) {}

  public async list(): Promise<unknown[]> {
    return (await this.flags.list()).map((flag) => ({
      id: flag.id,
      key: flag.key,
      description: flag.description ?? null,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      workspaceIds: flag.workspaceIds.map((id) => id.toString()),
      userIds: flag.userIds.map((id) => id.toString()),
      metadata: flag.metadata as Record<string, unknown>,
      createdAt: flag.createdAt.toISOString(),
      updatedAt: flag.updatedAt.toISOString(),
    }));
  }

  public async upsert(userId: Types.ObjectId, input: UpsertFeatureFlagInput): Promise<unknown> {
    const flag = await this.flags.upsert({
      key: input.key,
      description: input.description ?? null,
      enabled: input.enabled,
      rolloutPercentage: input.rolloutPercentage,
      workspaceIds: input.workspaceIds.map((id) => new Types.ObjectId(id)),
      userIds: input.userIds.map((id) => new Types.ObjectId(id)),
      metadata: input.metadata,
      updatedBy: userId,
    });
    await auditLogService.record({
      actorId: userId,
      targetType: 'feature_flag',
      targetId: flag.id,
      action: 'feature_flag.updated',
      metadata: {
        key: flag.key,
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
      },
    });
    return {
      id: flag.id,
      key: flag.key,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
    };
  }

  public async evaluate(input: {
    key: string;
    userId: Types.ObjectId;
    workspaceId?: Types.ObjectId;
  }): Promise<{ key: string; enabled: boolean; reason: string }> {
    if (input.workspaceId) {
      const membership = await this.workspaces.findMembership(input.workspaceId, input.userId);
      if (!membership || membership.status !== 'active') {
        throw new ForbiddenError('Workspace access denied');
      }
    }
    const flag = await this.flags.findByKey(input.key.toLowerCase());
    if (!flag || !flag.enabled) return { key: input.key, enabled: false, reason: 'disabled' };
    if (flag.userIds.some((id) => id.equals(input.userId))) {
      return { key: flag.key, enabled: true, reason: 'user' };
    }
    if (input.workspaceId && flag.workspaceIds.some((id) => id.equals(input.workspaceId))) {
      return { key: flag.key, enabled: true, reason: 'workspace' };
    }
    if (flag.rolloutPercentage >= 100) return { key: flag.key, enabled: true, reason: 'global' };
    const basis = `${flag.key}:${input.workspaceId?.toString() ?? input.userId.toString()}`;
    const firstByte = crypto.createHash('sha256').update(basis).digest().at(0) ?? 0;
    const bucket = firstByte % 100;
    return {
      key: flag.key,
      enabled: bucket < flag.rolloutPercentage,
      reason: 'rollout',
    };
  }

  public async isEnabled(
    input: {
      key: string;
      userId: Types.ObjectId;
      workspaceId?: Types.ObjectId;
    },
    defaultEnabled: boolean,
  ): Promise<boolean> {
    if (input.workspaceId) {
      const membership = await this.workspaces.findMembership(input.workspaceId, input.userId);
      if (!membership || membership.status !== 'active') {
        throw new ForbiddenError('Workspace access denied');
      }
    }
    const flag = await this.flags.findByKey(input.key.toLowerCase());
    if (!flag) return defaultEnabled;
    return (await this.evaluate(input)).enabled;
  }
}

export const featureFlagService = new FeatureFlagService();
