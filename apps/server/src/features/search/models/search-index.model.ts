import type { SearchEntityType } from '@pm/types';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const searchIndexSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    entityType: {
      type: String,
      enum: [
        'project',
        'board',
        'task',
        'document_space',
        'document_folder',
        'document_page',
        'document_template',
        'user',
        'form',
        'goal',
        'initiative',
        'portfolio',
        'attachment',
      ] satisfies SearchEntityType[],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    description: { type: String, default: null, trim: true, maxlength: 2000 },
    keywords: { type: [String], default: [] },
    content: { type: String, default: '', maxlength: 20000 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    visibility: { type: String, default: 'workspace', index: true },
    archived: { type: Boolean, default: false, index: true },
    popularity: { type: Number, default: 0, min: 0 },
    updatedSourceAt: { type: Date, default: Date.now, index: true },
    permissionSnapshot: { type: Schema.Types.Mixed, default: {} },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

searchIndexSchema.index({ workspaceId: 1, entityType: 1, updatedSourceAt: -1 });
searchIndexSchema.index({ workspaceId: 1, title: 'text', description: 'text', content: 'text' });
searchIndexSchema.index({ workspaceId: 1, entityType: 1, entityId: 1 }, { unique: true });

export type SearchIndex = InferSchemaType<typeof searchIndexSchema>;
export type SearchIndexDocument = HydratedDocument<SearchIndex>;
export const SearchIndexModel = model<SearchIndex>('SearchIndex', searchIndexSchema);
