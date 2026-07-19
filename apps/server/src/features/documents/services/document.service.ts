import type {
  DocumentBlockSummary,
  DocumentCommentSummary,
  DocumentFavoriteSummary,
  DocumentFolderSummary,
  DocumentPageOutlineItem,
  DocumentPageTagSummary,
  DocumentPageDetailSummary,
  DocumentPageSummary,
  DocumentPermissionRole,
  DocumentPinSummary,
  DocumentRecentPageSummary,
  DocumentRelationshipKind,
  DocumentRelationshipSummary,
  DocumentRelationshipTargetType,
  DocumentSpaceSummary,
  DocumentTemplateSummary,
  DocumentTreeSummary,
  DocumentVersionSummary,
  DocumentWatcherSummary,
  KnowledgeHomeSummary,
  RealtimeAction,
  RealtimeResource,
  WorkspaceRole,
} from '@pm/types';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { realtimeService } from '../../../sockets/realtime.service.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import { ActivityService } from '../../activity/services/activity.service.js';
import type { ActivityEventName } from '../../activity/models/activity-event.model.js';
import { entitlementService } from '../../billing/services/entitlement.service.js';
import { notificationService } from '../../notifications/services/notification.service.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import { parseMentionedUserIds } from '../../tasks/utils/mentions.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import type { DocumentBlockDocument } from '../models/document-block.model.js';
import type { DocumentCommentDocument } from '../models/document-comment.model.js';
import type { DocumentFolderDocument } from '../models/document-folder.model.js';
import type {
  DocumentFavoriteDocument,
  DocumentPageTagDocument,
  DocumentPageTemplateDocument,
  DocumentPinDocument,
  DocumentRecentPageDocument,
  DocumentRelationshipDocument,
  DocumentWatcherDocument,
} from '../models/document-navigation.model.js';
import type { DocumentPageDocument } from '../models/document-page.model.js';
import type { DocumentSpaceDocument } from '../models/document-space.model.js';
import type { DocumentVersionDocument } from '../models/document-version.model.js';
import { DocumentRepository } from '../repositories/document.repository.js';
import type {
  CreateDocumentCommentInput,
  CreateFolderInput,
  CreatePageInput,
  CreateRelationshipInput,
  CreateSpaceInput,
  CreateTagInput,
  CreateTemplateInput,
  FavoriteTargetInput,
  PinPageInput,
  SaveBlocksInput,
  UpdateDocumentCommentInput,
  UpdatePageInput,
  UseTemplateInput,
  WatchPageInput,
} from '../validation/document.validation.js';

const manageWorkspaceRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager']);
const writePermissionRank: Record<DocumentPermissionRole, number> = {
  none: 0,
  viewer: 1,
  commenter: 2,
  editor: 3,
  owner: 4,
};

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'untitled';

const toObjectId = (value: string): Types.ObjectId => new Types.ObjectId(value);
const documentLinkKeys: Partial<Record<DocumentRelationshipTargetType, string[]>> = {
  page: ['pageId', 'documentPageId'],
  document: ['documentId'],
  task: ['taskId'],
  project: ['projectId'],
  goal: ['goalId'],
  incident: ['incidentId'],
  form: ['formId'],
  template: ['templateId'],
  file: ['fileId'],
};
const unsafeTextPattern = /<\s*script|javascript:|data:text\/html/i;
const unsafeObjectKeyPattern = /^(?:__proto__|prototype|constructor|on[a-z]+)/i;
const urlLikeKeys = new Set(['url', 'href', 'src', 'embedUrl', 'sourceUrl', 'link']);

export class DocumentService {
  public constructor(
    private readonly documents = new DocumentRepository(),
    private readonly workspaces = new WorkspaceRepository(),
    private readonly activity = new ActivityService(),
  ) {}

  public async getKnowledgeHome(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<KnowledgeHomeSummary> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    const [spaces, favorites, recents, pins, templates] = await Promise.all([
      this.documents.listSpaces(workspaceId),
      this.documents.listFavorites({ workspaceId, userId }),
      this.documents.listRecentPages({ workspaceId, userId }),
      this.documents.listPins({ workspaceId, userId }),
      this.documents.listTemplates({ workspaceId }),
    ]);
    return {
      spaces: spaces.map((space) => this.toSpace(space)),
      favorites: favorites.map((favorite) => this.toFavorite(favorite)),
      recentPages: await this.toRecentPages(recents, userId),
      pinnedPages: await this.toPins(pins, userId),
      templates: templates.map((template) => this.toTemplate(template)),
    };
  }

  public async createSpace(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateSpaceInput,
  ): Promise<DocumentSpaceSummary> {
    await this.requireWorkspaceRole(workspaceId, userId, manageWorkspaceRoles);
    await entitlementService.requireFeature(workspaceId, 'documents');
    await entitlementService.requireWithinLimit(workspaceId, 'documentSpaces');
    const slug = await this.uniqueSpaceSlug(workspaceId, input.slug ?? input.name);
    const space = await this.documents.createSpace({
      workspaceId,
      name: input.name,
      slug,
      description: input.description ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      banner: input.banner ?? null,
      homepagePageId: input.homepagePageId ? toObjectId(input.homepagePageId) : null,
      defaultTemplateId: input.defaultTemplateId ? toObjectId(input.defaultTemplateId) : null,
      defaultPermissions: input.defaultPermissions.map((permission) => ({
        userId: toObjectId(permission.userId),
        role: permission.role,
      })),
      visibility: input.visibility,
      ownerId: userId,
      createdBy: userId,
    });
    await this.record(workspaceId, userId, 'document.space.created', { spaceId: space.id });
    const summary = this.toSpace(space);
    this.emit('document_space', 'created', summary.workspaceId, userId, summary);
    return summary;
  }

  public async listSpaces(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentSpaceSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    return (await this.documents.listSpaces(workspaceId)).map((space) => this.toSpace(space));
  }

  public async favoriteTarget(
    userId: Types.ObjectId,
    input: FavoriteTargetInput,
  ): Promise<DocumentFavoriteSummary> {
    const workspaceId = toObjectId(input.workspaceId);
    await this.requireFavoriteTargetAccess(input.targetType, toObjectId(input.targetId), userId);
    const favorite = await this.documents.upsertFavorite({
      workspaceId,
      userId,
      targetType: input.targetType,
      targetId: toObjectId(input.targetId),
      sortOrder: input.sortOrder,
    });
    await this.record(workspaceId, userId, 'document.page.updated', {
      targetType: input.targetType,
      targetId: input.targetId,
      action: 'favorite_added',
    });
    return this.toFavorite(favorite);
  }

  public async unfavoriteTarget(
    userId: Types.ObjectId,
    targetType: FavoriteTargetInput['targetType'],
    targetId: Types.ObjectId,
  ): Promise<void> {
    await this.requireFavoriteTargetAccess(targetType, targetId, userId);
    await this.documents.deleteFavorite({ userId, targetType, targetId });
  }

  public async listFavorites(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentFavoriteSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    return (await this.documents.listFavorites({ workspaceId, userId })).map((favorite) =>
      this.toFavorite(favorite),
    );
  }

  public async createFolder(
    spaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateFolderInput,
  ): Promise<DocumentFolderSummary> {
    const space = await this.requireSpaceWrite(spaceId, userId);
    if (input.parentFolderId)
      await this.requireFolderWrite(toObjectId(input.parentFolderId), userId);
    const slug = slugify(input.slug ?? input.name);
    const folder = await this.documents.createFolder({
      workspaceId: space.workspaceId,
      spaceId,
      parentFolderId: input.parentFolderId ? toObjectId(input.parentFolderId) : null,
      name: input.name,
      slug,
      description: input.description ?? null,
      icon: input.icon ?? null,
      order: input.order,
      visibility: input.visibility,
      permissions: input.permissions.map((permission) => ({
        userId: toObjectId(permission.userId),
        role: permission.role,
      })),
      createdBy: userId,
    });
    await this.record(space.workspaceId, userId, 'document.folder.created', {
      folderId: folder.id,
    });
    const summary = this.toFolder(folder);
    this.emit('document_folder', 'created', summary.workspaceId, userId, summary);
    return summary;
  }

  public async getTree(
    spaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: { folderId?: string | null; parentPageId?: string | null },
  ): Promise<DocumentTreeSummary> {
    const space = await this.requireSpaceRead(spaceId, userId);
    const folderId = input.folderId ? toObjectId(input.folderId) : null;
    const parentPageId = input.parentPageId ? toObjectId(input.parentPageId) : null;
    const [folders, pages] = await Promise.all([
      this.documents.listFolders({ spaceId, parentFolderId: folderId }),
      this.documents.listPages({ spaceId, folderId, parentPageId }),
    ]);
    const readablePages = [];
    for (const page of pages) {
      if (await this.hasPageRole(page, userId, 'viewer')) readablePages.push(this.toPage(page));
    }
    return {
      spaces: [this.toSpace(space)],
      folders: folders
        .filter((folder) => this.resolveFolderRole(folder, userId) !== 'none')
        .map((folder) => this.toFolder(folder)),
      pages: readablePages,
    };
  }

  public async createPage(
    spaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreatePageInput,
  ): Promise<DocumentPageDetailSummary> {
    const space = await this.requireSpaceWrite(spaceId, userId);
    await entitlementService.requireWithinLimit(space.workspaceId, 'documentPages');
    if (input.folderId) await this.requireFolderWrite(toObjectId(input.folderId), userId);
    if (input.parentPageId)
      await this.requirePageRole(toObjectId(input.parentPageId), userId, 'editor');
    const page = await this.documents.createPage({
      workspaceId: space.workspaceId,
      spaceId,
      folderId: input.folderId ? toObjectId(input.folderId) : null,
      parentPageId: input.parentPageId ? toObjectId(input.parentPageId) : null,
      title: input.title,
      slug: slugify(input.slug ?? input.title),
      status: input.status,
      icon: input.icon ?? null,
      coverImage: input.coverImage ?? null,
      summary: input.summary ?? null,
      properties: this.sanitizeRecord(input.properties, 'properties'),
      tagIds: input.tagIds.map((tagId) => toObjectId(tagId)),
      ownerId: userId,
      createdBy: userId,
      permissions: input.permissions.map((permission) => ({
        userId: toObjectId(permission.userId),
        role: permission.role,
      })),
    });
    const blocks = await this.replaceBlocks(page, userId, { blocks: input.blocks });
    await this.syncBlockRelationships(page, userId, blocks);
    await this.record(space.workspaceId, userId, 'document.page.created', { pageId: page.id });
    const detail = await this.toPageDetail(page, blocks, userId);
    this.emit('document_page', 'created', detail.workspaceId, userId, detail);
    return detail;
  }

  public async pinPage(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
    input: PinPageInput,
  ): Promise<DocumentPinSummary> {
    const page = await this.requirePageRole(pageId, userId, 'viewer');
    if (input.scope !== 'personal') {
      await this.requireWorkspaceRole(page.workspaceId, userId, manageWorkspaceRoles);
    }
    const pin = await this.documents.upsertPin({
      workspaceId: page.workspaceId,
      scope: input.scope,
      spaceId:
        input.scope === 'space' ? (input.spaceId ? toObjectId(input.spaceId) : page.spaceId) : null,
      userId: input.scope === 'personal' ? userId : null,
      pageId,
      sortOrder: input.sortOrder,
      createdBy: userId,
    });
    await this.record(page.workspaceId, userId, 'document.page.updated', {
      pageId: page.id,
      action: 'pinned',
      scope: input.scope,
    });
    return this.toPin(pin, page);
  }

  public async createRelationship(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateRelationshipInput,
  ): Promise<DocumentRelationshipSummary> {
    const page = await this.requirePageRole(pageId, userId, 'editor');
    const targetId = toObjectId(input.targetId);
    const targetPage =
      input.targetType === 'page' || input.targetType === 'document'
        ? await this.requirePageRole(targetId, userId, 'viewer')
        : null;
    const relationship = await this.documents.upsertRelationship({
      workspaceId: page.workspaceId,
      sourcePageId: pageId,
      targetType: input.targetType,
      targetId,
      targetPageId: targetPage?._id ?? null,
      relationshipType: input.relationshipType,
      broken: false,
      metadata: this.sanitizeRecord(input.metadata, 'metadata'),
      createdBy: userId,
    });
    await this.record(page.workspaceId, userId, 'document.page.updated', {
      pageId: page.id,
      action: 'relationship_created',
      targetType: input.targetType,
      targetId: input.targetId,
    });
    return this.toRelationship(relationship);
  }

  public async listRelationships(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentRelationshipSummary[]> {
    const page = await this.requirePageRole(pageId, userId, 'viewer');
    return this.filterRelationships(
      await this.documents.listRelationships({ sourcePageId: page._id }),
      userId,
      page.workspaceId,
    );
  }

  public async listBacklinks(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentRelationshipSummary[]> {
    const page = await this.requirePageRole(pageId, userId, 'viewer');
    return this.filterRelationships(
      await this.documents.listRelationships({ targetPageId: page._id }),
      userId,
      page.workspaceId,
    );
  }

  public async createTag(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateTagInput,
  ): Promise<DocumentPageTagSummary> {
    await this.requireWorkspaceRole(workspaceId, userId, manageWorkspaceRoles);
    const existing = await this.documents.findTagBySlug(workspaceId, slugify(input.name));
    if (existing) return this.toTag(existing);
    const tag = await this.documents.createTag({
      workspaceId,
      name: input.name,
      slug: slugify(input.name),
      color: input.color,
      description: input.description ?? null,
      createdBy: userId,
    });
    await this.record(workspaceId, userId, 'document.page.updated', {
      action: 'tag_created',
      tagId: tag.id,
    });
    return this.toTag(tag);
  }

  public async listTags(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentPageTagSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    return (await this.documents.listTags(workspaceId)).map((tag) => this.toTag(tag));
  }

  public async createTemplate(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateTemplateInput,
  ): Promise<DocumentTemplateSummary> {
    await this.requireWorkspaceRole(workspaceId, userId, manageWorkspaceRoles);
    if (input.spaceId) await this.requireSpaceRead(toObjectId(input.spaceId), userId);
    const template = await this.documents.createTemplate({
      workspaceId,
      spaceId: input.spaceId ? toObjectId(input.spaceId) : null,
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      icon: input.icon ?? null,
      blocks: input.blocks.map((block, index) => ({
        id: block.stableId ?? randomUUID(),
        stableId: block.stableId ?? randomUUID(),
        pageId: '',
        parentBlockId: block.parentBlockId ?? null,
        type: block.type,
        order: block.order ?? index,
        content: this.sanitizeRecord(block.content, `blocks.${index}.content`),
        metadata: this.sanitizeRecord(block.metadata, `blocks.${index}.metadata`),
        createdBy: userId.toString(),
        updatedBy: userId.toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      variables: input.variables,
      createdBy: userId,
    });
    await this.record(workspaceId, userId, 'document.page.updated', {
      action: 'template_created',
      templateId: template.id,
    });
    return this.toTemplate(template);
  }

  public async listTemplates(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    spaceId?: Types.ObjectId | null,
  ): Promise<DocumentTemplateSummary[]> {
    await this.requireWorkspaceMembership(workspaceId, userId);
    if (spaceId) await this.requireSpaceRead(spaceId, userId);
    return (
      await this.documents.listTemplates({
        workspaceId,
        ...(spaceId !== undefined ? { spaceId } : {}),
      })
    ).map((template) => this.toTemplate(template));
  }

  public async createPageFromTemplate(
    templateId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UseTemplateInput,
  ): Promise<DocumentPageDetailSummary> {
    const template = await this.documents.findTemplate(templateId);
    if (!template || template.archived) throw new NotFoundError('Template not found');
    const space = await this.requireSpaceWrite(toObjectId(input.spaceId), userId);
    if (!space.workspaceId.equals(template.workspaceId))
      throw new ForbiddenError('Template denied');
    const variables = await this.templateVariables(space.workspaceId, userId, input.variables);
    const templateBlocks = template.blocks
      .filter((block): block is DocumentBlockSummary => this.isTemplateBlock(block))
      .sort((left, right) => left.order - right.order);
    const blocks = templateBlocks.map((block, index) => ({
      stableId: randomUUID(),
      type: block.type,
      order: index,
      content: this.resolveTemplateRecord(block.content, variables),
      metadata: this.sanitizeRecord(block.metadata, `blocks.${index}.metadata`),
    }));
    const page = await this.createPage(space._id, userId, {
      title: input.title,
      folderId: input.folderId,
      parentPageId: input.parentPageId,
      status: 'draft',
      permissions: space.defaultPermissions.map((permission) => ({
        userId: permission.userId.toString(),
        role: permission.role,
      })),
      blocks,
      properties: {},
      tagIds: [],
    });
    await this.documents.incrementTemplateUse(templateId);
    await this.record(space.workspaceId, userId, 'document.page.updated', {
      pageId: page.id,
      action: 'template_used',
      templateId: template.id,
    });
    return page;
  }

  public async watchPage(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
    input: WatchPageInput,
  ): Promise<DocumentWatcherSummary> {
    const page = await this.requirePageRole(pageId, userId, 'viewer');
    const watcher = await this.documents.upsertWatcher({
      workspaceId: page.workspaceId,
      pageId,
      userId,
      subscription: input.subscription,
    });
    await this.record(page.workspaceId, userId, 'document.page.updated', {
      pageId: page.id,
      action: 'watched',
      subscription: input.subscription,
    });
    return this.toWatcher(watcher);
  }

  public async unwatchPage(pageId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    await this.requirePageRole(pageId, userId, 'viewer');
    await this.documents.deleteWatcher(pageId, userId);
  }

  public async getPage(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentPageDetailSummary> {
    const page = await this.requirePageRole(pageId, userId, 'viewer');
    const blocks = await this.documents.listBlocks(pageId);
    await this.documents.upsertRecentPage({ workspaceId: page.workspaceId, userId, pageId });
    return this.toPageDetail(page, blocks, userId);
  }

  public async updatePage(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdatePageInput,
  ): Promise<DocumentPageSummary> {
    const page = await this.requirePageRole(pageId, userId, 'editor');
    if (input.folderId) await this.requireFolderWrite(toObjectId(input.folderId), userId);
    const update: Partial<DocumentPageDocument> = {
      updatedBy: userId,
      ...(input.title ? { title: input.title } : {}),
      ...(input.folderId !== undefined
        ? { folderId: input.folderId ? toObjectId(input.folderId) : null }
        : {}),
      ...(input.parentPageId !== undefined
        ? { parentPageId: input.parentPageId ? toObjectId(input.parentPageId) : null }
        : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.coverImage !== undefined ? { coverImage: input.coverImage } : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.ownerId ? { ownerId: toObjectId(input.ownerId) } : {}),
      ...(input.properties !== undefined
        ? { properties: this.sanitizeRecord(input.properties, 'properties') }
        : {}),
      ...(input.tagIds ? { tagIds: input.tagIds.map((tagId) => toObjectId(tagId)) } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.permissions
        ? {
            permissions: input.permissions.map((permission) => ({
              userId: toObjectId(permission.userId),
              role: permission.role,
            })),
          }
        : {}),
    };
    if (input.title && slugify(input.title) !== page.slug) {
      update.slugHistory = [...new Set([...page.slugHistory, page.slug])];
      update.slug = slugify(input.title);
    }
    const updated = await this.documents.updatePage(pageId, update);
    if (!updated) throw new NotFoundError('Page not found');
    await this.record(page.workspaceId, userId, 'document.page.updated', {
      pageId: page.id,
      fields: Object.keys(input),
    });
    const summary = this.toPage(updated);
    this.emit('document_page', 'updated', summary.workspaceId, userId, summary);
    return summary;
  }

  public async saveBlocks(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
    input: SaveBlocksInput,
  ): Promise<DocumentBlockSummary[]> {
    const page = await this.requirePageRole(pageId, userId, 'editor');
    const blocks = await this.replaceBlocks(page, userId, input);
    await this.syncBlockRelationships(page, userId, blocks);
    await this.documents.updatePage(pageId, { updatedBy: userId });
    await this.record(page.workspaceId, userId, 'document.blocks.saved', {
      pageId: page.id,
      blockCount: blocks.length,
    });
    const summaries = blocks.map((block) => this.toBlock(block));
    this.emit('document_blocks', 'updated', page.workspaceId.toString(), userId, {
      pageId: page.id,
      blocks: summaries,
    });
    return summaries;
  }

  public async publishPage(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
    summary: string | null,
  ): Promise<DocumentVersionSummary> {
    const page = await this.requirePageRole(pageId, userId, 'editor');
    const blocks = await this.documents.listBlocks(pageId);
    const nextVersion = page.currentVersion + 1;
    const version = await this.documents.createVersion({
      pageId,
      version: nextVersion,
      editorId: userId,
      summary,
      blockSnapshot: blocks.map((block) => this.toBlock(block)),
      metadata: { status: page.status },
    });
    await this.documents.updatePage(pageId, {
      currentVersion: nextVersion,
      publishedVersion: nextVersion,
      status: 'published',
      updatedBy: userId,
    });
    await this.record(page.workspaceId, userId, 'document.page.published', {
      pageId: page.id,
      version: nextVersion,
    });
    const output = this.toVersion(version);
    this.emit('document_page', 'published', page.workspaceId.toString(), userId, output);
    return output;
  }

  public async archivePage(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentPageSummary> {
    const page = await this.requirePageRole(pageId, userId, 'editor');
    const updated = await this.documents.updatePage(pageId, {
      status: 'archived',
      archived: true,
      updatedBy: userId,
    });
    if (!updated) throw new NotFoundError('Page not found');
    await this.record(page.workspaceId, userId, 'document.page.archived', { pageId: page.id });
    await auditLogService.record({
      actorId: userId,
      workspaceId: page.workspaceId,
      targetType: 'document_page',
      targetId: page.id,
      action: 'document.page.archived',
      metadata: { title: page.title },
    });
    return this.toPage(updated);
  }

  public async restorePage(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentPageSummary> {
    const page = await this.requirePageRole(pageId, userId, 'editor');
    const updated = await this.documents.updatePage(pageId, {
      status: 'draft',
      archived: false,
      deletedAt: null,
      updatedBy: userId,
    });
    if (!updated) throw new NotFoundError('Page not found');
    await this.record(page.workspaceId, userId, 'document.page.restored', { pageId: page.id });
    return this.toPage(updated);
  }

  public async deletePage(pageId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const page = await this.requirePageRole(pageId, userId, 'owner');
    await this.documents.updatePage(pageId, {
      status: 'deleted',
      archived: true,
      deletedAt: new Date(),
      updatedBy: userId,
    });
    await this.record(page.workspaceId, userId, 'document.page.deleted', { pageId: page.id });
    await auditLogService.record({
      actorId: userId,
      workspaceId: page.workspaceId,
      targetType: 'document_page',
      targetId: page.id,
      action: 'document.page.deleted',
      metadata: { title: page.title },
    });
  }

  public async listVersions(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentVersionSummary[]> {
    await this.requirePageRole(pageId, userId, 'viewer');
    return (await this.documents.listVersions(pageId)).map((version) => this.toVersion(version));
  }

  public async createComment(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateDocumentCommentInput,
  ): Promise<DocumentCommentSummary> {
    const page = await this.requirePageRole(pageId, userId, 'commenter');
    if (input.blockId) {
      const block = await this.documents.findBlock(toObjectId(input.blockId));
      if (!block || !block.pageId.equals(pageId)) throw new BadRequestError('Block not found');
    }
    const mentionedUserIds = parseMentionedUserIds(input.content).map((id) => toObjectId(id));
    const comment = await this.documents.createComment({
      pageId,
      blockId: input.blockId ? toObjectId(input.blockId) : null,
      parentCommentId: input.parentCommentId ? toObjectId(input.parentCommentId) : null,
      authorId: userId,
      content: this.sanitizeText(input.content, 'content'),
      mentionedUserIds,
    });
    await Promise.all(
      mentionedUserIds.map((recipientId) =>
        notificationService.create({
          userId: recipientId,
          workspaceId: page.workspaceId,
          actorId: userId,
          type: 'comment_mention',
          title: 'You were mentioned in a document',
          message: `You were mentioned on ${page.title}.`,
          metadata: { pageId: page.id, blockId: input.blockId ?? null },
        }),
      ),
    );
    await this.record(page.workspaceId, userId, 'document.comment.created', { pageId: page.id });
    const summary = this.toComment(comment);
    this.emit('document_comment', 'created', page.workspaceId.toString(), userId, summary);
    return summary;
  }

  public async listComments(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentCommentSummary[]> {
    await this.requirePageRole(pageId, userId, 'viewer');
    return (await this.documents.listComments(pageId)).map((comment) => this.toComment(comment));
  }

  public async updateComment(
    commentId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateDocumentCommentInput,
  ): Promise<DocumentCommentSummary> {
    const comment = await this.documents.findComment(commentId);
    if (!comment) throw new NotFoundError('Comment not found');
    if (!comment.authorId.equals(userId)) {
      await this.requirePageRole(comment.pageId, userId, 'editor');
    }
    const updated = await this.documents.updateComment(commentId, {
      ...(input.content
        ? { content: this.sanitizeText(input.content, 'content'), editedAt: new Date() }
        : {}),
      ...(input.resolved !== undefined ? { resolved: input.resolved } : {}),
    });
    if (!updated) throw new NotFoundError('Comment not found');
    return this.toComment(updated);
  }

  private async filterRelationships(
    relationships: DocumentRelationshipDocument[],
    userId: Types.ObjectId,
    workspaceId: Types.ObjectId,
  ): Promise<DocumentRelationshipSummary[]> {
    const summaries: DocumentRelationshipSummary[] = [];
    for (const relationship of relationships) {
      const source = await this.documents.findPage(relationship.sourcePageId);
      if (!source || !(await this.hasPageRole(source, userId, 'viewer'))) continue;
      if (relationship.targetPageId) {
        const target = await this.documents.findPage(relationship.targetPageId);
        if (!target || !(await this.hasPageRole(target, userId, 'viewer'))) {
          continue;
        }
      }
      if (!relationship.workspaceId.equals(workspaceId)) continue;
      summaries.push(this.toRelationship(relationship));
    }
    return summaries;
  }

  private async requireFavoriteTargetAccess(
    targetType: FavoriteTargetInput['targetType'],
    targetId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    if (targetType === 'page') {
      await this.requirePageRole(targetId, userId, 'viewer');
      return;
    }
    if (targetType === 'space') {
      await this.requireSpaceRead(targetId, userId);
      return;
    }
    const template = await this.documents.findTemplate(targetId);
    if (!template || template.archived) throw new NotFoundError('Template not found');
    await this.requireWorkspaceMembership(template.workspaceId, userId);
  }

  private async replaceBlocks(
    page: DocumentPageDocument,
    userId: Types.ObjectId,
    input: SaveBlocksInput,
  ): Promise<DocumentBlockDocument[]> {
    const blocks = input.blocks.map((block, index) => ({
      stableId: block.stableId ?? randomUUID(),
      pageId: page._id,
      parentBlockId: block.parentBlockId ? toObjectId(block.parentBlockId) : null,
      type: block.type,
      order: block.order ?? index,
      content: this.sanitizeRecord(block.content, `blocks.${index}.content`),
      metadata: this.sanitizeRecord(block.metadata, `blocks.${index}.metadata`),
      createdBy: userId,
      updatedBy: userId,
    }));
    return this.documents.replacePageBlocks(page._id, blocks);
  }

  private async syncBlockRelationships(
    page: DocumentPageDocument,
    userId: Types.ObjectId,
    blocks: DocumentBlockDocument[],
  ): Promise<void> {
    const relationships: {
      workspaceId: Types.ObjectId;
      sourcePageId: Types.ObjectId;
      targetType: DocumentRelationshipTargetType;
      targetId: Types.ObjectId;
      targetPageId: Types.ObjectId | null;
      relationshipType: DocumentRelationshipKind;
      broken: boolean;
      metadata: Record<string, unknown>;
      createdBy: Types.ObjectId;
    }[] = [];
    for (const block of blocks.filter((item): item is DocumentBlockDocument => Boolean(item))) {
      const content = this.recordValue(block.content);
      const metadata = this.recordValue(block.metadata);
      for (const targetType of Object.keys(documentLinkKeys) as DocumentRelationshipTargetType[]) {
        const keys = documentLinkKeys[targetType] ?? [];
        for (const key of keys) {
          const value = content[key] ?? metadata[key];
          if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) continue;
          const targetId = toObjectId(value);
          const targetPage =
            targetType === 'page' || targetType === 'document'
              ? await this.documents.findPage(targetId)
              : null;
          relationships.push({
            workspaceId: page.workspaceId,
            sourcePageId: page._id,
            targetType,
            targetId,
            targetPageId: targetPage?._id ?? null,
            relationshipType: block.type.endsWith('_embed') ? 'embed' : 'reference',
            broken: Boolean((targetType === 'page' || targetType === 'document') && !targetPage),
            metadata: {
              source: 'block',
              blockId: block.id,
              stableId: block.stableId,
            },
            createdBy: userId,
          });
        }
      }
    }
    await this.documents.replaceAutoRelationships(page._id, relationships);
  }

  private async templateVariables(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    input: Record<string, string>,
  ): Promise<Record<string, string>> {
    const workspace = await this.workspaces.findWorkspaceById(workspaceId);
    return {
      currentDate: new Date().toISOString().slice(0, 10),
      currentUser: userId.toString(),
      workspaceName: workspace?.name ?? '',
      ...input,
    };
  }

  private isTemplateBlock(value: unknown): value is DocumentBlockSummary {
    if (!value || typeof value !== 'object') return false;
    const block = value as Partial<DocumentBlockSummary>;
    return (
      typeof block.type === 'string' &&
      typeof block.order === 'number' &&
      typeof block.content === 'object' &&
      block.content !== null
    );
  }

  private resolveTemplateRecord(
    value: Record<string, unknown>,
    variables: Record<string, string>,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        typeof entry === 'string'
          ? this.sanitizeText(
              entry.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, name: string) => variables[name] ?? ''),
              key,
            )
          : entry,
      ]),
    );
  }

  private sanitizeRecord(value: Record<string, unknown>, path: string): Record<string, unknown> {
    return this.sanitizeUnknown(value, path, 0) as Record<string, unknown>;
  }

  private recordValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private sanitizeUnknown(value: unknown, path: string, depth: number): unknown {
    if (depth > 8) throw new BadRequestError(`${path} is too deeply nested`);
    if (typeof value === 'string') return this.sanitizeText(value, path);
    if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
      if (value.length > 1000) throw new BadRequestError(`${path} contains too many items`);
      return value.map((item, index) => this.sanitizeUnknown(item, `${path}.${index}`, depth + 1));
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length > 200) throw new BadRequestError(`${path} contains too many fields`);
      return Object.fromEntries(
        entries.map(([key, entry]) => {
          if (unsafeObjectKeyPattern.test(key))
            throw new BadRequestError(`${path}.${key} is not allowed`);
          if (typeof entry === 'string' && urlLikeKeys.has(key) && !this.isSafeLink(entry)) {
            throw new BadRequestError(`${path}.${key} must be a safe URL`);
          }
          return [key, this.sanitizeUnknown(entry, `${path}.${key}`, depth + 1)];
        }),
      );
    }
    return null;
  }

  private sanitizeText(value: string, path: string): string {
    if (unsafeTextPattern.test(value)) throw new BadRequestError(`${path} contains unsafe content`);
    return value;
  }

  private isSafeLink(value: string): boolean {
    if (value.startsWith('/')) return true;
    try {
      const parsed = new URL(value);
      return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  private async uniqueSpaceSlug(workspaceId: Types.ObjectId, value: string): Promise<string> {
    const base = slugify(value);
    let candidate = base;
    let index = 1;
    while (await this.documents.findSpaceBySlug(workspaceId, candidate)) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  private async requireWorkspaceMembership(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    const membership = await this.workspaces.findMembership(workspaceId, userId);
    if (!membership || membership.status !== 'active')
      throw new ForbiddenError('Workspace access denied');
  }

  private async requireWorkspaceRole(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    roles: Set<WorkspaceRole>,
  ): Promise<void> {
    const membership = await this.workspaces.findMembership(workspaceId, userId);
    if (!membership || membership.status !== 'active' || !roles.has(membership.role)) {
      throw new ForbiddenError('Workspace access denied');
    }
  }

  private async requireSpaceRead(
    spaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentSpaceDocument> {
    const space = await this.documents.findSpace(spaceId);
    if (!space || space.archived) throw new NotFoundError('Space not found');
    await this.requireWorkspaceMembership(space.workspaceId, userId);
    if (space.visibility === 'private' && !space.ownerId.equals(userId)) {
      await this.requireWorkspaceRole(space.workspaceId, userId, manageWorkspaceRoles);
    }
    return space;
  }

  private async requireSpaceWrite(
    spaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentSpaceDocument> {
    const space = await this.requireSpaceRead(spaceId, userId);
    if (!space.ownerId.equals(userId)) {
      await this.requireWorkspaceRole(space.workspaceId, userId, manageWorkspaceRoles);
    }
    return space;
  }

  private async requireFolderWrite(
    folderId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentFolderDocument> {
    const folder = await this.documents.findFolder(folderId);
    if (!folder || folder.archived) throw new NotFoundError('Folder not found');
    await this.requireWorkspaceMembership(folder.workspaceId, userId);
    if (this.resolveFolderRole(folder, userId) !== 'owner') {
      await this.requireWorkspaceRole(folder.workspaceId, userId, manageWorkspaceRoles);
    }
    return folder;
  }

  private resolveFolderRole(
    folder: DocumentFolderDocument,
    userId: Types.ObjectId,
  ): DocumentPermissionRole {
    const permission = folder.permissions.find((item) => item.userId.equals(userId));
    return permission?.role ?? (folder.visibility === 'private' ? 'none' : 'viewer');
  }

  private async requirePageRole(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
    minimumRole: DocumentPermissionRole,
  ): Promise<DocumentPageDocument> {
    const page = await this.documents.findPage(pageId);
    if (!page || page.status === 'deleted') throw new NotFoundError('Page not found');
    if (!(await this.hasPageRole(page, userId, minimumRole))) {
      throw new ForbiddenError('Document access denied');
    }
    return page;
  }

  private async hasPageRole(
    page: DocumentPageDocument,
    userId: Types.ObjectId,
    minimumRole: DocumentPermissionRole,
  ): Promise<boolean> {
    await this.requireWorkspaceMembership(page.workspaceId, userId);
    const explicit = page.permissions.find((item) => item.userId.equals(userId))?.role;
    const role: DocumentPermissionRole =
      explicit ?? (page.ownerId.equals(userId) ? 'owner' : 'viewer');
    if (writePermissionRank[role] >= writePermissionRank[minimumRole]) return true;
    const membership = await this.workspaces.findMembership(page.workspaceId, userId);
    return Boolean(membership && manageWorkspaceRoles.has(membership.role));
  }

  private async toPageDetail(
    page: DocumentPageDocument,
    blocks: DocumentBlockDocument[],
    userId: Types.ObjectId,
  ): Promise<DocumentPageDetailSummary> {
    const safeBlocks = blocks.filter((block): block is DocumentBlockDocument => Boolean(block));
    const [backlinks, forwardLinks, watcher] = await Promise.all([
      this.documents.listRelationships({ targetPageId: page._id }),
      this.documents.listRelationships({ sourcePageId: page._id }),
      this.documents.findWatcher(page._id, userId),
    ]);
    const [readableBacklinks, readableForwardLinks] = await Promise.all([
      this.filterRelationships(backlinks, userId, page.workspaceId),
      this.filterRelationships(forwardLinks, userId, page.workspaceId),
    ]);
    return {
      ...this.toPage(page),
      blocks: safeBlocks.map((block) => this.toBlock(block)),
      breadcrumbs: await this.buildBreadcrumbs(page),
      outline: this.buildOutline(safeBlocks),
      backlinks: readableBacklinks,
      forwardLinks: readableForwardLinks,
      watcher: watcher ? this.toWatcher(watcher) : null,
    };
  }

  private buildOutline(blocks: DocumentBlockDocument[]): DocumentPageOutlineItem[] {
    const levelByType = {
      heading_1: 1,
      heading_2: 2,
      heading_3: 3,
      heading_4: 4,
    } as const;
    return blocks
      .filter((block) => block.type in levelByType)
      .map((block) => ({
        blockId: block.id,
        stableId: block.stableId,
        title: typeof block.content.text === 'string' ? block.content.text : 'Untitled heading',
        level: levelByType[block.type as keyof typeof levelByType],
      }));
  }

  private async buildBreadcrumbs(page: DocumentPageDocument) {
    const space = await this.documents.findSpace(page.spaceId);
    const crumbs: { id: string; title: string; type: 'space' | 'folder' | 'page' }[] = [];
    if (space) crumbs.push({ id: space.id, title: space.name, type: 'space' });
    if (page.folderId) {
      const folder = await this.documents.findFolder(page.folderId);
      if (folder) crumbs.push({ id: folder.id, title: folder.name, type: 'folder' });
    }
    if (page.parentPageId) {
      const parent = await this.documents.findPage(page.parentPageId);
      if (parent) crumbs.push({ id: parent.id, title: parent.title, type: 'page' });
    }
    crumbs.push({ id: page.id, title: page.title, type: 'page' });
    return crumbs;
  }

  private async record(
    workspaceId: Types.ObjectId,
    actorId: Types.ObjectId,
    event: ActivityEventName,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.activity.record({ workspaceId, actorId, event, metadata });
  }

  private emit<TData>(
    resource: RealtimeResource,
    action: RealtimeAction,
    workspaceId: string,
    actorId: Types.ObjectId,
    data: TData,
  ): void {
    realtimeService.emitMutation({
      resource,
      action,
      workspaceId,
      actorId: actorId.toString(),
      data,
    });
  }

  private async toRecentPages(
    recents: DocumentRecentPageDocument[],
    userId: Types.ObjectId,
  ): Promise<DocumentRecentPageSummary[]> {
    const summaries: DocumentRecentPageSummary[] = [];
    for (const recent of recents) {
      const page = await this.documents.findPage(recent.pageId);
      if (!page || !(await this.hasPageRole(page, userId, 'viewer'))) continue;
      summaries.push({
        id: recent.id,
        workspaceId: recent.workspaceId.toString(),
        userId: recent.userId.toString(),
        page: this.toPage(page),
        lastViewedAt: recent.lastViewedAt.toISOString(),
        lastPosition: recent.lastPosition,
      });
    }
    return summaries;
  }

  private async toPins(
    pins: DocumentPinDocument[],
    userId: Types.ObjectId,
  ): Promise<DocumentPinSummary[]> {
    const summaries: DocumentPinSummary[] = [];
    for (const pin of pins) {
      const page = await this.documents.findPage(pin.pageId);
      if (!page || !(await this.hasPageRole(page, userId, 'viewer'))) continue;
      summaries.push(this.toPin(pin, page));
    }
    return summaries;
  }

  private toFavorite(favorite: DocumentFavoriteDocument): DocumentFavoriteSummary {
    return {
      id: favorite.id,
      workspaceId: favorite.workspaceId.toString(),
      userId: favorite.userId.toString(),
      targetType: favorite.targetType,
      targetId: favorite.targetId.toString(),
      sortOrder: favorite.sortOrder,
      createdAt: favorite.createdAt.toISOString(),
    };
  }

  private toPin(pin: DocumentPinDocument, page: DocumentPageDocument): DocumentPinSummary {
    return {
      id: pin.id,
      workspaceId: pin.workspaceId.toString(),
      scope: pin.scope,
      spaceId: pin.spaceId?.toString() ?? null,
      userId: pin.userId?.toString() ?? null,
      page: this.toPage(page),
      sortOrder: pin.sortOrder,
      createdBy: pin.createdBy.toString(),
      createdAt: pin.createdAt.toISOString(),
    };
  }

  private toRelationship(relationship: DocumentRelationshipDocument): DocumentRelationshipSummary {
    return {
      id: relationship.id,
      workspaceId: relationship.workspaceId.toString(),
      sourcePageId: relationship.sourcePageId.toString(),
      targetType: relationship.targetType,
      targetId: relationship.targetId.toString(),
      targetPageId: relationship.targetPageId?.toString() ?? null,
      relationshipType: relationship.relationshipType,
      broken: relationship.broken,
      metadata: relationship.metadata,
      createdBy: relationship.createdBy.toString(),
      createdAt: relationship.createdAt.toISOString(),
      updatedAt: relationship.updatedAt.toISOString(),
    };
  }

  private toTag(tag: DocumentPageTagDocument): DocumentPageTagSummary {
    return {
      id: tag.id,
      workspaceId: tag.workspaceId.toString(),
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      description: tag.description,
      archived: tag.archived,
      createdBy: tag.createdBy.toString(),
      updatedBy: tag.updatedBy?.toString() ?? null,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
    };
  }

  private toTemplate(template: DocumentPageTemplateDocument): DocumentTemplateSummary {
    return {
      id: template.id,
      workspaceId: template.workspaceId.toString(),
      spaceId: template.spaceId?.toString() ?? null,
      name: template.name,
      category: template.category,
      description: template.description,
      icon: template.icon,
      blocks: template.blocks as DocumentBlockSummary[],
      variables: template.variables,
      favoriteCount: template.favoriteCount,
      useCount: template.useCount,
      archived: template.archived,
      createdBy: template.createdBy.toString(),
      updatedBy: template.updatedBy?.toString() ?? null,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  private toWatcher(watcher: DocumentWatcherDocument): DocumentWatcherSummary {
    return {
      id: watcher.id,
      workspaceId: watcher.workspaceId.toString(),
      pageId: watcher.pageId.toString(),
      userId: watcher.userId.toString(),
      subscription: watcher.subscription,
      createdAt: watcher.createdAt.toISOString(),
      updatedAt: watcher.updatedAt.toISOString(),
    };
  }

  private toSpace(space: DocumentSpaceDocument): DocumentSpaceSummary {
    return {
      id: space.id,
      workspaceId: space.workspaceId.toString(),
      name: space.name,
      slug: space.slug,
      description: space.description,
      icon: space.icon,
      color: space.color,
      banner: space.banner,
      homepagePageId: space.homepagePageId?.toString() ?? null,
      defaultTemplateId: space.defaultTemplateId?.toString() ?? null,
      defaultPermissions: space.defaultPermissions.map((permission) => ({
        userId: permission.userId.toString(),
        role: permission.role,
      })),
      archived: space.archived,
      visibility: space.visibility,
      ownerId: space.ownerId.toString(),
      createdBy: space.createdBy.toString(),
      updatedBy: space.updatedBy?.toString() ?? null,
      createdAt: space.createdAt.toISOString(),
      updatedAt: space.updatedAt.toISOString(),
    };
  }

  private toFolder(folder: DocumentFolderDocument): DocumentFolderSummary {
    return {
      id: folder.id,
      workspaceId: folder.workspaceId.toString(),
      spaceId: folder.spaceId.toString(),
      parentFolderId: folder.parentFolderId?.toString() ?? null,
      name: folder.name,
      slug: folder.slug,
      description: folder.description,
      icon: folder.icon,
      order: folder.order,
      archived: folder.archived,
      visibility: folder.visibility,
      permissions: folder.permissions.map((permission) => ({
        userId: permission.userId.toString(),
        role: permission.role,
      })),
      createdBy: folder.createdBy.toString(),
      updatedBy: folder.updatedBy?.toString() ?? null,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    };
  }

  private toPage(page: DocumentPageDocument): DocumentPageSummary {
    return {
      id: page.id,
      workspaceId: page.workspaceId.toString(),
      spaceId: page.spaceId.toString(),
      folderId: page.folderId?.toString() ?? null,
      parentPageId: page.parentPageId?.toString() ?? null,
      title: page.title,
      slug: page.slug,
      status: page.status,
      icon: page.icon,
      coverImage: page.coverImage,
      summary: page.summary,
      properties: page.properties,
      tagIds: page.tagIds.map((tagId) => tagId.toString()),
      currentVersion: page.currentVersion,
      publishedVersion: page.publishedVersion,
      archived: page.archived,
      deletedAt: page.deletedAt?.toISOString() ?? null,
      ownerId: page.ownerId.toString(),
      createdBy: page.createdBy.toString(),
      updatedBy: page.updatedBy?.toString() ?? null,
      permissions: page.permissions.map((permission) => ({
        userId: permission.userId.toString(),
        role: permission.role,
      })),
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  private toBlock(block: DocumentBlockDocument): DocumentBlockSummary {
    return {
      id: block.id,
      stableId: block.stableId,
      pageId: block.pageId?.toString() ?? '',
      parentBlockId: block.parentBlockId?.toString() ?? null,
      type: block.type,
      order: block.order,
      content: this.recordValue(block.content),
      metadata: this.recordValue(block.metadata),
      createdBy: block.createdBy.toString(),
      updatedBy: block.updatedBy?.toString() ?? null,
      createdAt: block.createdAt.toISOString(),
      updatedAt: block.updatedAt.toISOString(),
    };
  }

  private toVersion(version: DocumentVersionDocument): DocumentVersionSummary {
    return {
      id: version.id,
      pageId: version.pageId.toString(),
      version: version.version,
      editorId: version.editorId.toString(),
      summary: version.summary,
      blockSnapshot: version.blockSnapshot as DocumentBlockSummary[],
      metadata: version.metadata,
      createdAt: version.createdAt.toISOString(),
    };
  }

  private toComment(comment: DocumentCommentDocument): DocumentCommentSummary {
    return {
      id: comment.id,
      pageId: comment.pageId.toString(),
      blockId: comment.blockId?.toString() ?? null,
      parentCommentId: comment.parentCommentId?.toString() ?? null,
      authorId: comment.authorId.toString(),
      content: comment.content,
      mentionedUserIds: comment.mentionedUserIds.map((id) => id.toString()),
      resolved: comment.resolved,
      editedAt: comment.editedAt?.toISOString() ?? null,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }
}

export const documentService = new DocumentService();
