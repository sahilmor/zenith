import type {
  DocumentBlockSummary,
  DocumentBulkAction,
  DocumentBulkOperationSummary,
  DocumentExportFormat,
  DocumentExportSummary,
  DocumentImportFormat,
  DocumentImportSummary,
  DocumentMediaAssetSummary,
  DocumentPageDetailSummary,
  DocumentRetentionPolicySummary,
  DocumentSyncOperationStatus,
  DocumentSyncOperationSummary,
  DocumentSyncOperationType,
  DocumentSyncSummary,
  WorkspaceRole,
} from '@pm/types';
import PDFDocument from 'pdfkit';
import { Types } from 'mongoose';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../utils/app-error.js';
import { ActivityService } from '../../activity/services/activity.service.js';
import type { ActivityEventName } from '../../activity/models/activity-event.model.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import { backgroundJobService } from '../../ops/services/background-job.service.js';
import { featureFlagService } from '../../ops/services/feature-flag.service.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import {
  CloudinaryStorageService,
  type StorageService,
} from '../../../services/cloudinary.service.js';
import { maxAttachmentSize } from '../../../middleware/upload.middleware.js';
import { DocumentPageModel } from '../models/document-page.model.js';
import {
  type DocumentMediaAssetDocument,
  type DocumentRetentionPolicyDocument,
  type DocumentSyncOperationDocument,
} from '../models/document-operations.model.js';
import { DocumentOperationsRepository } from '../repositories/document-operations.repository.js';
import { documentService } from './document.service.js';
import { logger } from '../../../utils/logger.js';
import type {
  BulkDocumentInput,
  DocumentImportInput,
  DocumentSyncInput,
  ExportDocumentInput,
  ListMediaInput,
  UpdateMediaInput,
  UpdateRetentionPolicyInput,
} from '../validation/document.validation.js';

const writeRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager']);
const supportedImportFormats = new Set<DocumentImportFormat>(['markdown', 'html', 'text']);
const exportContentTypes: Record<DocumentExportFormat, string> = {
  markdown: 'text/markdown; charset=utf-8',
  html: 'text/html; charset=utf-8',
  pdf: 'application/pdf',
  text: 'text/plain; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

const toObjectId = (value: string): Types.ObjectId => new Types.ObjectId(value);
const unsafeTextPattern = /<\s*script|javascript:|data:text\/html/i;
const unsafeObjectKeyPattern = /^(?:__proto__|prototype|constructor|on[a-z]+)/i;
type DocumentOperationMetricName =
  | 'sync'
  | 'import'
  | 'export'
  | 'bulk'
  | 'media_upload'
  | 'media_update'
  | 'media_delete'
  | 'retention_update'
  | 'cleanup';

export interface DocumentExportFile {
  readonly summary: DocumentExportSummary;
  readonly buffer: Buffer;
}

export class DocumentOperationsService {
  public constructor(
    private readonly operations = new DocumentOperationsRepository(),
    private readonly workspaces = new WorkspaceRepository(),
    private readonly activity = new ActivityService(),
    private readonly storage: StorageService = new CloudinaryStorageService(),
  ) {}

  public async synchronize(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: DocumentSyncInput,
    requestId?: string | null,
  ): Promise<DocumentSyncSummary> {
    const startedAt = Date.now();
    try {
      await this.requireDocumentFlag(workspaceId, userId, 'documents.offline');
      await this.requireWorkspaceMembership(workspaceId, userId);
      const applied: DocumentSyncOperationSummary[] = [];
      const conflicts: DocumentSyncOperationSummary[] = [];
      const failed: DocumentSyncOperationSummary[] = [];

      for (const operation of input.operations) {
        const pageId = operation.pageId ? toObjectId(operation.pageId) : null;
        const saved = await this.operations.upsertSyncOperation({
          workspaceId,
          pageId,
          userId,
          clientOperationId: operation.clientOperationId,
          type: operation.type,
          baseUpdatedAt: operation.baseUpdatedAt ? new Date(operation.baseUpdatedAt) : null,
          payload: this.sanitizePayload(operation.payload, 'payload'),
        });
        if (saved.status === 'applied') {
          applied.push(this.toSyncOperation(saved));
          continue;
        }
        const result = await this.applySyncOperation(saved, userId);
        if (result.status === 'applied') applied.push(result);
        else if (result.status === 'conflict') conflicts.push(result);
        else failed.push(result);
      }
      const summary = {
        status: conflicts.length > 0 ? 'conflict' : failed.length > 0 ? 'failed' : 'online',
        applied,
        conflicts,
        failed,
        serverTime: new Date().toISOString(),
      } satisfies DocumentSyncSummary;
      await this.recordOperationalMetric({
        workspaceId,
        userId,
        requestId,
        operation: 'sync',
        status: failed.length > 0 ? 'failed' : 'succeeded',
        durationMs: Date.now() - startedAt,
        metadata: {
          operationCount: input.operations.length,
          applied: applied.length,
          conflicts: conflicts.length,
          failed: failed.length,
        },
      });
      return summary;
    } catch (error) {
      await this.recordOperationalFailure(workspaceId, userId, requestId, 'sync', startedAt, error);
      throw error;
    }
  }

  public async importDocument(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: DocumentImportInput,
    file?: Express.Multer.File,
    requestId?: string | null,
  ): Promise<DocumentImportSummary> {
    const startedAt = Date.now();
    try {
      await this.requireDocumentFlag(workspaceId, userId, 'documents.imports');
      await this.requireWorkspaceMembership(workspaceId, userId);
      await entitlementService.requireFeature(workspaceId, 'documents');
      if (!supportedImportFormats.has(input.format)) {
        throw new BadRequestError(
          `${input.format.toUpperCase()} import requires a binary parser that is not configured`,
        );
      }
      const content = file ? file.buffer.toString('utf8') : input.content;
      if (!content.trim()) throw new BadRequestError('Import content is required');
      if (Buffer.byteLength(content, 'utf8') > maxAttachmentSize) {
        throw new BadRequestError('Import file exceeds the maximum document import size');
      }
      const blocks = this.parseBlocks(input.format, content);
      const page = await documentService.createPage(toObjectId(input.spaceId), userId, {
        title: input.title,
        folderId: input.folderId ?? undefined,
        parentPageId: input.parentPageId ?? undefined,
        status: input.status,
        permissions: [],
        blocks,
        properties: { imported: true, importFormat: input.format },
        tagIds: [],
      });
      await Promise.all([
        this.record(workspaceId, userId, 'document.imported', {
          pageId: page.id,
          format: input.format,
          blockCount: blocks.length,
        }),
        auditLogService.record({
          actorId: userId,
          workspaceId,
          targetType: 'document_page',
          targetId: page.id,
          action: 'document.imported',
          requestId: requestId ?? null,
          metadata: { format: input.format, title: page.title },
        }),
        this.recordOperationalMetric({
          workspaceId,
          userId,
          requestId: requestId ?? null,
          operation: 'import',
          status: 'succeeded',
          durationMs: Date.now() - startedAt,
          metadata: {
            format: input.format,
            blockCount: blocks.length,
            fileSize: file?.size ?? null,
          },
        }),
      ]);
      return {
        page,
        format: input.format,
        blockCount: blocks.length,
        warnings: input.format === 'html' ? ['Unsafe HTML tags and attributes were stripped.'] : [],
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      await this.recordOperationalFailure(
        workspaceId,
        userId,
        requestId,
        'import',
        startedAt,
        error,
        {
          format: input.format,
          fileSize: file?.size ?? null,
        },
      );
      throw error;
    }
  }

  public async exportDocument(
    userId: Types.ObjectId,
    input: ExportDocumentInput,
    requestId?: string | null,
  ): Promise<DocumentExportFile> {
    const startedAt = Date.now();
    let workspaceId: Types.ObjectId | null = null;
    try {
      const page = await documentService.getPage(toObjectId(input.pageId), userId);
      workspaceId = toObjectId(page.workspaceId);
      await this.requireDocumentFlag(workspaceId, userId, 'documents.exports');
      const buffer = await this.renderExport(page, input.format);
      const fileName = `${this.fileSafe(page.title)}.${input.format === 'markdown' ? 'md' : input.format}`;
      await this.operations.createExport({
        workspaceId,
        pageId: toObjectId(page.id),
        userId,
        format: input.format,
        fileName,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        size: buffer.byteLength,
        metadata: { blockCount: page.blocks.length },
      });
      await Promise.all([
        this.record(workspaceId, userId, 'document.exported', {
          pageId: page.id,
          format: input.format,
          size: buffer.byteLength,
        }),
        this.recordOperationalMetric({
          workspaceId,
          userId,
          requestId: requestId ?? null,
          operation: 'export',
          status: 'succeeded',
          durationMs: Date.now() - startedAt,
          metadata: { pageId: page.id, format: input.format, size: buffer.byteLength },
        }),
      ]);
      return {
        summary: {
          pageId: page.id,
          format: input.format,
          fileName,
          contentType: exportContentTypes[input.format],
          size: buffer.byteLength,
        },
        buffer,
      };
    } catch (error) {
      if (workspaceId) {
        await this.recordOperationalFailure(
          workspaceId,
          userId,
          requestId,
          'export',
          startedAt,
          error,
          {
            pageId: input.pageId,
            format: input.format,
          },
        );
      }
      throw error;
    }
  }

  public async bulkOperate(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: BulkDocumentInput,
    requestId?: string | null,
  ): Promise<DocumentBulkOperationSummary> {
    const startedAt = Date.now();
    try {
      await this.requireDocumentFlag(workspaceId, userId, 'documents.bulk_operations');
      await this.requireWorkspaceMembership(workspaceId, userId);
      const results: DocumentBulkOperationSummary['results'] = [];
      for (const pageId of input.pageIds) {
        try {
          await this.applyBulkAction(input.action, toObjectId(pageId), userId, input);
          results.push({ pageId, status: 'succeeded', message: 'Applied' });
        } catch (error) {
          results.push({
            pageId,
            status: 'failed',
            message: error instanceof Error ? error.message : 'Bulk operation failed',
          });
        }
      }
      const summary = {
        action: input.action,
        total: input.pageIds.length,
        succeeded: results.filter((result) => result.status === 'succeeded').length,
        failed: results.filter((result) => result.status === 'failed').length,
        results,
      };
      await Promise.all([
        this.record(workspaceId, userId, 'document.bulk.updated', summary),
        auditLogService.record({
          actorId: userId,
          workspaceId,
          targetType: 'document_bulk_operation',
          action: `document.bulk.${input.action}`,
          requestId: requestId ?? null,
          metadata: summary,
        }),
        this.recordOperationalMetric({
          workspaceId,
          userId,
          requestId: requestId ?? null,
          operation: 'bulk',
          status: summary.failed > 0 ? 'failed' : 'succeeded',
          durationMs: Date.now() - startedAt,
          metadata: {
            action: input.action,
            total: summary.total,
            succeeded: summary.succeeded,
            failed: summary.failed,
          },
        }),
      ]);
      return summary;
    } catch (error) {
      await this.recordOperationalFailure(
        workspaceId,
        userId,
        requestId,
        'bulk',
        startedAt,
        error,
        {
          action: input.action,
          total: input.pageIds.length,
        },
      );
      throw error;
    }
  }

  public async uploadMedia(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    file: Express.Multer.File | undefined,
    pageId?: string | null,
    requestId?: string | null,
  ): Promise<DocumentMediaAssetSummary> {
    const startedAt = Date.now();
    try {
      if (!file) throw new BadRequestError('Media file is required');
      await this.requireDocumentFlag(workspaceId, userId, 'documents.media');
      await this.requireWorkspaceMembership(workspaceId, userId);
      await entitlementService.requireWithinLimit(workspaceId, 'storageBytes', file.size);
      if (pageId) await documentService.getPage(toObjectId(pageId), userId);
      const upload = await this.storage.uploadBuffer(
        file,
        `zenith/documents/${workspaceId.toString()}`,
      );
      const asset = await this.operations.createMediaAsset({
        workspaceId,
        pageId: pageId ? toObjectId(pageId) : null,
        uploadedBy: userId,
        fileName: file.originalname,
        originalName: file.originalname,
        fileType: file.mimetype || 'application/octet-stream',
        fileSize: file.size,
        cloudinaryPublicId: upload.publicId,
        url: upload.secureUrl,
        usageCount: pageId ? 1 : 0,
        metadata: {},
      });
      await Promise.all([
        this.record(workspaceId, userId, 'document.media.uploaded', {
          mediaId: asset.id,
          pageId: pageId ?? null,
          fileName: asset.originalName,
          fileSize: asset.fileSize,
        }),
        this.recordOperationalMetric({
          workspaceId,
          userId,
          requestId: requestId ?? null,
          operation: 'media_upload',
          status: 'succeeded',
          durationMs: Date.now() - startedAt,
          metadata: { pageId: pageId ?? null, fileType: asset.fileType, fileSize: asset.fileSize },
        }),
      ]);
      return this.toMedia(asset);
    } catch (error) {
      await this.recordOperationalFailure(
        workspaceId,
        userId,
        requestId,
        'media_upload',
        startedAt,
        error,
        {
          pageId: pageId ?? null,
          fileSize: file?.size ?? null,
          fileType: file?.mimetype ?? null,
        },
      );
      throw error;
    }
  }

  public async listMedia(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: ListMediaInput,
  ): Promise<{
    items: DocumentMediaAssetSummary[];
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  }> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    const query: {
      workspaceId: Types.ObjectId;
      search?: string;
      archived?: boolean;
      page?: number;
      limit?: number;
    } = {
      workspaceId,
      page: input.page,
      limit: input.limit,
    };
    if (input.search !== undefined) query.search = input.search;
    if (input.archived !== undefined) query.archived = input.archived;
    const result = await this.operations.listMediaAssets(query);
    return {
      items: result.items.map((asset) => this.toMedia(asset)),
      page: input.page,
      limit: input.limit,
      total: result.total,
      hasMore: input.page * input.limit < result.total,
    };
  }

  public async updateMedia(
    mediaId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateMediaInput,
    requestId?: string | null,
  ): Promise<DocumentMediaAssetSummary> {
    const startedAt = Date.now();
    const asset = await this.operations.findMediaAsset(mediaId);
    if (!asset) throw new NotFoundError('Media asset not found');
    try {
      await this.requireWorkspaceRole(asset.workspaceId, userId, writeRoles);
      const updated = await this.operations.updateMediaAsset(mediaId, {
        ...(input.fileName !== undefined ? { fileName: input.fileName } : {}),
        ...(input.metadata !== undefined
          ? { metadata: this.sanitizePayload(input.metadata, 'metadata') }
          : {}),
      });
      if (!updated) throw new NotFoundError('Media asset not found');
      await Promise.all([
        this.record(asset.workspaceId, userId, 'document.media.updated', { mediaId: asset.id }),
        this.recordOperationalMetric({
          workspaceId: asset.workspaceId,
          userId,
          requestId: requestId ?? null,
          operation: 'media_update',
          status: 'succeeded',
          durationMs: Date.now() - startedAt,
          metadata: { mediaId: asset.id },
        }),
      ]);
      return this.toMedia(updated);
    } catch (error) {
      await this.recordOperationalFailure(
        asset.workspaceId,
        userId,
        requestId,
        'media_update',
        startedAt,
        error,
        {
          mediaId: asset.id,
        },
      );
      throw error;
    }
  }

  public async deleteMedia(
    mediaId: Types.ObjectId,
    userId: Types.ObjectId,
    requestId?: string | null,
  ): Promise<void> {
    const startedAt = Date.now();
    const asset = await this.operations.findMediaAsset(mediaId);
    if (!asset) throw new NotFoundError('Media asset not found');
    try {
      await this.requireWorkspaceRole(asset.workspaceId, userId, writeRoles);
      if (asset.usageCount > 0) {
        throw new ConflictError('Media is still referenced by documents');
      }
      await this.storage.deleteAsset(asset.cloudinaryPublicId);
      await this.operations.updateMediaAsset(mediaId, { archived: true, archivedAt: new Date() });
      await Promise.all([
        auditLogService.record({
          actorId: userId,
          workspaceId: asset.workspaceId,
          targetType: 'document_media',
          targetId: asset.id,
          action: 'document.media.deleted',
          requestId: requestId ?? null,
          metadata: { fileName: asset.originalName },
        }),
        this.recordOperationalMetric({
          workspaceId: asset.workspaceId,
          userId,
          requestId: requestId ?? null,
          operation: 'media_delete',
          status: 'succeeded',
          durationMs: Date.now() - startedAt,
          metadata: { mediaId: asset.id },
        }),
      ]);
    } catch (error) {
      await this.recordOperationalFailure(
        asset.workspaceId,
        userId,
        requestId,
        'media_delete',
        startedAt,
        error,
        {
          mediaId: asset.id,
        },
      );
      throw error;
    }
  }

  public async getRetentionPolicy(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentRetentionPolicySummary> {
    await this.requireWorkspaceRole(workspaceId, userId, writeRoles);
    return this.toRetention(await this.operations.ensureRetentionPolicy(workspaceId));
  }

  public async updateRetentionPolicy(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateRetentionPolicyInput,
    requestId?: string | null,
  ): Promise<DocumentRetentionPolicySummary> {
    const startedAt = Date.now();
    try {
      await this.requireWorkspaceRole(workspaceId, userId, writeRoles);
      const update: Record<string, unknown> = { updatedBy: userId };
      if (input.draftRetentionDays !== undefined)
        update.draftRetentionDays = input.draftRetentionDays;
      if (input.archiveRetentionDays !== undefined)
        update.archiveRetentionDays = input.archiveRetentionDays;
      if (input.deletedRetentionDays !== undefined)
        update.deletedRetentionDays = input.deletedRetentionDays;
      if (input.temporaryExportRetentionHours !== undefined) {
        update.temporaryExportRetentionHours = input.temporaryExportRetentionHours;
      }
      if (input.temporaryImportRetentionHours !== undefined) {
        update.temporaryImportRetentionHours = input.temporaryImportRetentionHours;
      }
      const updated = await this.operations.updateRetentionPolicy(workspaceId, update);
      if (!updated) throw new NotFoundError('Retention policy not found');
      await Promise.all([
        auditLogService.record({
          actorId: userId,
          workspaceId,
          targetType: 'document_retention_policy',
          targetId: workspaceId.toString(),
          action: 'document.retention_policy.updated',
          requestId: requestId ?? null,
          metadata: input,
        }),
        this.recordOperationalMetric({
          workspaceId,
          userId,
          requestId,
          operation: 'retention_update',
          status: 'succeeded',
          durationMs: Date.now() - startedAt,
          metadata: { fields: Object.keys(input) },
        }),
      ]);
      return this.toRetention(updated);
    } catch (error) {
      await this.recordOperationalFailure(
        workspaceId,
        userId,
        requestId,
        'retention_update',
        startedAt,
        error,
        {
          fields: Object.keys(input),
        },
      );
      throw error;
    }
  }

  public async cleanupExpiredExports(
    requestId?: string | null,
  ): Promise<{ expiredExports: number }> {
    const startedAt = Date.now();
    const expiredExports = await this.operations.expireExports(new Date());
    if (expiredExports > 0) {
      await backgroundJobService.enqueue({
        type: 'document.cleanup.exports',
        payload: { expiredExports },
        maxAttempts: 1,
      });
    }
    await this.recordOperationalMetric({
      workspaceId: null,
      userId: null,
      requestId,
      operation: 'cleanup',
      status: 'succeeded',
      durationMs: Date.now() - startedAt,
      metadata: { expiredExports },
    });
    return { expiredExports };
  }

  private async applySyncOperation(
    operation: DocumentSyncOperationDocument,
    userId: Types.ObjectId,
  ): Promise<DocumentSyncOperationSummary> {
    try {
      if (operation.pageId && operation.baseUpdatedAt) {
        const page = await DocumentPageModel.findById(operation.pageId).exec();
        if (!page) throw new NotFoundError('Page not found');
        if (page.updatedAt.getTime() > operation.baseUpdatedAt.getTime()) {
          const conflict = await this.operations.updateSyncOperation(operation._id, {
            status: 'conflict',
            attempts: operation.attempts + 1,
            error: 'Remote document changed after the offline edit began',
            result: { remoteUpdatedAt: page.updatedAt.toISOString() },
          });
          return this.toSyncOperation(conflict ?? operation);
        }
      }
      const result = await this.executeOperation(operation.type, operation, userId);
      const updated = await this.operations.updateSyncOperation(operation._id, {
        status: 'applied',
        attempts: operation.attempts + 1,
        result,
        error: null,
        appliedAt: new Date(),
      });
      return this.toSyncOperation(updated ?? operation);
    } catch (error) {
      const attempts = operation.attempts + 1;
      const permanent =
        error instanceof BadRequestError ||
        error instanceof ForbiddenError ||
        error instanceof NotFoundError;
      const updated = await this.operations.updateSyncOperation(operation._id, {
        status: permanent || attempts >= 5 ? 'failed' : 'queued',
        attempts,
        error: error instanceof Error ? error.message : 'Sync operation failed',
        nextRetryAt: permanent ? null : new Date(Date.now() + 2 ** attempts * 1000),
      });
      return this.toSyncOperation(updated ?? operation);
    }
  }

  private async executeOperation(
    type: DocumentSyncOperationType,
    operation: DocumentSyncOperationDocument,
    userId: Types.ObjectId,
  ): Promise<Record<string, unknown>> {
    const payload = operation.payload as Record<string, unknown>;
    if (type === 'create_page') {
      const spaceId = this.requireString(payload.spaceId, 'spaceId');
      const title = this.requireString(payload.title, 'title');
      const page = await documentService.createPage(toObjectId(spaceId), userId, {
        title,
        folderId: this.optionalString(payload.folderId),
        parentPageId: this.optionalString(payload.parentPageId),
        status: 'draft',
        permissions: [],
        blocks: this.payloadBlocks(payload.blocks),
        properties: {},
        tagIds: [],
      });
      return { pageId: page.id };
    }
    if (!operation.pageId) throw new BadRequestError('pageId is required');
    if (type === 'update_page') {
      const title = this.optionalString(payload.title);
      const page = await documentService.updatePage(operation.pageId, userId, {
        ...(title ? { title } : {}),
        ...(this.optionalString(payload.summary)
          ? { summary: this.optionalString(payload.summary) }
          : {}),
      });
      return { pageId: page.id };
    }
    if (type === 'save_blocks') {
      const blocks = await documentService.saveBlocks(operation.pageId, userId, {
        blocks: this.payloadBlocks(payload.blocks),
      });
      return { pageId: operation.pageId.toString(), blockCount: blocks.length };
    }
    if (type === 'archive_page') {
      const page = await documentService.archivePage(operation.pageId, userId);
      return { pageId: page.id };
    }
    if (type === 'restore_page') {
      const page = await documentService.restorePage(operation.pageId, userId);
      return { pageId: page.id };
    }
    if (type === 'delete_page') {
      await documentService.deletePage(operation.pageId, userId);
      return { pageId: operation.pageId.toString() };
    }
    if (type === 'comment') {
      const comment = await documentService.createComment(operation.pageId, userId, {
        content: this.requireString(payload.content, 'content'),
        blockId: this.optionalString(payload.blockId),
        parentCommentId: this.optionalString(payload.parentCommentId),
      });
      return { commentId: comment.id };
    }
    if (type === 'favorite') {
      const favorite = await documentService.favoriteTarget(userId, {
        workspaceId: operation.workspaceId.toString(),
        targetType: 'page',
        targetId: operation.pageId.toString(),
        sortOrder: 0,
      });
      return { favoriteId: favorite.id };
    }
    const watcher = await documentService.watchPage(operation.pageId, userId, {
      subscription: 'all_updates',
    });
    return { watcherId: watcher.id };
  }

  private async applyBulkAction(
    action: DocumentBulkAction,
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
    input: BulkDocumentInput,
  ): Promise<void> {
    if (action === 'archive') {
      await documentService.archivePage(pageId, userId);
      return;
    }
    if (action === 'restore') {
      await documentService.restorePage(pageId, userId);
      return;
    }
    if (action === 'delete') {
      await documentService.deletePage(pageId, userId);
      return;
    }
    if (action === 'publish') {
      await documentService.publishPage(pageId, userId, 'Bulk publish');
      return;
    }
    if (action === 'unpublish') {
      await documentService.updatePage(pageId, userId, { status: 'draft' });
      return;
    }
    if (action === 'move') {
      await documentService.updatePage(pageId, userId, {
        folderId: input.folderId ?? null,
        parentPageId: input.parentPageId ?? null,
      });
      return;
    }
    if (action === 'change_owner') {
      if (!input.ownerId) throw new BadRequestError('ownerId is required');
      await documentService.updatePage(pageId, userId, { ownerId: input.ownerId });
      return;
    }
    if (action === 'change_tags') {
      await documentService.updatePage(pageId, userId, { tagIds: input.tagIds ?? [] });
      return;
    }
    const page = await documentService.getPage(pageId, userId);
    await documentService.createPage(toObjectId(page.spaceId), userId, {
      title: `${page.title} Copy`,
      folderId: input.folderId ?? page.folderId,
      parentPageId: input.parentPageId ?? page.parentPageId,
      status: 'draft',
      icon: page.icon,
      coverImage: page.coverImage,
      summary: page.summary,
      properties: page.properties,
      tagIds: page.tagIds,
      permissions: page.permissions,
      blocks: page.blocks.map((block, index) => ({
        type: block.type,
        order: index,
        content: block.content,
        metadata: block.metadata,
      })),
    });
  }

  private parseBlocks(
    format: DocumentImportFormat,
    content: string,
  ): {
    type: DocumentBlockSummary['type'];
    order: number;
    content: Record<string, unknown>;
    metadata: Record<string, unknown>;
  }[] {
    const source = format === 'html' ? this.htmlToText(content) : content;
    const lines = source.split(/\r?\n/);
    const blocks = lines
      .map((rawLine, index) => this.lineToBlock(rawLine, index))
      .filter((block): block is NonNullable<typeof block> => block !== null);
    return blocks.length > 0
      ? blocks
      : [{ type: 'paragraph', order: 0, content: { text: source.trim() }, metadata: {} }];
  }

  private lineToBlock(
    rawLine: string,
    order: number,
  ): {
    type: DocumentBlockSummary['type'];
    order: number;
    content: Record<string, unknown>;
    metadata: Record<string, unknown>;
  } | null {
    const line = rawLine.trim();
    if (!line) return null;
    if (line.startsWith('#### '))
      return { type: 'heading_4', order, content: { text: line.slice(5) }, metadata: {} };
    if (line.startsWith('### '))
      return { type: 'heading_3', order, content: { text: line.slice(4) }, metadata: {} };
    if (line.startsWith('## '))
      return { type: 'heading_2', order, content: { text: line.slice(3) }, metadata: {} };
    if (line.startsWith('# '))
      return { type: 'heading_1', order, content: { text: line.slice(2) }, metadata: {} };
    if (/^[-*]\s+\[[ xX]\]\s+/.test(line)) {
      return {
        type: 'checklist',
        order,
        content: { text: line.replace(/^[-*]\s+\[[ xX]\]\s+/, ''), checked: /\[[xX]\]/.test(line) },
        metadata: {},
      };
    }
    if (/^[-*]\s+/.test(line))
      return {
        type: 'bullet_list',
        order,
        content: { text: line.replace(/^[-*]\s+/, '') },
        metadata: {},
      };
    if (/^\d+\.\s+/.test(line))
      return {
        type: 'numbered_list',
        order,
        content: { text: line.replace(/^\d+\.\s+/, '') },
        metadata: {},
      };
    if (line.startsWith('> '))
      return { type: 'quote', order, content: { text: line.slice(2) }, metadata: {} };
    return { type: 'paragraph', order, content: { text: line }, metadata: {} };
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<h1[^>]*>/gi, '# ')
      .replace(/<h2[^>]*>/gi, '## ')
      .replace(/<h3[^>]*>/gi, '### ')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h1|h2|h3|li|blockquote)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  private async renderExport(
    page: DocumentPageDetailSummary,
    format: DocumentExportFormat,
  ): Promise<Buffer> {
    if (format === 'json') return Buffer.from(JSON.stringify(page, null, 2));
    const markdown = this.toMarkdown(page);
    if (format === 'markdown') return Buffer.from(markdown);
    if (format === 'text') return Buffer.from(this.blocksToPlainText(page.blocks));
    if (format === 'html') return Buffer.from(this.toHtml(page));
    return this.toPdf(page);
  }

  private toMarkdown(page: DocumentPageDetailSummary): string {
    return [
      `# ${page.title}`,
      page.summary ?? '',
      ...page.blocks.map((block) => this.blockToMarkdown(block)),
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private blockToMarkdown(block: DocumentBlockSummary): string {
    const text = typeof block.content.text === 'string' ? block.content.text : '';
    if (block.type === 'heading_1') return `# ${text}`;
    if (block.type === 'heading_2') return `## ${text}`;
    if (block.type === 'heading_3') return `### ${text}`;
    if (block.type === 'heading_4') return `#### ${text}`;
    if (block.type === 'bullet_list') return `- ${text}`;
    if (block.type === 'numbered_list') return `1. ${text}`;
    if (block.type === 'checklist')
      return `- [${block.content.checked === true ? 'x' : ' '}] ${text}`;
    if (block.type === 'quote') return `> ${text}`;
    if (block.type === 'divider') return '---';
    if (block.type === 'code')
      return `\`\`\`${typeof block.metadata.language === 'string' ? block.metadata.language : ''}\n${text}\n\`\`\``;
    return text;
  }

  private toHtml(page: DocumentPageDetailSummary): string {
    const body = page.blocks
      .map((block) => `<p>${this.escape(this.blockToMarkdown(block))}</p>`)
      .join('\n');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${this.escape(page.title)}</title></head><body><main><h1>${this.escape(page.title)}</h1>${body}</main></body></html>`;
  }

  private async toPdf(page: DocumentPageDetailSummary): Promise<Buffer> {
    const document = new PDFDocument({ margin: 48 });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve) => {
      document.on('end', () => resolve(Buffer.concat(chunks)));
    });
    document.fontSize(20).text(page.title);
    document.moveDown();
    page.blocks.forEach((block) => {
      const text = this.blockToMarkdown(block);
      if (text) document.fontSize(block.type.startsWith('heading') ? 16 : 11).text(text);
      document.moveDown(0.4);
    });
    document.end();
    return finished;
  }

  private blocksToPlainText(blocks: DocumentBlockSummary[]): string {
    return blocks
      .map((block) => (typeof block.content.text === 'string' ? block.content.text : ''))
      .join('\n');
  }

  private payloadBlocks(value: unknown): {
    type: DocumentBlockSummary['type'];
    order: number;
    content: Record<string, unknown>;
    metadata: Record<string, unknown>;
  }[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item, index) => ({
        type:
          typeof item.type === 'string' ? (item.type as DocumentBlockSummary['type']) : 'paragraph',
        order: typeof item.order === 'number' ? item.order : index,
        content: this.sanitizePayload(this.recordValue(item.content), `blocks.${index}.content`),
        metadata: this.sanitizePayload(this.recordValue(item.metadata), `blocks.${index}.metadata`),
      }));
  }

  private requireString(value: unknown, field: string): string {
    if (typeof value !== 'string' || !value.trim())
      throw new BadRequestError(`${field} is required`);
    return value;
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private recordValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private sanitizePayload(value: Record<string, unknown>, path: string): Record<string, unknown> {
    return this.sanitizeUnknown(value, path, 0) as Record<string, unknown>;
  }

  private sanitizeUnknown(value: unknown, path: string, depth: number): unknown {
    if (depth > 8) throw new BadRequestError(`${path} is too deeply nested`);
    if (typeof value === 'string') {
      if (unsafeTextPattern.test(value))
        throw new BadRequestError(`${path} contains unsafe content`);
      return value;
    }
    if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
      if (value.length > 1000) throw new BadRequestError(`${path} contains too many items`);
      return value.map((item, index) => this.sanitizeUnknown(item, `${path}.${index}`, depth + 1));
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length > 200) throw new BadRequestError(`${path} contains too many fields`);
      return Object.fromEntries(
        entries.map(([key, entry]) => {
          if (unsafeObjectKeyPattern.test(key))
            throw new BadRequestError(`${path}.${key} is not allowed`);
          return [key, this.sanitizeUnknown(entry, `${path}.${key}`, depth + 1)];
        }),
      );
    }
    return null;
  }

  private fileSafe(value: string): string {
    return (
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'document'
    );
  }

  private escape(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private async requireWorkspaceMembership(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    const membership = await this.workspaces.findMembership(workspaceId, userId);
    if (!membership || membership.status !== 'active')
      throw new ForbiddenError('Workspace access denied');
  }

  private async requireWorkspaceRole(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    roles: Set<WorkspaceRole>,
  ): Promise<void> {
    const membership = await this.workspaces.findMembership(workspaceId, userId);
    if (!membership || membership.status !== 'active' || !roles.has(membership.role)) {
      throw new ForbiddenError('Workspace access denied');
    }
  }

  private async requireDocumentFlag(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    key: string,
  ): Promise<void> {
    const enabled = await featureFlagService.isEnabled({ key, workspaceId, userId }, true);
    if (!enabled) throw new ForbiddenError('Document operation is currently disabled');
  }

  private async record(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    event: ActivityEventName,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.activity.record({
      workspaceId,
      actorId: userId,
      event,
      metadata,
    });
  }

  private async recordOperationalMetric(input: {
    workspaceId?: Types.ObjectId | null;
    userId?: Types.ObjectId | null;
    requestId?: string | null | undefined;
    operation: DocumentOperationMetricName;
    status: 'succeeded' | 'failed';
    durationMs: number;
    errorCategory?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.operations.createOperationalMetric({
        workspaceId: input.workspaceId ?? null,
        userId: input.userId ?? null,
        requestId: input.requestId ?? null,
        operation: input.operation,
        status: input.status,
        durationMs: input.durationMs,
        errorCategory: input.errorCategory ?? null,
        metadata: input.metadata ?? {},
      });
      logger.info('Document operation measured', {
        workspaceId: input.workspaceId?.toString() ?? null,
        userId: input.userId?.toString() ?? null,
        requestId: input.requestId ?? null,
        operation: input.operation,
        status: input.status,
        durationMs: input.durationMs,
      });
    } catch (error) {
      logger.warn('Document operation metric failed', {
        workspaceId: input.workspaceId?.toString() ?? null,
        requestId: input.requestId ?? null,
        operation: input.operation,
        error: error instanceof Error ? error.message : 'Unknown metric error',
      });
    }
  }

  private async recordOperationalFailure(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    requestId: string | null | undefined,
    operation: DocumentOperationMetricName,
    startedAt: number,
    error: unknown,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.recordOperationalMetric({
      workspaceId,
      userId,
      requestId: requestId ?? null,
      operation,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      errorCategory: error instanceof Error ? error.constructor.name : 'UnknownError',
      metadata,
    });
  }

  private toSyncOperation(operation: DocumentSyncOperationDocument): DocumentSyncOperationSummary {
    return {
      id: operation.id,
      workspaceId: operation.workspaceId.toString(),
      pageId: operation.pageId?.toString() ?? null,
      clientOperationId: operation.clientOperationId,
      type: operation.type,
      status: operation.status as DocumentSyncOperationStatus,
      attempts: operation.attempts,
      error: operation.error ?? null,
      result: this.recordValue(operation.result),
      baseUpdatedAt: operation.baseUpdatedAt?.toISOString() ?? null,
      nextRetryAt: operation.nextRetryAt?.toISOString() ?? null,
      appliedAt: operation.appliedAt?.toISOString() ?? null,
      createdAt: operation.createdAt.toISOString(),
      updatedAt: operation.updatedAt.toISOString(),
    };
  }

  private toMedia(asset: DocumentMediaAssetDocument): DocumentMediaAssetSummary {
    return {
      id: asset.id,
      workspaceId: asset.workspaceId.toString(),
      pageId: asset.pageId?.toString() ?? null,
      uploadedBy: asset.uploadedBy.toString(),
      fileName: asset.fileName,
      originalName: asset.originalName,
      fileType: asset.fileType,
      fileSize: asset.fileSize,
      url: asset.url,
      usageCount: asset.usageCount,
      archived: asset.archived,
      metadata: this.recordValue(asset.metadata),
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }

  private toRetention(policy: DocumentRetentionPolicyDocument): DocumentRetentionPolicySummary {
    return {
      workspaceId: policy.workspaceId.toString(),
      draftRetentionDays: policy.draftRetentionDays,
      archiveRetentionDays: policy.archiveRetentionDays,
      deletedRetentionDays: policy.deletedRetentionDays,
      temporaryExportRetentionHours: policy.temporaryExportRetentionHours,
      temporaryImportRetentionHours: policy.temporaryImportRetentionHours,
      updatedBy: policy.updatedBy?.toString() ?? null,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }
}

export const documentOperationsService = new DocumentOperationsService();
