import type { Request } from 'express';
import { Types } from 'mongoose';
import { env } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import { AuditLogRepository } from '../repositories/ops.repository.js';
import type { ExportAuditLogsQuery, ListAuditLogsQuery } from '../validation/ops.validation.js';

const sweepIntervalMs = 24 * 60 * 60 * 1000;
const exportLimit = 10_000;

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
  private timer: NodeJS.Timeout | null = null;
  private sweeping = false;

  public constructor(private readonly auditLogs = new AuditLogRepository()) {}

  public start(): void {
    if (this.timer || env.AUDIT_LOG_RETENTION_DAYS <= 0) return;
    this.timer = setInterval(() => void this.sweepRetention(), sweepIntervalMs);
  }

  public stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  public async sweepRetention(): Promise<number> {
    if (this.sweeping || env.AUDIT_LOG_RETENTION_DAYS <= 0) return 0;
    this.sweeping = true;
    try {
      const before = new Date(Date.now() - env.AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const deleted = await this.auditLogs.deleteOlderThan(before);
      if (deleted > 0) logger.info('Audit log retention sweep completed', { deleted });
      return deleted;
    } finally {
      this.sweeping = false;
    }
  }

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

  public async exportCsv(query: ExportAuditLogsQuery): Promise<string> {
    const logs = await this.auditLogs.listAll(
      {
        ...(query.workspaceId ? { workspaceId: new Types.ObjectId(query.workspaceId) } : {}),
        ...(query.actorId ? { actorId: new Types.ObjectId(query.actorId) } : {}),
        ...(query.targetType ? { targetType: query.targetType } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.search ? { search: query.search } : {}),
      },
      exportLimit,
    );
    const headers = [
      'id',
      'createdAt',
      'actorId',
      'workspaceId',
      'targetType',
      'targetId',
      'action',
      'ip',
      'userAgent',
      'requestId',
      'metadata',
    ];
    const escape = (value: string): string => `"${value.replace(/"/g, '""')}"`;
    const rows = logs.map((log) =>
      [
        log.id,
        log.createdAt.toISOString(),
        log.actorId?.toString() ?? '',
        log.workspaceId?.toString() ?? '',
        log.targetType,
        log.targetId ?? '',
        log.action,
        log.ip ?? '',
        log.userAgent ?? '',
        log.requestId ?? '',
        JSON.stringify(log.metadata ?? {}),
      ]
        .map((value) => escape(String(value)))
        .join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }
}

export const auditLogService = new AuditLogService();
