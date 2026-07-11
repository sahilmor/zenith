import type { FilterQuery, Types } from 'mongoose';
import { AuditLogModel, type AuditLogDocument } from '../models/audit-log.model.js';
import { BackgroundJobModel, type BackgroundJobDocument } from '../models/background-job.model.js';
import { FeatureFlagModel, type FeatureFlagDocument } from '../models/feature-flag.model.js';
import {
  WebhookEndpointModel,
  type WebhookEndpointDocument,
} from '../models/webhook-endpoint.model.js';
import { ApiKeyModel, type ApiKeyDocument } from '../models/api-key.model.js';

export class AuditLogRepository {
  public async create(input: {
    actorId?: Types.ObjectId | null;
    workspaceId?: Types.ObjectId | null;
    targetType: string;
    targetId?: string | null;
    action: string;
    ip?: string | null;
    userAgent?: string | null;
    requestId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLogDocument> {
    return AuditLogModel.create(input) as Promise<AuditLogDocument>;
  }

  public async list(filters: {
    workspaceId?: Types.ObjectId;
    actorId?: Types.ObjectId;
    targetType?: string;
    action?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ items: AuditLogDocument[]; total: number }> {
    const query: FilterQuery<AuditLogDocument> = {};
    if (filters.workspaceId) query.workspaceId = filters.workspaceId;
    if (filters.actorId) query.actorId = filters.actorId;
    if (filters.targetType) query.targetType = filters.targetType;
    if (filters.action) query.action = filters.action;
    if (filters.search) {
      query.$or = [
        { action: { $regex: filters.search, $options: 'i' } },
        { targetType: { $regex: filters.search, $options: 'i' } },
        { requestId: { $regex: filters.search, $options: 'i' } },
      ];
    }
    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filters.limit)
        .exec() as Promise<AuditLogDocument[]>,
      AuditLogModel.countDocuments(query).exec(),
    ]);
    return { items, total };
  }
}

export class FeatureFlagRepository {
  public async upsert(input: {
    key: string;
    description?: string | null;
    enabled: boolean;
    rolloutPercentage: number;
    workspaceIds: Types.ObjectId[];
    userIds: Types.ObjectId[];
    metadata: Record<string, unknown>;
    updatedBy: Types.ObjectId;
  }): Promise<FeatureFlagDocument> {
    return FeatureFlagModel.findOneAndUpdate({ key: input.key }, input, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }).exec() as Promise<FeatureFlagDocument>;
  }

  public async list(): Promise<FeatureFlagDocument[]> {
    return FeatureFlagModel.find({}).sort({ key: 1 }).exec() as Promise<FeatureFlagDocument[]>;
  }

  public async findByKey(key: string): Promise<FeatureFlagDocument | null> {
    return FeatureFlagModel.findOne({ key }).exec() as Promise<FeatureFlagDocument | null>;
  }
}

export class BackgroundJobRepository {
  public async enqueue(input: {
    type: string;
    payload: Record<string, unknown>;
    runAt?: Date;
    maxAttempts: number;
  }): Promise<BackgroundJobDocument> {
    return BackgroundJobModel.create(input) as Promise<BackgroundJobDocument>;
  }

  public async list(filters: {
    status?: 'queued' | 'running' | 'succeeded' | 'failed';
    type?: string;
    page: number;
    limit: number;
  }): Promise<{ items: BackgroundJobDocument[]; total: number }> {
    const query: FilterQuery<BackgroundJobDocument> = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      BackgroundJobModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filters.limit)
        .exec() as Promise<BackgroundJobDocument[]>,
      BackgroundJobModel.countDocuments(query).exec(),
    ]);
    return { items, total };
  }

  public async claimDue(limit: number): Promise<BackgroundJobDocument[]> {
    const jobs = (await BackgroundJobModel.find({
      status: 'queued',
      runAt: { $lte: new Date() },
      $expr: { $lt: ['$attempts', '$maxAttempts'] },
    })
      .sort({ runAt: 1 })
      .limit(limit)
      .exec()) as BackgroundJobDocument[];
    await Promise.all(
      jobs.map((job) =>
        BackgroundJobModel.updateOne(
          { _id: job._id, status: 'queued' },
          { status: 'running', lockedAt: new Date(), $inc: { attempts: 1 } },
        ).exec(),
      ),
    );
    return jobs;
  }

  public async complete(jobId: Types.ObjectId): Promise<void> {
    await BackgroundJobModel.updateOne(
      { _id: jobId },
      { status: 'succeeded', finishedAt: new Date(), error: null },
    ).exec();
  }

  public async fail(job: BackgroundJobDocument, error: string): Promise<void> {
    const status = job.attempts + 1 >= job.maxAttempts ? 'failed' : 'queued';
    await BackgroundJobModel.updateOne(
      { _id: job._id },
      {
        status,
        error,
        lockedAt: null,
        finishedAt: status === 'failed' ? new Date() : null,
        runAt: new Date(Date.now() + Math.min(60_000, 2 ** job.attempts * 1000)),
      },
    ).exec();
  }
}

export class WebhookRepository {
  public async create(input: {
    workspaceId: Types.ObjectId;
    url: string;
    events: string[];
    secret: string;
    createdBy: Types.ObjectId;
  }): Promise<WebhookEndpointDocument> {
    return WebhookEndpointModel.create(input) as Promise<WebhookEndpointDocument>;
  }

  public async list(workspaceId: Types.ObjectId): Promise<WebhookEndpointDocument[]> {
    return WebhookEndpointModel.find({ workspaceId }).sort({ createdAt: -1 }).exec() as Promise<
      WebhookEndpointDocument[]
    >;
  }

  public async delete(webhookId: Types.ObjectId, workspaceId: Types.ObjectId): Promise<boolean> {
    const result = await WebhookEndpointModel.deleteOne({ _id: webhookId, workspaceId }).exec();
    return result.deletedCount === 1;
  }

  public async listEnabled(
    workspaceId: Types.ObjectId,
    event: string,
  ): Promise<WebhookEndpointDocument[]> {
    return WebhookEndpointModel.find({
      workspaceId,
      enabled: true,
      events: event,
    }).exec() as Promise<WebhookEndpointDocument[]>;
  }

  public async markDelivered(webhookId: Types.ObjectId): Promise<void> {
    await WebhookEndpointModel.updateOne(
      { _id: webhookId },
      { lastDeliveredAt: new Date(), failureCount: 0 },
    ).exec();
  }

  public async markFailed(webhookId: Types.ObjectId): Promise<void> {
    await WebhookEndpointModel.updateOne(
      { _id: webhookId },
      { lastFailureAt: new Date(), $inc: { failureCount: 1 } },
    ).exec();
  }
}

export class ApiKeyRepository {
  public async create(input: {
    workspaceId: Types.ObjectId;
    name: string;
    keyHash: string;
    prefix: string;
    scopes: string[];
    createdBy: Types.ObjectId;
  }): Promise<ApiKeyDocument> {
    return ApiKeyModel.create(input) as Promise<ApiKeyDocument>;
  }

  public async findByHash(keyHash: string): Promise<ApiKeyDocument | null> {
    return ApiKeyModel.findOne({
      keyHash,
      revokedAt: null,
    }).exec() as Promise<ApiKeyDocument | null>;
  }

  public async markUsed(apiKeyId: Types.ObjectId): Promise<void> {
    await ApiKeyModel.updateOne({ _id: apiKeyId }, { lastUsedAt: new Date() }).exec();
  }

  public async revoke(keyId: Types.ObjectId, workspaceId: Types.ObjectId): Promise<boolean> {
    const result = await ApiKeyModel.updateOne(
      { _id: keyId, workspaceId },
      { revokedAt: new Date() },
    ).exec();
    return result.modifiedCount === 1;
  }
}
