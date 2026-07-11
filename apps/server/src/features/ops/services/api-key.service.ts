import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { env } from '../../../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../../../utils/app-error.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { ApiKeyRepository } from '../repositories/ops.repository.js';
import type { CreateApiKeyInput } from '../validation/ops.validation.js';
import { auditLogService } from './audit-log.service.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';

const apiKeyRoles = new Set(['owner', 'admin'] as const);

export class ApiKeyService {
  public constructor(
    private readonly apiKeys = new ApiKeyRepository(),
    private readonly workspaces = new WorkspaceRepository(),
  ) {}

  public async create(userId: Types.ObjectId, input: CreateApiKeyInput): Promise<unknown> {
    const workspaceId = new Types.ObjectId(input.workspaceId);
    await this.requireAccess(workspaceId, userId);
    await entitlementService.requireFeature(workspaceId, 'public_api');
    await entitlementService.requireWithinLimit(workspaceId, 'apiKeys');
    const secret = `${env.PUBLIC_API_KEY_PREFIX}_${crypto.randomBytes(32).toString('base64url')}`;
    const keyHash = this.hash(secret);
    const apiKey = await this.apiKeys.create({
      workspaceId,
      name: input.name,
      keyHash,
      prefix: secret.slice(0, 12),
      scopes: input.scopes,
      createdBy: userId,
    });
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'api_key',
      targetId: apiKey.id,
      action: 'api_key.created',
      metadata: { name: apiKey.name, scopes: apiKey.scopes, prefix: apiKey.prefix },
    });
    return {
      id: apiKey.id,
      workspaceId: apiKey.workspaceId.toString(),
      name: apiKey.name,
      scopes: apiKey.scopes,
      prefix: apiKey.prefix,
      secret,
      createdAt: apiKey.createdAt.toISOString(),
    };
  }

  public async authenticate(
    secret: string,
    scope: string,
  ): Promise<{ id: string; workspaceId: Types.ObjectId; scopes: string[] }> {
    const apiKey = await this.apiKeys.findByHash(this.hash(secret));
    if (!apiKey) throw new UnauthorizedError('Invalid API key');
    if (!apiKey.scopes.includes(scope) && !apiKey.scopes.includes('*')) {
      throw new ForbiddenError('API key scope denied');
    }
    await this.apiKeys.markUsed(apiKey._id);
    return { id: apiKey.id, workspaceId: apiKey.workspaceId, scopes: apiKey.scopes };
  }

  public async revoke(
    workspaceId: Types.ObjectId,
    keyId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    await this.requireAccess(workspaceId, userId);
    await this.apiKeys.revoke(keyId, workspaceId);
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'api_key',
      targetId: keyId.toString(),
      action: 'api_key.revoked',
    });
  }

  private hash(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  private async requireAccess(workspaceId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const membership = await this.workspaces.findMembership(workspaceId, userId);
    if (
      !membership ||
      membership.status !== 'active' ||
      !apiKeyRoles.has(membership.role as 'owner' | 'admin')
    ) {
      throw new ForbiddenError('API key management requires workspace owner or admin access');
    }
  }
}

export const apiKeyService = new ApiKeyService();
