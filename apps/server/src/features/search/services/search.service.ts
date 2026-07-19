import type {
  KnowledgeChunkSummary,
  RecentSearchSummary,
  SavedSearchSummary,
  SearchAnalyticsSummary,
  SearchEntityType,
  SearchGroupSummary,
  SearchHighlightSummary,
  SearchResponseSummary,
  SearchResultSummary,
  SearchSuggestionSummary,
  WorkspaceRole,
} from '@pm/types';
import { Types } from 'mongoose';
import { ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import { BoardModel } from '../../boards/models/board.model.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';
import { DocumentBlockModel } from '../../documents/models/document-block.model.js';
import { DocumentFolderModel } from '../../documents/models/document-folder.model.js';
import {
  DocumentPageTemplateModel,
  type DocumentPageTemplateDocument,
} from '../../documents/models/document-navigation.model.js';
import {
  DocumentPageModel,
  type DocumentPageDocument,
} from '../../documents/models/document-page.model.js';
import { DocumentSpaceModel } from '../../documents/models/document-space.model.js';
import { ProjectModel } from '../../projects/models/project.model.js';
import { TaskModel } from '../../tasks/models/task.model.js';
import { UserModel } from '../../users/models/user.model.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import type { SearchIndexDocument } from '../models/search-index.model.js';
import type {
  KnowledgeChunkDocument,
  RecentSearchDocument,
  SavedSearchDocument,
} from '../models/search-support.model.js';
import { SearchRepository } from '../repositories/search.repository.js';
import type {
  SavedSearchInput,
  SuggestionsQuery,
  UniversalSearchQuery,
} from '../validation/search.validation.js';

const managerRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager']);

const toObjectId = (value: string): Types.ObjectId => new Types.ObjectId(value);

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const compactText = (...parts: (string | null | undefined)[]): string =>
  parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

export class SearchService {
  public constructor(
    private readonly searchRepository = new SearchRepository(),
    private readonly workspaces = new WorkspaceRepository(),
  ) {}

  public async search(
    userId: Types.ObjectId,
    input: UniversalSearchQuery,
  ): Promise<SearchResponseSummary> {
    const startedAt = Date.now();
    const workspaceId = toObjectId(input.workspaceId);
    await this.requireWorkspaceMembership(workspaceId, userId);
    await entitlementService.requireFeature(workspaceId, 'advanced_search');
    await this.syncWorkspaceIndex(workspaceId);
    const entityTypes = input.entityTypes
      ?.split(',')
      .map((type) => type.trim())
      .filter((type): type is SearchEntityType => this.isSearchEntityType(type));
    const filters = {
      workspaceId,
      query: input.q,
      entityTypes,
      ownerId: input.ownerId ? toObjectId(input.ownerId) : undefined,
      archived: input.archived,
      updatedFrom: input.updatedFrom ? new Date(input.updatedFrom) : undefined,
      updatedTo: input.updatedTo ? new Date(input.updatedTo) : undefined,
      sort: input.sort,
      skip: (input.page - 1) * input.limit,
      limit: input.limit,
    };
    const [documents, total] = await Promise.all([
      this.searchRepository.search(filters),
      this.searchRepository.count(filters),
    ]);
    const permissioned = await this.filterReadableResults(documents, userId);
    const results = this.rankAndMap(permissioned, input.q ?? '', input.sort);
    await this.searchRepository.createRecent({
      workspaceId,
      userId,
      query: input.q ?? '',
      filters: {
        entityTypes,
        ownerId: input.ownerId,
        archived: input.archived,
        sort: input.sort,
      },
    });
    const latencyMs = Date.now() - startedAt;
    await this.searchRepository.recordAnalytics({
      workspaceId,
      userId,
      query: input.q ?? '',
      resultCount: results.length,
      latencyMs,
    });
    return {
      query: input.q ?? '',
      total: Math.min(total, results.length),
      page: input.page,
      limit: input.limit,
      latencyMs,
      results,
      groups: this.groupResults(results),
    };
  }

  public async suggestions(
    userId: Types.ObjectId,
    input: SuggestionsQuery,
  ): Promise<SearchSuggestionSummary[]> {
    const workspaceId = toObjectId(input.workspaceId);
    await this.requireWorkspaceMembership(workspaceId, userId);
    await this.syncWorkspaceIndex(workspaceId);
    const [recent, indexed] = await Promise.all([
      this.searchRepository.listRecent({ workspaceId, userId, limit: 5 }),
      this.searchRepository.suggestions({ workspaceId, query: input.q, limit: input.limit }),
    ]);
    const readable = await this.filterReadableResults(indexed, userId);
    return [
      ...recent.map((item) => ({
        id: `query:${item.id}`,
        label: item.query,
        entityType: 'query' as const,
        entityId: null,
        url: null,
        score: 100,
      })),
      ...readable.map((item) => ({
        id: item.id,
        label: item.title,
        entityType: item.entityType,
        entityId: item.entityId.toString(),
        url: item.url,
        score: item.popularity,
      })),
    ].slice(0, input.limit);
  }

  public async trending(
    userId: Types.ObjectId,
    workspaceId: Types.ObjectId,
  ): Promise<SearchResultSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    await this.syncWorkspaceIndex(workspaceId);
    const documents = await this.searchRepository.suggestions({ workspaceId, limit: 12 });
    return this.rankAndMap(await this.filterReadableResults(documents, userId), '', 'popularity');
  }

  public async saveSearch(
    userId: Types.ObjectId,
    input: SavedSearchInput,
  ): Promise<SavedSearchSummary> {
    const workspaceId = toObjectId(input.workspaceId);
    await this.requireWorkspaceMembership(workspaceId, userId);
    const saved = await this.searchRepository.saveSearch({
      workspaceId,
      userId,
      name: input.name,
      query: input.query,
      filters: input.filters,
      pinned: input.pinned,
    });
    return this.toSavedSearch(saved);
  }

  public async listSavedSearches(
    userId: Types.ObjectId,
    workspaceId: Types.ObjectId,
  ): Promise<SavedSearchSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    return (await this.searchRepository.listSavedSearches({ workspaceId, userId })).map((item) =>
      this.toSavedSearch(item),
    );
  }

  public async deleteSavedSearch(
    savedSearchId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    await this.searchRepository.deleteSavedSearch(savedSearchId, userId);
  }

  public async listRecent(
    userId: Types.ObjectId,
    workspaceId: Types.ObjectId,
  ): Promise<RecentSearchSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    return (await this.searchRepository.listRecent({ workspaceId, userId, limit: 20 })).map(
      (item) => this.toRecentSearch(item),
    );
  }

  public async clearRecent(userId: Types.ObjectId, workspaceId: Types.ObjectId): Promise<void> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    await this.searchRepository.clearRecent(workspaceId, userId);
  }

  public async analytics(
    userId: Types.ObjectId,
    workspaceId: Types.ObjectId,
  ): Promise<SearchAnalyticsSummary> {
    const role = await this.requireWorkspaceMembership(workspaceId, userId);
    if (!managerRoles.has(role)) throw new ForbiddenError('Search analytics access denied');
    return this.searchRepository.analytics(workspaceId);
  }

  public async retrieveForAi(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    query: string;
    limit?: number;
  }): Promise<KnowledgeChunkSummary[]> {
    await this.requireWorkspaceMembership(input.workspaceId, input.userId);
    await entitlementService.requireFeature(input.workspaceId, 'advanced_search');
    await this.syncWorkspaceIndex(input.workspaceId);
    const chunks = await this.searchRepository.listChunks({
      workspaceId: input.workspaceId,
      query: input.query,
      limit: input.limit ?? 8,
    });
    return (await this.filterReadableChunks(chunks, input.userId)).map((chunk) =>
      this.toKnowledgeChunk(chunk),
    );
  }

  public async syncWorkspaceIndex(workspaceId: Types.ObjectId): Promise<void> {
    const [projects, boards, tasks, spaces, folders, pages, templates, users] = await Promise.all([
      ProjectModel.find({ workspaceId }).exec(),
      BoardModel.find({ workspaceId }).exec(),
      TaskModel.find({ workspaceId }).exec(),
      DocumentSpaceModel.find({ workspaceId }).exec(),
      DocumentFolderModel.find({ workspaceId }).exec(),
      DocumentPageModel.find({ workspaceId, status: { $ne: 'deleted' } }).exec(),
      DocumentPageTemplateModel.find({ workspaceId }).exec(),
      WorkspaceMemberModel.find({ workspaceId, status: 'active' }).limit(100).exec(),
    ]);
    const workspaceUsers = await UserModel.find({
      _id: { $in: users.map((member) => member.userId) },
    }).exec();
    await Promise.all([
      ...projects.map((project) =>
        this.searchRepository.upsertIndex({
          workspaceId,
          entityId: project._id,
          entityType: 'project',
          title: project.name,
          description: project.description ?? null,
          keywords: [project.key],
          content: compactText(project.name, project.key, project.description),
          ownerId: project.ownerId,
          visibility: project.visibility,
          archived: project.status === 'archived',
          updatedSourceAt: project.updatedAt,
          url: `/dashboard/projects/${project.id}`,
        }),
      ),
      ...boards.map((board) =>
        this.searchRepository.upsertIndex({
          workspaceId,
          entityId: board._id,
          entityType: 'board',
          title: board.name,
          description: board.description ?? null,
          content: compactText(board.name, board.description),
          archived: board.archived,
          updatedSourceAt: board.updatedAt,
          url: `/dashboard/projects/${board.projectId.toString()}/boards`,
        }),
      ),
      ...tasks.map((task) =>
        this.searchRepository.upsertIndex({
          workspaceId,
          entityId: task._id,
          entityType: 'task',
          title: task.title,
          description: task.description ?? null,
          keywords: task.labels,
          content: compactText(task.title, task.description, task.labels.join(' ')),
          ownerId: task.reporterId,
          visibility: 'workspace',
          archived: task.archived,
          updatedSourceAt: task.updatedAt,
          url: `/dashboard/projects/${task.projectId.toString()}/boards`,
          metadata: { priority: task.priority, status: task.status, labels: task.labels },
        }),
      ),
      ...spaces.map((space) =>
        this.searchRepository.upsertIndex({
          workspaceId,
          entityId: space._id,
          entityType: 'document_space',
          title: space.name,
          description: space.description,
          content: compactText(space.name, space.description),
          ownerId: space.ownerId,
          visibility: space.visibility,
          archived: space.archived,
          updatedSourceAt: space.updatedAt,
          url: '/dashboard/documents',
        }),
      ),
      ...folders.map((folder) =>
        this.searchRepository.upsertIndex({
          workspaceId,
          entityId: folder._id,
          entityType: 'document_folder',
          title: folder.name,
          description: folder.description,
          content: compactText(folder.name, folder.description),
          visibility: folder.visibility,
          archived: folder.archived,
          updatedSourceAt: folder.updatedAt,
          url: '/dashboard/documents',
        }),
      ),
      ...pages.map((page) => this.indexPage(page)),
      ...templates.map((template) => this.indexTemplate(template)),
      ...workspaceUsers.map((user) =>
        this.searchRepository.upsertIndex({
          workspaceId,
          entityId: user._id,
          entityType: 'user',
          title: user.name,
          description: user.email,
          content: compactText(user.name, user.email),
          visibility: 'workspace',
          archived: false,
          updatedSourceAt: user.updatedAt,
          url: '/dashboard/workspace/members',
        }),
      ),
    ]);
  }

  private async indexPage(page: DocumentPageDocument): Promise<void> {
    const blocks = await DocumentBlockModel.find({ pageId: page._id }).sort({ order: 1 }).exec();
    const content = compactText(
      page.title,
      page.summary,
      ...blocks.map((block) =>
        typeof block.content.text === 'string' ? block.content.text : JSON.stringify(block.content),
      ),
    );
    await this.searchRepository.upsertIndex({
      workspaceId: page.workspaceId,
      entityId: page._id,
      entityType: 'document_page',
      title: page.title,
      description: page.summary,
      keywords: page.tagIds.map((tagId) => tagId.toString()),
      content,
      ownerId: page.ownerId,
      visibility: page.status,
      archived: page.archived,
      updatedSourceAt: page.updatedAt,
      permissionSnapshot: {
        ownerId: page.ownerId.toString(),
        permissions: page.permissions.map((permission) => ({
          userId: permission.userId.toString(),
          role: permission.role,
        })),
      },
      url: '/dashboard/documents',
      metadata: { status: page.status, tagIds: page.tagIds.map((tagId) => tagId.toString()) },
    });
    await this.searchRepository.replaceChunks(
      'document_page',
      page._id,
      this.chunkContent({
        workspaceId: page.workspaceId,
        sourceEntityType: 'document_page',
        sourceEntityId: page._id,
        content,
        version: page.currentVersion || 1,
      }),
    );
  }

  private async indexTemplate(template: DocumentPageTemplateDocument): Promise<void> {
    const content = compactText(
      template.name,
      template.description,
      ...template.blocks.map((block) => JSON.stringify(block)),
    );
    await this.searchRepository.upsertIndex({
      workspaceId: template.workspaceId,
      entityId: template._id,
      entityType: 'document_template',
      title: template.name,
      description: template.description,
      keywords: [template.category, ...template.variables],
      content,
      visibility: 'workspace',
      archived: template.archived,
      updatedSourceAt: template.updatedAt,
      url: '/dashboard/documents',
      metadata: { category: template.category, variables: template.variables },
    });
  }

  private chunkContent(input: {
    workspaceId: Types.ObjectId;
    sourceEntityType: SearchEntityType;
    sourceEntityId: Types.ObjectId;
    content: string;
    version: number;
  }) {
    const words = input.content.split(/\s+/).filter(Boolean);
    const chunks = [];
    for (let index = 0; index < words.length; index += 120) {
      const content = words.slice(index, index + 120).join(' ');
      chunks.push({
        workspaceId: input.workspaceId,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        sectionId: null,
        heading: null,
        content,
        version: input.version,
        chunkOrder: index / 120,
        chunkSize: content.length,
        embeddingProvider: null,
        embeddingId: null,
      });
    }
    return chunks;
  }

  private async filterReadableResults(
    documents: SearchIndexDocument[],
    userId: Types.ObjectId,
  ): Promise<SearchIndexDocument[]> {
    const readable = [];
    for (const document of documents) {
      if (document.entityType !== 'document_page') {
        readable.push(document);
        continue;
      }
      const page = await DocumentPageModel.findById(document.entityId).exec();
      if (page && (await this.canReadPage(page, userId))) readable.push(document);
    }
    return readable;
  }

  private async filterReadableChunks(
    chunks: KnowledgeChunkDocument[],
    userId: Types.ObjectId,
  ): Promise<KnowledgeChunkDocument[]> {
    const readable = [];
    for (const chunk of chunks) {
      if (chunk.sourceEntityType !== 'document_page') {
        readable.push(chunk);
        continue;
      }
      const page = await DocumentPageModel.findById(chunk.sourceEntityId).exec();
      if (page && (await this.canReadPage(page, userId))) readable.push(chunk);
    }
    return readable;
  }

  private async canReadPage(page: DocumentPageDocument, userId: Types.ObjectId): Promise<boolean> {
    if (page.ownerId.equals(userId)) return true;
    const explicit = page.permissions.find((permission) => permission.userId.equals(userId));
    if (explicit && explicit.role !== 'none') return true;
    const membership = await this.workspaces.findMembership(page.workspaceId, userId);
    return Boolean(membership && membership.status === 'active' && page.status === 'published');
  }

  private rankAndMap(
    documents: SearchIndexDocument[],
    query: string,
    sort: UniversalSearchQuery['sort'],
  ): SearchResultSummary[] {
    const normalized = query.trim().toLowerCase();
    return documents
      .map((document) => ({
        document,
        score: this.score(document, normalized),
      }))
      .sort((left, right) => {
        if (sort === 'alphabetical') return left.document.title.localeCompare(right.document.title);
        if (sort === 'popularity') return right.document.popularity - left.document.popularity;
        if (sort === 'created')
          return right.document.createdAt.getTime() - left.document.createdAt.getTime();
        if (sort === 'updated')
          return right.document.updatedSourceAt.getTime() - left.document.updatedSourceAt.getTime();
        return (
          right.score - left.score ||
          right.document.updatedSourceAt.getTime() - left.document.updatedSourceAt.getTime()
        );
      })
      .map(({ document, score }) => this.toResult(document, score, normalized));
  }

  private score(document: SearchIndexDocument, query: string): number {
    if (!query)
      return document.popularity + Math.round(document.updatedSourceAt.getTime() / 1000000000);
    const title = document.title.toLowerCase();
    const content = compactText(document.description, document.content).toLowerCase();
    let score = 0;
    if (title === query) score += 1000;
    if (title.includes(query)) score += 500;
    if (content.includes(query)) score += 120;
    score += document.popularity * 10;
    score += Math.max(
      0,
      30 - Math.floor((Date.now() - document.updatedSourceAt.getTime()) / 86400000),
    );
    return score;
  }

  private toResult(
    document: SearchIndexDocument,
    score: number,
    normalizedQuery: string,
  ): SearchResultSummary {
    return {
      id: document.id,
      workspaceId: document.workspaceId.toString(),
      entityId: document.entityId.toString(),
      entityType: document.entityType,
      title: document.title,
      description: document.description ?? null,
      url: document.url,
      score,
      highlights: this.highlights(document, normalizedQuery),
      metadata: document.metadata,
      ownerId: document.ownerId?.toString() ?? null,
      updatedAt: document.updatedSourceAt.toISOString(),
    };
  }

  private highlights(document: SearchIndexDocument, query: string): SearchHighlightSummary[] {
    if (!query) return [];
    return [
      this.highlight('title', document.title, query),
      this.highlight('description', document.description ?? '', query),
      this.highlight('content', document.content, query),
    ].filter((item): item is SearchHighlightSummary => Boolean(item));
  }

  private highlight(
    field: SearchHighlightSummary['field'],
    value: string,
    query: string,
  ): SearchHighlightSummary | null {
    const index = value.toLowerCase().indexOf(query);
    if (index < 0) return null;
    const start = Math.max(0, index - 40);
    const end = Math.min(value.length, index + query.length + 80);
    const snippet = escapeHtml(value.slice(start, end)).replace(
      new RegExp(escapeRegex(query), 'ig'),
      (match) => `<mark>${match}</mark>`,
    );
    return { field, snippet };
  }

  private groupResults(results: SearchResultSummary[]): SearchGroupSummary[] {
    const groups = new Map<SearchEntityType, SearchResultSummary[]>();
    for (const result of results)
      groups.set(result.entityType, [...(groups.get(result.entityType) ?? []), result]);
    return [...groups.entries()].map(([entityType, groupResults]) => ({
      entityType,
      total: groupResults.length,
      results: groupResults,
    }));
  }

  private async requireWorkspaceMembership(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<WorkspaceRole> {
    const [workspace, membership] = await Promise.all([
      this.workspaces.findWorkspaceById(workspaceId),
      this.workspaces.findMembership(workspaceId, userId),
    ]);
    if (!workspace || workspace.archived) throw new NotFoundError('Workspace not found');
    if (!membership || membership.status !== 'active')
      throw new ForbiddenError('Workspace access denied');
    return membership.role as WorkspaceRole;
  }

  private isSearchEntityType(value: string): value is SearchEntityType {
    return [
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
    ].includes(value);
  }

  private toSavedSearch(search: SavedSearchDocument): SavedSearchSummary {
    return {
      id: search.id,
      workspaceId: search.workspaceId.toString(),
      userId: search.userId.toString(),
      name: search.name,
      query: search.query,
      filters: search.filters,
      pinned: search.pinned,
      createdAt: search.createdAt.toISOString(),
      updatedAt: search.updatedAt.toISOString(),
    };
  }

  private toRecentSearch(search: RecentSearchDocument): RecentSearchSummary {
    return {
      id: search.id,
      workspaceId: search.workspaceId.toString(),
      userId: search.userId.toString(),
      query: search.query,
      filters: search.filters,
      createdAt: search.createdAt.toISOString(),
    };
  }

  private toKnowledgeChunk(chunk: KnowledgeChunkDocument): KnowledgeChunkSummary {
    return {
      id: chunk.id,
      workspaceId: chunk.workspaceId.toString(),
      sourceEntityType: chunk.sourceEntityType,
      sourceEntityId: chunk.sourceEntityId.toString(),
      sectionId: chunk.sectionId ?? null,
      heading: chunk.heading ?? null,
      content: chunk.content,
      version: chunk.version,
      chunkOrder: chunk.chunkOrder,
      chunkSize: chunk.chunkSize,
      embeddingProvider: chunk.embeddingProvider ?? null,
      embeddingId: chunk.embeddingId ?? null,
      updatedAt: chunk.updatedAt.toISOString(),
    };
  }
}

export const searchService = new SearchService();
