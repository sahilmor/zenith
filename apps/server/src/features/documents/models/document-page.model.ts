import type { Document, Model, Types } from 'mongoose';
import mongoose, { Schema, model } from 'mongoose';
import { documentPermissionSchema, type DocumentPermission } from './document-folder.model.js';

export interface DocumentPageDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  spaceId: Types.ObjectId;
  folderId: Types.ObjectId | null;
  parentPageId: Types.ObjectId | null;
  title: string;
  slug: string;
  slugHistory: string[];
  status: 'draft' | 'published' | 'archived' | 'deleted' | 'readonly' | 'template';
  icon: string | null;
  coverImage: string | null;
  summary: string | null;
  properties: Record<string, unknown>;
  tagIds: Types.ObjectId[];
  currentVersion: number;
  publishedVersion: number | null;
  archived: boolean;
  deletedAt: Date | null;
  ownerId: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId | null;
  permissions: DocumentPermission[];
  createdAt: Date;
  updatedAt: Date;
}

const documentPageSchema = new Schema<DocumentPageDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    spaceId: { type: Schema.Types.ObjectId, ref: 'DocumentSpace', required: true, index: true },
    folderId: { type: Schema.Types.ObjectId, ref: 'DocumentFolder', default: null, index: true },
    parentPageId: { type: Schema.Types.ObjectId, ref: 'DocumentPage', default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    slugHistory: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived', 'deleted', 'readonly', 'template'],
      default: 'draft',
      index: true,
    },
    icon: { type: String, default: null, maxlength: 32 },
    coverImage: { type: String, default: null, maxlength: 1000 },
    summary: { type: String, default: null, maxlength: 1000 },
    properties: { type: Schema.Types.Mixed, default: {} },
    tagIds: { type: [Schema.Types.ObjectId], ref: 'DocumentPageTag', default: [] },
    currentVersion: { type: Number, default: 0 },
    publishedVersion: { type: Number, default: null },
    archived: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    permissions: { type: [documentPermissionSchema], default: [] },
  },
  { timestamps: true },
);

documentPageSchema.index({ spaceId: 1, folderId: 1, parentPageId: 1, slug: 1 }, { unique: true });
documentPageSchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });

export const DocumentPageModel =
  (mongoose.models.DocumentPage as Model<DocumentPageDocument> | undefined) ??
  model<DocumentPageDocument>('DocumentPage', documentPageSchema);
