import type { Document, Model, Types } from 'mongoose';
import mongoose, { Schema, model } from 'mongoose';

export interface DocumentCommentDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  pageId: Types.ObjectId;
  blockId: Types.ObjectId | null;
  parentCommentId: Types.ObjectId | null;
  authorId: Types.ObjectId;
  content: string;
  mentionedUserIds: Types.ObjectId[];
  resolved: boolean;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const documentCommentSchema = new Schema<DocumentCommentDocument>(
  {
    pageId: { type: Schema.Types.ObjectId, ref: 'DocumentPage', required: true, index: true },
    blockId: { type: Schema.Types.ObjectId, ref: 'DocumentBlock', default: null, index: true },
    parentCommentId: { type: Schema.Types.ObjectId, ref: 'DocumentComment', default: null },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    mentionedUserIds: { type: [Schema.Types.ObjectId], default: [] },
    resolved: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

documentCommentSchema.index({ pageId: 1, parentCommentId: 1, createdAt: 1 });

export const DocumentCommentModel =
  (mongoose.models.DocumentComment as Model<DocumentCommentDocument> | undefined) ??
  model<DocumentCommentDocument>('DocumentComment', documentCommentSchema);
