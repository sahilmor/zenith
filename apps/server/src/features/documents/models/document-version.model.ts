import type { Document, Model, Types } from 'mongoose';
import mongoose, { Schema, model } from 'mongoose';

export interface DocumentVersionDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  pageId: Types.ObjectId;
  version: number;
  editorId: Types.ObjectId;
  summary: string | null;
  blockSnapshot: unknown[];
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const documentVersionSchema = new Schema<DocumentVersionDocument>(
  {
    pageId: { type: Schema.Types.ObjectId, ref: 'DocumentPage', required: true, index: true },
    version: { type: Number, required: true },
    editorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    summary: { type: String, default: null, maxlength: 1000 },
    blockSnapshot: { type: [Schema.Types.Mixed], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

documentVersionSchema.index({ pageId: 1, version: 1 }, { unique: true });

export const DocumentVersionModel =
  (mongoose.models.DocumentVersion as Model<DocumentVersionDocument> | undefined) ??
  model<DocumentVersionDocument>('DocumentVersion', documentVersionSchema);
