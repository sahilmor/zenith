import type { Types } from 'mongoose';
import { DocumentBlockModel, type DocumentBlockDocument } from '../models/document-block.model.js';
import {
  DocumentCommentModel,
  type DocumentCommentDocument,
} from '../models/document-comment.model.js';
import {
  DocumentFolderModel,
  type DocumentFolderDocument,
} from '../models/document-folder.model.js';
import { DocumentPageModel, type DocumentPageDocument } from '../models/document-page.model.js';
import { DocumentSpaceModel, type DocumentSpaceDocument } from '../models/document-space.model.js';
import {
  DocumentVersionModel,
  type DocumentVersionDocument,
} from '../models/document-version.model.js';
import {
  DocumentFavoriteModel,
  type DocumentFavoriteDocument,
  DocumentPageTagModel,
  type DocumentPageTagDocument,
  DocumentPageTemplateModel,
  type DocumentPageTemplateDocument,
  DocumentPinModel,
  type DocumentPinDocument,
  DocumentRecentPageModel,
  type DocumentRecentPageDocument,
  DocumentRelationshipModel,
  type DocumentRelationshipDocument,
  DocumentWatcherModel,
  type DocumentWatcherDocument,
} from '../models/document-navigation.model.js';

export class DocumentRepository {
  public async createSpace(input: Partial<DocumentSpaceDocument>): Promise<DocumentSpaceDocument> {
    return DocumentSpaceModel.create(input) as Promise<DocumentSpaceDocument>;
  }

  public async listSpaces(workspaceId: Types.ObjectId): Promise<DocumentSpaceDocument[]> {
    return DocumentSpaceModel.find({ workspaceId, archived: false })
      .sort({ updatedAt: -1 })
      .exec() as Promise<DocumentSpaceDocument[]>;
  }

  public async findSpace(id: Types.ObjectId): Promise<DocumentSpaceDocument | null> {
    return DocumentSpaceModel.findById(id).exec() as Promise<DocumentSpaceDocument | null>;
  }

  public async findSpaceBySlug(
    workspaceId: Types.ObjectId,
    slug: string,
  ): Promise<DocumentSpaceDocument | null> {
    return DocumentSpaceModel.findOne({
      workspaceId,
      slug,
    }).exec() as Promise<DocumentSpaceDocument | null>;
  }

  public async createFolder(
    input: Partial<DocumentFolderDocument>,
  ): Promise<DocumentFolderDocument> {
    return DocumentFolderModel.create(input) as Promise<DocumentFolderDocument>;
  }

  public async listFolders(input: {
    spaceId: Types.ObjectId;
    parentFolderId?: Types.ObjectId | null;
  }): Promise<DocumentFolderDocument[]> {
    return DocumentFolderModel.find({
      spaceId: input.spaceId,
      parentFolderId: input.parentFolderId ?? null,
      archived: false,
    })
      .sort({ order: 1, createdAt: 1 })
      .exec() as Promise<DocumentFolderDocument[]>;
  }

  public async findFolder(id: Types.ObjectId): Promise<DocumentFolderDocument | null> {
    return DocumentFolderModel.findById(id).exec() as Promise<DocumentFolderDocument | null>;
  }

  public async createPage(input: Partial<DocumentPageDocument>): Promise<DocumentPageDocument> {
    return DocumentPageModel.create(input) as Promise<DocumentPageDocument>;
  }

  public async updatePage(
    id: Types.ObjectId,
    update: Partial<DocumentPageDocument>,
  ): Promise<DocumentPageDocument | null> {
    return DocumentPageModel.findByIdAndUpdate(id, update, {
      new: true,
    }).exec() as Promise<DocumentPageDocument | null>;
  }

  public async findPage(id: Types.ObjectId): Promise<DocumentPageDocument | null> {
    return DocumentPageModel.findOne({
      _id: id,
      status: { $ne: 'deleted' },
    }).exec() as Promise<DocumentPageDocument | null>;
  }

  public async listPages(input: {
    workspaceId?: Types.ObjectId;
    spaceId?: Types.ObjectId;
    folderId?: Types.ObjectId | null;
    parentPageId?: Types.ObjectId | null;
    ids?: Types.ObjectId[];
    limit?: number;
  }): Promise<DocumentPageDocument[]> {
    return DocumentPageModel.find({
      ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
      ...(input.spaceId ? { spaceId: input.spaceId } : {}),
      ...(input.folderId !== undefined ? { folderId: input.folderId } : {}),
      ...(input.parentPageId !== undefined ? { parentPageId: input.parentPageId } : {}),
      ...(input.ids ? { _id: { $in: input.ids } } : {}),
      status: { $ne: 'deleted' },
    })
      .sort({ updatedAt: -1 })
      .limit(input.limit ?? 0)
      .exec() as Promise<DocumentPageDocument[]>;
  }

  public async createBlocks(
    blocks: Partial<DocumentBlockDocument>[],
  ): Promise<DocumentBlockDocument[]> {
    return DocumentBlockModel.insertMany(blocks) as Promise<DocumentBlockDocument[]>;
  }

  public async replacePageBlocks(
    pageId: Types.ObjectId,
    blocks: Partial<DocumentBlockDocument>[],
  ): Promise<DocumentBlockDocument[]> {
    await DocumentBlockModel.deleteMany({ pageId }).exec();
    if (blocks.length === 0) return [];
    return this.createBlocks(blocks);
  }

  public async listBlocks(pageId: Types.ObjectId): Promise<DocumentBlockDocument[]> {
    return DocumentBlockModel.find({ pageId })
      .sort({ parentBlockId: 1, order: 1, createdAt: 1 })
      .exec() as Promise<DocumentBlockDocument[]>;
  }

  public async findBlock(id: Types.ObjectId): Promise<DocumentBlockDocument | null> {
    return DocumentBlockModel.findById(id).exec() as Promise<DocumentBlockDocument | null>;
  }

  public async createVersion(
    input: Partial<DocumentVersionDocument>,
  ): Promise<DocumentVersionDocument> {
    return DocumentVersionModel.create(input) as Promise<DocumentVersionDocument>;
  }

  public async listVersions(pageId: Types.ObjectId): Promise<DocumentVersionDocument[]> {
    return DocumentVersionModel.find({ pageId }).sort({ version: -1 }).exec() as Promise<
      DocumentVersionDocument[]
    >;
  }

  public async createComment(
    input: Partial<DocumentCommentDocument>,
  ): Promise<DocumentCommentDocument> {
    return DocumentCommentModel.create(input) as Promise<DocumentCommentDocument>;
  }

  public async updateComment(
    id: Types.ObjectId,
    update: Partial<DocumentCommentDocument>,
  ): Promise<DocumentCommentDocument | null> {
    return DocumentCommentModel.findByIdAndUpdate(id, update, {
      new: true,
    }).exec() as Promise<DocumentCommentDocument | null>;
  }

  public async findComment(id: Types.ObjectId): Promise<DocumentCommentDocument | null> {
    return DocumentCommentModel.findById(id).exec() as Promise<DocumentCommentDocument | null>;
  }

  public async listComments(pageId: Types.ObjectId): Promise<DocumentCommentDocument[]> {
    return DocumentCommentModel.find({ pageId }).sort({ createdAt: 1 }).exec() as Promise<
      DocumentCommentDocument[]
    >;
  }

  public async upsertFavorite(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    targetType: DocumentFavoriteDocument['targetType'];
    targetId: Types.ObjectId;
    sortOrder: number;
  }): Promise<DocumentFavoriteDocument> {
    return DocumentFavoriteModel.findOneAndUpdate(
      { userId: input.userId, targetType: input.targetType, targetId: input.targetId },
      { $setOnInsert: input },
      { upsert: true, new: true },
    ).exec() as Promise<DocumentFavoriteDocument>;
  }

  public async deleteFavorite(input: {
    userId: Types.ObjectId;
    targetType: DocumentFavoriteDocument['targetType'];
    targetId: Types.ObjectId;
  }): Promise<void> {
    await DocumentFavoriteModel.deleteOne(input).exec();
  }

  public async listFavorites(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    limit?: number;
  }): Promise<DocumentFavoriteDocument[]> {
    return DocumentFavoriteModel.find({ workspaceId: input.workspaceId, userId: input.userId })
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(input.limit ?? 50)
      .exec() as Promise<DocumentFavoriteDocument[]>;
  }

  public async upsertRecentPage(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    pageId: Types.ObjectId;
    lastPosition?: Record<string, unknown> | null;
  }): Promise<DocumentRecentPageDocument> {
    return DocumentRecentPageModel.findOneAndUpdate(
      { userId: input.userId, pageId: input.pageId },
      {
        $set: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          pageId: input.pageId,
          lastViewedAt: new Date(),
          lastPosition: input.lastPosition ?? null,
        },
      },
      { upsert: true, new: true },
    ).exec() as Promise<DocumentRecentPageDocument>;
  }

  public async listRecentPages(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    limit?: number;
  }): Promise<DocumentRecentPageDocument[]> {
    return DocumentRecentPageModel.find({ workspaceId: input.workspaceId, userId: input.userId })
      .sort({ lastViewedAt: -1 })
      .limit(input.limit ?? 20)
      .exec() as Promise<DocumentRecentPageDocument[]>;
  }

  public async upsertPin(input: {
    workspaceId: Types.ObjectId;
    scope: DocumentPinDocument['scope'];
    spaceId: Types.ObjectId | null;
    userId: Types.ObjectId | null;
    pageId: Types.ObjectId;
    sortOrder: number;
    createdBy: Types.ObjectId;
  }): Promise<DocumentPinDocument> {
    return DocumentPinModel.findOneAndUpdate(
      {
        workspaceId: input.workspaceId,
        scope: input.scope,
        spaceId: input.spaceId,
        userId: input.userId,
        pageId: input.pageId,
      },
      { $setOnInsert: input },
      { upsert: true, new: true },
    ).exec() as Promise<DocumentPinDocument>;
  }

  public async listPins(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    spaceId?: Types.ObjectId | null;
    limit?: number;
  }): Promise<DocumentPinDocument[]> {
    return DocumentPinModel.find({
      workspaceId: input.workspaceId,
      $or: [
        { scope: 'workspace' },
        ...(input.spaceId ? [{ scope: 'space', spaceId: input.spaceId }] : []),
        { scope: 'personal', userId: input.userId },
      ],
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(input.limit ?? 20)
      .exec() as Promise<DocumentPinDocument[]>;
  }

  public async upsertRelationship(
    input: Partial<DocumentRelationshipDocument> & {
      sourcePageId: Types.ObjectId;
      targetType: DocumentRelationshipDocument['targetType'];
      targetId: Types.ObjectId;
      relationshipType: DocumentRelationshipDocument['relationshipType'];
    },
  ): Promise<DocumentRelationshipDocument> {
    return DocumentRelationshipModel.findOneAndUpdate(
      {
        sourcePageId: input.sourcePageId,
        targetType: input.targetType,
        targetId: input.targetId,
        relationshipType: input.relationshipType,
      },
      { $set: input },
      { upsert: true, new: true },
    ).exec() as Promise<DocumentRelationshipDocument>;
  }

  public async replaceAutoRelationships(
    sourcePageId: Types.ObjectId,
    relationships: Partial<DocumentRelationshipDocument>[],
  ): Promise<DocumentRelationshipDocument[]> {
    await DocumentRelationshipModel.deleteMany({
      sourcePageId,
      'metadata.source': 'block',
    }).exec();
    if (relationships.length === 0) return [];
    return DocumentRelationshipModel.insertMany(relationships) as Promise<
      DocumentRelationshipDocument[]
    >;
  }

  public async listRelationships(input: {
    sourcePageId?: Types.ObjectId;
    targetPageId?: Types.ObjectId;
  }): Promise<DocumentRelationshipDocument[]> {
    return DocumentRelationshipModel.find({
      ...(input.sourcePageId ? { sourcePageId: input.sourcePageId } : {}),
      ...(input.targetPageId ? { targetPageId: input.targetPageId } : {}),
    })
      .sort({ createdAt: -1 })
      .exec() as Promise<DocumentRelationshipDocument[]>;
  }

  public async createTag(
    input: Partial<DocumentPageTagDocument>,
  ): Promise<DocumentPageTagDocument> {
    return DocumentPageTagModel.create(input) as Promise<DocumentPageTagDocument>;
  }

  public async listTags(workspaceId: Types.ObjectId): Promise<DocumentPageTagDocument[]> {
    return DocumentPageTagModel.find({ workspaceId, archived: false })
      .sort({ name: 1 })
      .exec() as Promise<DocumentPageTagDocument[]>;
  }

  public async findTagBySlug(
    workspaceId: Types.ObjectId,
    slug: string,
  ): Promise<DocumentPageTagDocument | null> {
    return DocumentPageTagModel.findOne({
      workspaceId,
      slug,
    }).exec() as Promise<DocumentPageTagDocument | null>;
  }

  public async createTemplate(
    input: Partial<DocumentPageTemplateDocument>,
  ): Promise<DocumentPageTemplateDocument> {
    return DocumentPageTemplateModel.create(input) as Promise<DocumentPageTemplateDocument>;
  }

  public async listTemplates(input: {
    workspaceId: Types.ObjectId;
    spaceId?: Types.ObjectId | null;
  }): Promise<DocumentPageTemplateDocument[]> {
    return DocumentPageTemplateModel.find({
      workspaceId: input.workspaceId,
      archived: false,
      ...(input.spaceId !== undefined
        ? { $or: [{ spaceId: null }, ...(input.spaceId ? [{ spaceId: input.spaceId }] : [])] }
        : {}),
    })
      .sort({ category: 1, name: 1 })
      .exec() as Promise<DocumentPageTemplateDocument[]>;
  }

  public async findTemplate(id: Types.ObjectId): Promise<DocumentPageTemplateDocument | null> {
    return DocumentPageTemplateModel.findById(
      id,
    ).exec() as Promise<DocumentPageTemplateDocument | null>;
  }

  public async incrementTemplateUse(id: Types.ObjectId): Promise<void> {
    await DocumentPageTemplateModel.updateOne({ _id: id }, { $inc: { useCount: 1 } }).exec();
  }

  public async upsertWatcher(input: {
    workspaceId: Types.ObjectId;
    pageId: Types.ObjectId;
    userId: Types.ObjectId;
    subscription: DocumentWatcherDocument['subscription'];
  }): Promise<DocumentWatcherDocument> {
    return DocumentWatcherModel.findOneAndUpdate(
      { pageId: input.pageId, userId: input.userId },
      { $set: input },
      { upsert: true, new: true },
    ).exec() as Promise<DocumentWatcherDocument>;
  }

  public async deleteWatcher(pageId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    await DocumentWatcherModel.deleteOne({ pageId, userId }).exec();
  }

  public async findWatcher(
    pageId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<DocumentWatcherDocument | null> {
    return DocumentWatcherModel.findOne({
      pageId,
      userId,
    }).exec() as Promise<DocumentWatcherDocument | null>;
  }
}
