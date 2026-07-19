import type { Document, Model, Types } from 'mongoose';
import mongoose, { Schema, model } from 'mongoose';

export interface DocumentBlockDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  stableId: string;
  pageId: Types.ObjectId;
  parentBlockId: Types.ObjectId | null;
  type:
    | 'paragraph'
    | 'heading_1'
    | 'heading_2'
    | 'heading_3'
    | 'heading_4'
    | 'bullet_list'
    | 'numbered_list'
    | 'checklist'
    | 'quote'
    | 'divider'
    | 'callout'
    | 'code'
    | 'image'
    | 'pdf'
    | 'table'
    | 'toggle'
    | 'emoji'
    | 'mention'
    | 'task_embed'
    | 'project_embed';
  order: number;
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const documentBlockSchema = new Schema<DocumentBlockDocument>(
  {
    stableId: { type: String, required: true },
    pageId: { type: Schema.Types.ObjectId, ref: 'DocumentPage', required: true, index: true },
    parentBlockId: { type: Schema.Types.ObjectId, ref: 'DocumentBlock', default: null },
    type: {
      type: String,
      enum: [
        'paragraph',
        'heading_1',
        'heading_2',
        'heading_3',
        'heading_4',
        'bullet_list',
        'numbered_list',
        'checklist',
        'quote',
        'divider',
        'callout',
        'code',
        'image',
        'pdf',
        'table',
        'toggle',
        'emoji',
        'mention',
        'task_embed',
        'project_embed',
      ],
      required: true,
    },
    order: { type: Number, required: true },
    content: { type: Schema.Types.Mixed, default: {} },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

documentBlockSchema.index({ pageId: 1, stableId: 1 }, { unique: true });
documentBlockSchema.index({ pageId: 1, parentBlockId: 1, order: 1 });

export const DocumentBlockModel =
  (mongoose.models.DocumentBlock as Model<DocumentBlockDocument> | undefined) ??
  model<DocumentBlockDocument>('DocumentBlock', documentBlockSchema);
