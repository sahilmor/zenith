import type { Request } from 'express';
import { Types } from 'mongoose';
import { AuditLogRepository } from '../repositories/ops.repository.js';
import type { ListAuditLogsQuery } from '../validation/ops.validation.js';

export interface AuditLogSummary {
  id: string;
  actorId: string | null;
  workspaceId: string | null;
  targetType: string;
  targetId: string | null;
  action: string;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export class AuditLogService {
  public constructor(private readonly auditLogs = new AuditLogRepository()) {}

  public async record(input: {
    actorId?: Types.ObjectId | null;
    workspaceId?: Types.ObjectId | null;
    targetType: string;
    targetId?: string | null;
    action: string;
    ip?: string | null;
    userAgent?: string | null;
    requestId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLogSummary> {
    const log = await this.auditLogs.create(input);
    return {
      id: log.id,
      actorId: log.actorId?.toString() ?? null,
      workspaceId: log.workspaceId?.toString() ?? null,
      targetType: log.targetType,
      targetId: log.targetId ?? null,
      action: log.action,
      ip: log.ip ?? null,
      userAgent: log.userAgent ?? null,
      requestId: log.requestId ?? null,
      metadata: log.metadata as Record<string, unknown>,
      createdAt: log.createdAt.toISOString(),
    };
  }

  public async recordFromRequest(
    request: Request,
    input: {
      workspaceId?: Types.ObjectId | null;
      targetType: string;
      targetId?: string | null;
      action: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.record({
      actorId: request.user?._id ?? null,
      workspaceId: input.workspaceId ?? null,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      action: input.action,
      ip: request.ip ?? null,
      userAgent: request.header('user-agent') ?? null,
      requestId: request.requestId ?? null,
      metadata: input.metadata ?? {},
    });
  }

  public async list(query: ListAuditLogsQuery): Promise<{
    items: AuditLogSummary[];
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  }> {
    const result = await this.auditLogs.list({
      page: query.page,
      limit: query.limit,
      ...(query.workspaceId ? { workspaceId: new Types.ObjectId(query.workspaceId) } : {}),
      ...(query.actorId ? { actorId: new Types.ObjectId(query.actorId) } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.search ? { search: query.search } : {}),
    });
    return {
      items: result.items.map((log) => ({
        id: log.id,
        actorId: log.actorId?.toString() ?? null,
        workspaceId: log.workspaceId?.toString() ?? null,
        targetType: log.targetType,
        targetId: log.targetId ?? null,
        action: log.action,
        ip: log.ip ?? null,
        userAgent: log.userAgent ?? null,
        requestId: log.requestId ?? null,
        metadata: log.metadata as Record<string, unknown>,
        createdAt: log.createdAt.toISOString(),
      })),
      page: query.page,
      limit: query.limit,
      total: result.total,
      hasMore: query.page * query.limit < result.total,
    };
  }
}

export const auditLogService = new AuditLogService();
