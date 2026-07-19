import mongoose, {
  Schema,
  model,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const documentSyncOperationSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    pageId: { type: Schema.Types.ObjectId, ref: 'DocumentPage', default: null, index: true },
    clientOperationId: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'create_page',
        'update_page',
        'save_blocks',
        'archive_page',
        'restore_page',
        'delete_page',
        'comment',
        'favorite',
        'watch',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'applied', 'conflict', 'failed', 'canceled'],
      default: 'queued',
      index: true,
    },
    baseUpdatedAt: { type: Date, default: null },
    payload: { type: Schema.Types.Mixed, default: {} },
    result: { type: Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    attempts: { type: Number, default: 0, min: 0 },
    nextRetryAt: { type: Date, default: null, index: true },
    appliedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

documentSyncOperationSchema.index(
  { workspaceId: 1, userId: 1, clientOperationId: 1 },
  { unique: true },
);

const documentMediaAssetSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    pageId: { type: Schema.Types.ObjectId, ref: 'DocumentPage', default: null, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    fileType: { type: String, required: true, trim: true, maxlength: 180 },
    fileSize: { type: Number, required: true, min: 0 },
    cloudinaryPublicId: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    usageCount: { type: Number, default: 0, min: 0 },
    archived: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

documentMediaAssetSchema.index({ workspaceId: 1, archived: 1, createdAt: -1 });
documentMediaAssetSchema.index({ workspaceId: 1, originalName: 'text' });

const documentRetentionPolicySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, unique: true },
    draftRetentionDays: { type: Number, default: 180, min: 1 },
    archiveRetentionDays: { type: Number, default: 365, min: 1 },
    deletedRetentionDays: { type: Number, default: 90, min: 1 },
    temporaryExportRetentionHours: { type: Number, default: 24, min: 1 },
    temporaryImportRetentionHours: { type: Number, default: 24, min: 1 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

const documentExportSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    pageId: { type: Schema.Types.ObjectId, ref: 'DocumentPage', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    format: {
      type: String,
      enum: ['markdown', 'html', 'pdf', 'text', 'json'],
      required: true,
      index: true,
    },
    status: { type: String, enum: ['ready', 'expired'], default: 'ready', index: true },
    fileName: { type: String, required: true, trim: true },
    expiresAt: { type: Date, required: true, index: true },
    size: { type: Number, default: 0, min: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

const documentOperationalMetricSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    requestId: { type: String, default: null, index: true },
    operation: {
      type: String,
      enum: [
        'sync',
        'import',
        'export',
        'bulk',
        'media_upload',
        'media_update',
        'media_delete',
        'retention_update',
        'cleanup',
      ],
      required: true,
      index: true,
    },
    status: { type: String, enum: ['succeeded', 'failed'], required: true, index: true },
    durationMs: { type: Number, default: 0, min: 0 },
    errorCategory: { type: String, default: null, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

documentOperationalMetricSchema.index({ workspaceId: 1, operation: 1, createdAt: -1 });
documentOperationalMetricSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });

export type DocumentSyncOperation = InferSchemaType<typeof documentSyncOperationSchema>;
export type DocumentMediaAsset = InferSchemaType<typeof documentMediaAssetSchema>;
export type DocumentRetentionPolicy = InferSchemaType<typeof documentRetentionPolicySchema>;
export type DocumentExport = InferSchemaType<typeof documentExportSchema>;
export type DocumentOperationalMetric = InferSchemaType<typeof documentOperationalMetricSchema>;

export type DocumentSyncOperationDocument = HydratedDocument<DocumentSyncOperation>;
export type DocumentMediaAssetDocument = HydratedDocument<DocumentMediaAsset>;
export type DocumentRetentionPolicyDocument = HydratedDocument<DocumentRetentionPolicy>;
export type DocumentExportDocument = HydratedDocument<DocumentExport>;
export type DocumentOperationalMetricDocument = HydratedDocument<DocumentOperationalMetric>;

export const DocumentSyncOperationModel =
  (mongoose.models.DocumentSyncOperation as Model<DocumentSyncOperation> | undefined) ??
  model<DocumentSyncOperation>('DocumentSyncOperation', documentSyncOperationSchema);

export const DocumentMediaAssetModel =
  (mongoose.models.DocumentMediaAsset as Model<DocumentMediaAsset> | undefined) ??
  model<DocumentMediaAsset>('DocumentMediaAsset', documentMediaAssetSchema);

export const DocumentRetentionPolicyModel =
  (mongoose.models.DocumentRetentionPolicy as Model<DocumentRetentionPolicy> | undefined) ??
  model<DocumentRetentionPolicy>('DocumentRetentionPolicy', documentRetentionPolicySchema);

export const DocumentExportModel =
  (mongoose.models.DocumentExport as Model<DocumentExport> | undefined) ??
  model<DocumentExport>('DocumentExport', documentExportSchema);

export const DocumentOperationalMetricModel =
  (mongoose.models.DocumentOperationalMetric as Model<DocumentOperationalMetric> | undefined) ??
  model<DocumentOperationalMetric>('DocumentOperationalMetric', documentOperationalMetricSchema);
