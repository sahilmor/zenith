import type { SearchEntityType } from '@pm/types';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const savedSearchSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    query: { type: String, required: true, trim: true, maxlength: 200 },
    filters: { type: Schema.Types.Mixed, default: {} },
    pinned: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

savedSearchSchema.index({ workspaceId: 1, userId: 1, pinned: -1, updatedAt: -1 });

const recentSearchSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    query: { type: String, required: true, trim: true, maxlength: 200 },
    filters: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

recentSearchSchema.index({ workspaceId: 1, userId: 1, createdAt: -1 });

const searchAnalyticsSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    query: { type: String, required: true, trim: true, maxlength: 200 },
    normalizedQuery: { type: String, required: true, trim: true, maxlength: 200, index: true },
    resultCount: { type: Number, required: true, min: 0 },
    latencyMs: { type: Number, required: true, min: 0 },
    clickedEntityType: { type: String, default: null },
    clickedEntityId: { type: Schema.Types.ObjectId, default: null },
    clickPosition: { type: Number, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

searchAnalyticsSchema.index({ workspaceId: 1, normalizedQuery: 1, createdAt: -1 });

const knowledgeChunkSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    sourceEntityType: {
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
    sourceEntityId: { type: Schema.Types.ObjectId, required: true, index: true },
    sectionId: { type: String, default: null },
    heading: { type: String, default: null, trim: true, maxlength: 240 },
    content: { type: String, required: true, trim: true, maxlength: 4000 },
    version: { type: Number, default: 1, min: 1 },
    chunkOrder: { type: Number, required: true, min: 0 },
    chunkSize: { type: Number, required: true, min: 0 },
    embeddingProvider: { type: String, default: null },
    embeddingId: { type: String, default: null },
  },
  { timestamps: true },
);

knowledgeChunkSchema.index(
  { sourceEntityType: 1, sourceEntityId: 1, version: 1, chunkOrder: 1 },
  { unique: true },
);

export type SavedSearch = InferSchemaType<typeof savedSearchSchema>;
export type SavedSearchDocument = HydratedDocument<SavedSearch>;
export type RecentSearch = InferSchemaType<typeof recentSearchSchema>;
export type RecentSearchDocument = HydratedDocument<RecentSearch>;
export type SearchAnalytics = InferSchemaType<typeof searchAnalyticsSchema>;
export type SearchAnalyticsDocument = HydratedDocument<SearchAnalytics>;
export type KnowledgeChunk = InferSchemaType<typeof knowledgeChunkSchema>;
export type KnowledgeChunkDocument = HydratedDocument<KnowledgeChunk>;

export const SavedSearchModel = model<SavedSearch>('SavedSearch', savedSearchSchema);
export const RecentSearchModel = model<RecentSearch>('RecentSearch', recentSearchSchema);
export const SearchAnalyticsModel = model<SearchAnalytics>(
  'SearchAnalytics',
  searchAnalyticsSchema,
);
export const KnowledgeChunkModel = model<KnowledgeChunk>('KnowledgeChunk', knowledgeChunkSchema);
