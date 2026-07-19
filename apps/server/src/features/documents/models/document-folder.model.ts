import type { Document, Model, Types } from 'mongoose';
import mongoose, { Schema, model } from 'mongoose';

export interface DocumentPermission {
  userId: Types.ObjectId;
  role: 'owner' | 'editor' | 'commenter' | 'viewer' | 'none';
}

export interface DocumentFolderDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  spaceId: Types.ObjectId;
  parentFolderId: Types.ObjectId | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  order: number;
  archived: boolean;
  visibility: 'workspace' | 'private';
  permissions: DocumentPermission[];
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export const documentPermissionSchema = new Schema<DocumentPermission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['owner', 'editor', 'commenter', 'viewer', 'none'],
      required: true,
    },
  },
  { _id: false },
);

const documentFolderSchema = new Schema<DocumentFolderDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    spaceId: { type: Schema.Types.ObjectId, ref: 'DocumentSpace', required: true, index: true },
    parentFolderId: { type: Schema.Types.ObjectId, ref: 'DocumentFolder', default: null },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: null, maxlength: 500 },
    icon: { type: String, default: null, maxlength: 32 },
    order: { type: Number, default: 0 },
    archived: { type: Boolean, default: false, index: true },
    visibility: { type: String, enum: ['workspace', 'private'], default: 'workspace' },
    permissions: { type: [documentPermissionSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

documentFolderSchema.index({ spaceId: 1, parentFolderId: 1, order: 1 });
documentFolderSchema.index({ spaceId: 1, parentFolderId: 1, slug: 1 }, { unique: true });

export const DocumentFolderModel =
  (mongoose.models.DocumentFolder as Model<DocumentFolderDocument> | undefined) ??
  model<DocumentFolderDocument>('DocumentFolder', documentFolderSchema);
