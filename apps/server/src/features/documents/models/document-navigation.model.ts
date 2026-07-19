import type { Document, Model, Types } from 'mongoose';
import mongoose, { Schema, model } from 'mongoose';
import type {
  DocumentFavoriteTargetType,
  DocumentPinScope,
  DocumentRelationshipKind,
  DocumentRelationshipTargetType,
  DocumentSubscriptionLevel,
} from '@pm/types';

export interface DocumentFavoriteDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  targetType: DocumentFavoriteTargetType;
  targetId: Types.ObjectId;
  sortOrder: number;
  createdAt: Date;
}

const documentFavoriteSchema = new Schema<DocumentFavoriteDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: {
      type: String,
      enum: ['page', 'space', 'template'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

documentFavoriteSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
documentFavoriteSchema.index({ workspaceId: 1, userId: 1, sortOrder: 1 });

export interface DocumentRecentPageDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  pageId: Types.ObjectId;
  lastViewedAt: Date;
  lastPosition: Record<string, unknown> | null;
}

const documentRecentPageSchema = new Schema<DocumentRecentPageDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pageId: { type: Schema.Types.ObjectId, ref: 'DocumentPage', required: true, index: true },
    lastViewedAt: { type: Date, default: Date.now, index: true },
    lastPosition: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: false },
);

documentRecentPageSchema.index({ userId: 1, pageId: 1 }, { unique: true });
documentRecentPageSchema.index({ workspaceId: 1, userId: 1, lastViewedAt: -1 });

export interface DocumentPinDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  scope: DocumentPinScope;
  spaceId: Types.ObjectId | null;
  userId: Types.ObjectId | null;
  pageId: Types.ObjectId;
  sortOrder: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const documentPinSchema = new Schema<DocumentPinDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    scope: {
      type: String,
      enum: ['workspace', 'space', 'personal'],
      required: true,
      index: true,
    },
    spaceId: { type: Schema.Types.ObjectId, ref: 'DocumentSpace', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    pageId: { type: Schema.Types.ObjectId, ref: 'DocumentPage', required: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

documentPinSchema.index({ workspaceId: 1, scope: 1, spaceId: 1, userId: 1, sortOrder: 1 });
documentPinSchema.index(
  { workspaceId: 1, scope: 1, spaceId: 1, userId: 1, pageId: 1 },
  { unique: true },
);

export interface DocumentRelationshipDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  sourcePageId: Types.ObjectId;
  targetType: DocumentRelationshipTargetType;
  targetId: Types.ObjectId;
  targetPageId: Types.ObjectId | null;
  relationshipType: DocumentRelationshipKind;
  broken: boolean;
  metadata: Record<string, unknown>;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentRelationshipSchema = new Schema<DocumentRelationshipDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    sourcePageId: { type: Schema.Types.ObjectId, ref: 'DocumentPage', required: true, index: true },
    targetType: {
      type: String,
      enum: ['page', 'task', 'project', 'goal', 'incident', 'form', 'template', 'document', 'file'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    targetPageId: { type: Schema.Types.ObjectId, ref: 'DocumentPage', default: null, index: true },
    relationshipType: {
      type: String,
      enum: [
        'related_to',
        'depends_on',
        'parent_of',
        'child_of',
        'reference',
        'supersedes',
        'embed',
      ],
      required: true,
    },
    broken: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

documentRelationshipSchema.index(
  { sourcePageId: 1, targetType: 1, targetId: 1, relationshipType: 1 },
  { unique: true },
);
documentRelationshipSchema.index({ targetPageId: 1, createdAt: -1 });

export interface DocumentPageTagDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  archived: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const documentPageTagSchema = new Schema<DocumentPageTagDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    color: { type: String, required: true, maxlength: 32 },
    description: { type: String, default: null, maxlength: 300 },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

documentPageTagSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });

export interface DocumentPageTemplateDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  spaceId: Types.ObjectId | null;
  name: string;
  category: string;
  description: string | null;
  icon: string | null;
  blocks: unknown[];
  variables: string[];
  favoriteCount: number;
  useCount: number;
  archived: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const documentPageTemplateSchema = new Schema<DocumentPageTemplateDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    spaceId: { type: Schema.Types.ObjectId, ref: 'DocumentSpace', default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: null, maxlength: 500 },
    icon: { type: String, default: null, maxlength: 32 },
    blocks: { type: Array, default: [] },
    variables: { type: [String], default: [] },
    favoriteCount: { type: Number, default: 0 },
    useCount: { type: Number, default: 0 },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

documentPageTemplateSchema.index({ workspaceId: 1, category: 1, archived: 1 });

export interface DocumentWatcherDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  pageId: Types.ObjectId;
  userId: Types.ObjectId;
  subscription: DocumentSubscriptionLevel;
  createdAt: Date;
  updatedAt: Date;
}

const documentWatcherSchema = new Schema<DocumentWatcherDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    pageId: { type: Schema.Types.ObjectId, ref: 'DocumentPage', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscription: {
      type: String,
      enum: ['all_updates', 'major_updates', 'comments_only', 'mentions_only', 'mute'],
      default: 'all_updates',
    },
  },
  { timestamps: true },
);

documentWatcherSchema.index({ pageId: 1, userId: 1 }, { unique: true });

export const DocumentFavoriteModel =
  (mongoose.models.DocumentFavorite as Model<DocumentFavoriteDocument> | undefined) ??
  model<DocumentFavoriteDocument>('DocumentFavorite', documentFavoriteSchema);
export const DocumentRecentPageModel =
  (mongoose.models.DocumentRecentPage as Model<DocumentRecentPageDocument> | undefined) ??
  model<DocumentRecentPageDocument>('DocumentRecentPage', documentRecentPageSchema);
export const DocumentPinModel =
  (mongoose.models.DocumentPin as Model<DocumentPinDocument> | undefined) ??
  model<DocumentPinDocument>('DocumentPin', documentPinSchema);
export const DocumentRelationshipModel =
  (mongoose.models.DocumentRelationship as Model<DocumentRelationshipDocument> | undefined) ??
  model<DocumentRelationshipDocument>('DocumentRelationship', documentRelationshipSchema);
export const DocumentPageTagModel =
  (mongoose.models.DocumentPageTag as Model<DocumentPageTagDocument> | undefined) ??
  model<DocumentPageTagDocument>('DocumentPageTag', documentPageTagSchema);
export const DocumentPageTemplateModel =
  (mongoose.models.DocumentPageTemplate as Model<DocumentPageTemplateDocument> | undefined) ??
  model<DocumentPageTemplateDocument>('DocumentPageTemplate', documentPageTemplateSchema);
export const DocumentWatcherModel =
  (mongoose.models.DocumentWatcher as Model<DocumentWatcherDocument> | undefined) ??
  model<DocumentWatcherDocument>('DocumentWatcher', documentWatcherSchema);
