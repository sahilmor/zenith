import type { Types } from 'mongoose';
import {
  DocumentExportModel,
  DocumentMediaAssetModel,
  DocumentOperationalMetricModel,
  DocumentRetentionPolicyModel,
  DocumentSyncOperationModel,
  type DocumentExportDocument,
  type DocumentMediaAssetDocument,
  type DocumentOperationalMetricDocument,
  type DocumentRetentionPolicyDocument,
  type DocumentSyncOperationDocument,
} from '../models/document-operations.model.js';

export class DocumentOperationsRepository {
  public async upsertSyncOperation(input: {
    workspaceId: Types.ObjectId;
    pageId: Types.ObjectId | null;
    clientOperationId: string;
    userId: Types.ObjectId;
    type: DocumentSyncOperationDocument['type'];
    baseUpdatedAt: Date | null;
    payload: Record<string, unknown>;
  }): Promise<DocumentSyncOperationDocument> {
    return DocumentSyncOperationModel.findOneAndUpdate(
      {
        workspaceId: input.workspaceId,
        userId: input.userId,
        clientOperationId: input.clientOperationId,
      },
      { $setOnInsert: input },
      { upsert: true, new: true },
    ).exec() as Promise<DocumentSyncOperationDocument>;
  }

  public async updateSyncOperation(
    id: Types.ObjectId,
    update: Partial<DocumentSyncOperationDocument>,
  ): Promise<DocumentSyncOperationDocument | null> {
    return DocumentSyncOperationModel.findByIdAndUpdate(id, update, {
      new: true,
    }).exec() as Promise<DocumentSyncOperationDocument | null>;
  }

  public async createMediaAsset(
    input: Partial<DocumentMediaAssetDocument>,
  ): Promise<DocumentMediaAssetDocument> {
    return DocumentMediaAssetModel.create(input) as Promise<DocumentMediaAssetDocument>;
  }

  public async findMediaAsset(id: Types.ObjectId): Promise<DocumentMediaAssetDocument | null> {
    return DocumentMediaAssetModel.findById(
      id,
    ).exec() as Promise<DocumentMediaAssetDocument | null>;
  }

  public async listMediaAssets(input: {
    workspaceId?: Types.ObjectId | null;
    search?: string;
    archived?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: DocumentMediaAssetDocument[]; total: number }> {
    const query = {
      workspaceId: input.workspaceId,
      archived: input.archived ?? false,
      ...(input.search
        ? {
            $or: [
              { originalName: { $regex: input.search, $options: 'i' } },
              { fileType: { $regex: input.search, $options: 'i' } },
            ],
          }
        : {}),
    };
    const page = input.page ?? 1;
    const limit = input.limit ?? 30;
    const [items, total] = await Promise.all([
      DocumentMediaAssetModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec() as Promise<DocumentMediaAssetDocument[]>,
      DocumentMediaAssetModel.countDocuments(query),
    ]);
    return { items, total };
  }

  public async updateMediaAsset(
    id: Types.ObjectId,
    update: Partial<DocumentMediaAssetDocument>,
  ): Promise<DocumentMediaAssetDocument | null> {
    return DocumentMediaAssetModel.findByIdAndUpdate(id, update, {
      new: true,
    }).exec() as Promise<DocumentMediaAssetDocument | null>;
  }

  public async ensureRetentionPolicy(
    workspaceId: Types.ObjectId,
  ): Promise<DocumentRetentionPolicyDocument> {
    return DocumentRetentionPolicyModel.findOneAndUpdate(
      { workspaceId },
      { $setOnInsert: { workspaceId } },
      { upsert: true, new: true },
    ).exec() as Promise<DocumentRetentionPolicyDocument>;
  }

  public async updateRetentionPolicy(
    workspaceId: Types.ObjectId,
    update: Record<string, unknown>,
  ): Promise<DocumentRetentionPolicyDocument | null> {
    return DocumentRetentionPolicyModel.findOneAndUpdate({ workspaceId }, update, {
      upsert: true,
      new: true,
    }).exec() as Promise<DocumentRetentionPolicyDocument | null>;
  }

  public async createExport(
    input: Partial<DocumentExportDocument>,
  ): Promise<DocumentExportDocument> {
    return DocumentExportModel.create(input) as Promise<DocumentExportDocument>;
  }

  public async expireExports(before: Date): Promise<number> {
    const result = await DocumentExportModel.updateMany(
      { status: 'ready', expiresAt: { $lte: before } },
      { status: 'expired' },
    ).exec();
    return result.modifiedCount;
  }

  public async createOperationalMetric(input: {
    workspaceId: Types.ObjectId | null;
    userId?: Types.ObjectId | null;
    requestId?: string | null;
    operation: DocumentOperationalMetricDocument['operation'];
    status: DocumentOperationalMetricDocument['status'];
    durationMs: number;
    errorCategory?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<DocumentOperationalMetricDocument> {
    return DocumentOperationalMetricModel.create(
      input,
    ) as Promise<DocumentOperationalMetricDocument>;
  }
}
