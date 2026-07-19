import type { SearchEntityType } from '@pm/types';
import type { FilterQuery, Types } from 'mongoose';
import { SearchIndexModel, type SearchIndexDocument } from '../models/search-index.model.js';
import {
  KnowledgeChunkModel,
  type KnowledgeChunkDocument,
  RecentSearchModel,
  type RecentSearchDocument,
  SavedSearchModel,
  type SavedSearchDocument,
  SearchAnalyticsModel,
} from '../models/search-support.model.js';

export interface SearchIndexInput {
  readonly workspaceId: Types.ObjectId;
  readonly entityId: Types.ObjectId;
  readonly entityType: SearchEntityType;
  readonly title: string;
  readonly description?: string | null | undefined;
  readonly keywords?: string[] | undefined;
  readonly content?: string | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
  readonly ownerId?: Types.ObjectId | null | undefined;
  readonly visibility?: string | undefined;
  readonly archived?: boolean | undefined;
  readonly popularity?: number | undefined;
  readonly updatedSourceAt?: Date | undefined;
  readonly permissionSnapshot?: Record<string, unknown> | undefined;
  readonly url: string;
}

export interface SearchIndexFilters {
  readonly workspaceId: Types.ObjectId;
  readonly query?: string | undefined;
  readonly entityTypes?: SearchEntityType[] | undefined;
  readonly ownerId?: Types.ObjectId | undefined;
  readonly archived?: boolean | undefined;
  readonly updatedFrom?: Date | undefined;
  readonly updatedTo?: Date | undefined;
  readonly sort?: 'relevance' | 'updated' | 'created' | 'alphabetical' | 'popularity';
  readonly skip: number;
  readonly limit: number;
}

export class SearchRepository {
  public async upsertIndex(input: SearchIndexInput): Promise<SearchIndexDocument> {
    return SearchIndexModel.findOneAndUpdate(
      { workspaceId: input.workspaceId, entityType: input.entityType, entityId: input.entityId },
      { $set: input },
      { upsert: true, new: true },
    ).exec() as Promise<SearchIndexDocument>;
  }

  public async search(input: SearchIndexFilters): Promise<SearchIndexDocument[]> {
    const filter = this.toFilter(input);
    const sort =
      input.sort === 'alphabetical'
        ? { title: 1 as const }
        : input.sort === 'created'
          ? { createdAt: -1 as const }
          : input.sort === 'popularity'
            ? { popularity: -1 as const, updatedSourceAt: -1 as const }
            : { updatedSourceAt: -1 as const, popularity: -1 as const };
    return SearchIndexModel.find(filter)
      .sort(sort)
      .skip(input.skip)
      .limit(input.limit)
      .exec() as Promise<SearchIndexDocument[]>;
  }

  public async count(input: Omit<SearchIndexFilters, 'skip' | 'limit'>): Promise<number> {
    return SearchIndexModel.countDocuments(this.toFilter({ ...input, skip: 0, limit: 0 })).exec();
  }

  public async suggestions(input: {
    workspaceId: Types.ObjectId;
    query?: string | undefined;
    limit: number;
  }): Promise<SearchIndexDocument[]> {
    const filter: FilterQuery<SearchIndexDocument> = {
      workspaceId: input.workspaceId,
      archived: false,
      ...(input.query
        ? {
            $or: [
              { title: { $regex: input.query, $options: 'i' } },
              { keywords: { $regex: input.query, $options: 'i' } },
            ],
          }
        : {}),
    };
    return SearchIndexModel.find(filter)
      .sort({ popularity: -1, updatedSourceAt: -1 })
      .limit(input.limit)
      .exec() as Promise<SearchIndexDocument[]>;
  }

  public async incrementPopularity(id: Types.ObjectId): Promise<void> {
    await SearchIndexModel.updateOne({ _id: id }, { $inc: { popularity: 1 } }).exec();
  }

  public async saveSearch(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    name: string;
    query: string;
    filters: Record<string, unknown>;
    pinned: boolean;
  }): Promise<SavedSearchDocument> {
    return SavedSearchModel.create(input) as Promise<SavedSearchDocument>;
  }

  public async listSavedSearches(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
  }): Promise<SavedSearchDocument[]> {
    return SavedSearchModel.find({ workspaceId: input.workspaceId, userId: input.userId })
      .sort({ pinned: -1, updatedAt: -1 })
      .exec() as Promise<SavedSearchDocument[]>;
  }

  public async deleteSavedSearch(id: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    await SavedSearchModel.deleteOne({ _id: id, userId }).exec();
  }

  public async createRecent(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    query: string;
    filters: Record<string, unknown>;
  }): Promise<RecentSearchDocument> {
    return RecentSearchModel.create(input) as Promise<RecentSearchDocument>;
  }

  public async listRecent(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    limit: number;
  }): Promise<RecentSearchDocument[]> {
    return RecentSearchModel.find({ workspaceId: input.workspaceId, userId: input.userId })
      .sort({ createdAt: -1 })
      .limit(input.limit)
      .exec() as Promise<RecentSearchDocument[]>;
  }

  public async clearRecent(workspaceId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    await RecentSearchModel.deleteMany({ workspaceId, userId }).exec();
  }

  public async recordAnalytics(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    query: string;
    resultCount: number;
    latencyMs: number;
  }): Promise<void> {
    await SearchAnalyticsModel.create({
      ...input,
      normalizedQuery: input.query.trim().toLowerCase(),
    });
  }

  public async analytics(workspaceId: Types.ObjectId): Promise<{
    topQueries: { query: string; count: number }[];
    noResultQueries: { query: string; count: number }[];
    totalSearches: number;
    averageLatencyMs: number;
  }> {
    const [topQueries, noResultQueries, totals] = await Promise.all([
      SearchAnalyticsModel.aggregate<{ _id: string; count: number }>([
        { $match: { workspaceId } },
        { $group: { _id: '$normalizedQuery', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      SearchAnalyticsModel.aggregate<{ _id: string; count: number }>([
        { $match: { workspaceId, resultCount: 0 } },
        { $group: { _id: '$normalizedQuery', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      SearchAnalyticsModel.aggregate<{ _id: null; count: number; latency: number }>([
        { $match: { workspaceId } },
        { $group: { _id: null, count: { $sum: 1 }, latency: { $avg: '$latencyMs' } } },
      ]),
    ]);
    return {
      topQueries: topQueries.map((item) => ({ query: item._id, count: item.count })),
      noResultQueries: noResultQueries.map((item) => ({ query: item._id, count: item.count })),
      totalSearches: totals[0]?.count ?? 0,
      averageLatencyMs: Math.round(totals[0]?.latency ?? 0),
    };
  }

  public async replaceChunks(
    sourceEntityType: SearchEntityType,
    sourceEntityId: Types.ObjectId,
    chunks: {
      workspaceId: Types.ObjectId;
      sourceEntityType: SearchEntityType;
      sourceEntityId: Types.ObjectId;
      sectionId: string | null;
      heading: string | null;
      content: string;
      version: number;
      chunkOrder: number;
      chunkSize: number;
      embeddingProvider: string | null;
      embeddingId: string | null;
    }[],
  ): Promise<KnowledgeChunkDocument[]> {
    await KnowledgeChunkModel.deleteMany({ sourceEntityType, sourceEntityId }).exec();
    if (chunks.length === 0) return [];
    return KnowledgeChunkModel.insertMany(chunks) as Promise<KnowledgeChunkDocument[]>;
  }

  public async listChunks(input: {
    workspaceId: Types.ObjectId;
    query: string;
    limit: number;
  }): Promise<KnowledgeChunkDocument[]> {
    return KnowledgeChunkModel.find({
      workspaceId: input.workspaceId,
      content: { $regex: input.query, $options: 'i' },
    })
      .sort({ updatedAt: -1, chunkOrder: 1 })
      .limit(input.limit)
      .exec() as Promise<KnowledgeChunkDocument[]>;
  }

  private toFilter(input: SearchIndexFilters): FilterQuery<SearchIndexDocument> {
    return {
      workspaceId: input.workspaceId,
      ...(input.archived !== undefined ? { archived: input.archived } : { archived: false }),
      ...(input.entityTypes?.length ? { entityType: { $in: input.entityTypes } } : {}),
      ...(input.ownerId ? { ownerId: input.ownerId } : {}),
      ...(input.updatedFrom || input.updatedTo
        ? {
            updatedSourceAt: {
              ...(input.updatedFrom ? { $gte: input.updatedFrom } : {}),
              ...(input.updatedTo ? { $lte: input.updatedTo } : {}),
            },
          }
        : {}),
      ...(input.query
        ? {
            $or: [
              { title: { $regex: input.query, $options: 'i' } },
              { description: { $regex: input.query, $options: 'i' } },
              { content: { $regex: input.query, $options: 'i' } },
              { keywords: { $regex: input.query, $options: 'i' } },
            ],
          }
        : {}),
    };
  }
}
