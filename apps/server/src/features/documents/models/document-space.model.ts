import type { Document, Model, Types } from 'mongoose';
import mongoose, { Schema, model } from 'mongoose';
import { documentPermissionSchema, type DocumentPermission } from './document-folder.model.js';

export interface DocumentSpaceDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  banner: string | null;
  homepagePageId: Types.ObjectId | null;
  defaultTemplateId: Types.ObjectId | null;
  defaultPermissions: DocumentPermission[];
  archived: boolean;
  visibility: 'workspace' | 'private';
  ownerId: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const documentSpaceSchema = new Schema<DocumentSpaceDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: null, maxlength: 500 },
    icon: { type: String, default: null, maxlength: 32 },
    color: { type: String, default: null, maxlength: 32 },
    banner: { type: String, default: null, maxlength: 1000 },
    homepagePageId: { type: Schema.Types.ObjectId, ref: 'DocumentPage', default: null },
    defaultTemplateId: { type: Schema.Types.ObjectId, ref: 'DocumentPageTemplate', default: null },
    defaultPermissions: { type: [documentPermissionSchema], default: [] },
    archived: { type: Boolean, default: false, index: true },
    visibility: { type: String, enum: ['workspace', 'private'], default: 'workspace' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

documentSpaceSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });

export const DocumentSpaceModel =
  (mongoose.models.DocumentSpace as Model<DocumentSpaceDocument> | undefined) ??
  model<DocumentSpaceDocument>('DocumentSpace', documentSpaceSchema);
