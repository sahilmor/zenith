import type {
  DocumentBlockSummary,
  DocumentCommentSummary,
  DocumentFavoriteSummary,
  DocumentFolderSummary,
  DocumentPageOutlineItem,
  DocumentPageTagSummary,
  DocumentPageDetailSummary,
  DocumentPageStatus,
  DocumentPageSummary,
  DocumentPinSummary,
  DocumentRecentPageSummary,
  DocumentRelationshipSummary,
  DocumentSpaceSummary,
  DocumentTemplateSummary,
  DocumentTreeSummary,
  DocumentVersionSummary,
  DocumentWatcherSummary,
  DocumentBulkOperationSummary,
  DocumentConnectionState,
  DocumentExportFormat,
  DocumentImportFormat,
  DocumentImportSummary,
  DocumentMediaAssetSummary,
  DocumentRetentionPolicySummary,
  DocumentSyncOperationSummary,
  DocumentSyncOperationType,
  DocumentSyncSummary,
  KnowledgeHomeSummary,
} from '@pm/types';

export type DocumentSpace = DocumentSpaceSummary;
export type DocumentFolder = DocumentFolderSummary;
export type DocumentPage = DocumentPageSummary;
export type DocumentPageDetail = DocumentPageDetailSummary;
export type DocumentBlock = DocumentBlockSummary;
export type DocumentComment = DocumentCommentSummary;
export type DocumentTree = DocumentTreeSummary;
export type DocumentVersion = DocumentVersionSummary;
export type DocumentFavorite = DocumentFavoriteSummary;
export type DocumentRecentPage = DocumentRecentPageSummary;
export type DocumentPin = DocumentPinSummary;
export type DocumentRelationship = DocumentRelationshipSummary;
export type DocumentTemplate = DocumentTemplateSummary;
export type DocumentPageTag = DocumentPageTagSummary;
export type DocumentWatcher = DocumentWatcherSummary;
export type DocumentPageOutline = DocumentPageOutlineItem;
export type KnowledgeHome = KnowledgeHomeSummary;
export type DocumentSyncOperation = DocumentSyncOperationSummary;
export type DocumentSyncState = DocumentConnectionState;
export type DocumentSyncResult = DocumentSyncSummary;
export type DocumentImport = DocumentImportSummary;
export type DocumentMediaAsset = DocumentMediaAssetSummary;
export type DocumentRetentionPolicy = DocumentRetentionPolicySummary;
export type DocumentBulkOperation = DocumentBulkOperationSummary;
export type { DocumentExportFormat, DocumentImportFormat, DocumentSyncOperationType };

export interface CreateDocumentSpaceInput {
  readonly name: string;
  readonly description?: string | null;
  readonly icon?: string | null;
  readonly color?: string | null;
  readonly banner?: string | null;
  readonly homepagePageId?: string | null;
  readonly defaultTemplateId?: string | null;
  readonly visibility?: 'workspace' | 'private';
}

export interface CreateDocumentPageInput {
  readonly title: string;
  readonly folderId?: string | null;
  readonly parentPageId?: string | null;
  readonly status?: Extract<DocumentPageStatus, 'draft' | 'published' | 'readonly' | 'template'>;
  readonly properties?: Record<string, unknown>;
  readonly tagIds?: string[];
  readonly blocks?: {
    readonly stableId?: string;
    readonly type: DocumentBlock['type'];
    readonly order: number;
    readonly content: Record<string, unknown>;
    readonly metadata?: Record<string, unknown>;
  }[];
}

export interface SaveDocumentBlocksInput {
  readonly blocks: {
    readonly stableId?: string;
    readonly type: DocumentBlock['type'];
    readonly order: number;
    readonly content: Record<string, unknown>;
    readonly metadata?: Record<string, unknown>;
  }[];
}

export interface QueuedDocumentOperation {
  readonly clientOperationId: string;
  readonly workspaceId: string;
  readonly pageId?: string | null;
  readonly type: DocumentSyncOperationType;
  readonly baseUpdatedAt?: string | null;
  readonly payload: Record<string, unknown>;
  readonly queuedAt: string;
}

export interface CreateDocumentTemplateInput {
  readonly spaceId?: string | null;
  readonly name: string;
  readonly category?: string;
  readonly description?: string | null;
  readonly icon?: string | null;
  readonly blocks?: SaveDocumentBlocksInput['blocks'];
  readonly variables?: string[];
}
