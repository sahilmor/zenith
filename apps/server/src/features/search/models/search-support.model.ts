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

export type SavedSearch = InferSchemaType<typeof savedSearchSchema>;
export type SavedSearchDocument = HydratedDocument<SavedSearch>;
export type RecentSearch = InferSchemaType<typeof recentSearchSchema>;
export type RecentSearchDocument = HydratedDocument<RecentSearch>;
export type SearchAnalytics = InferSchemaType<typeof searchAnalyticsSchema>;
export type SearchAnalyticsDocument = HydratedDocument<SearchAnalytics>;

export const SavedSearchModel = model<SavedSearch>('SavedSearch', savedSearchSchema);
export const RecentSearchModel = model<RecentSearch>('RecentSearch', recentSearchSchema);
export const SearchAnalyticsModel = model<SearchAnalytics>(
  'SearchAnalytics',
  searchAnalyticsSchema,
);
