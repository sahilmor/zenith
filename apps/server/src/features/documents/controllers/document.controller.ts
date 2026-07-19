import { Types } from 'mongoose';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { ForbiddenError, UnauthorizedError } from '../../../utils/app-error.js';
import { documentService } from '../services/document.service.js';
import { documentOperationsService } from '../services/document-operations.service.js';
import type { ListMediaInput } from '../validation/document.validation.js';

const userId = (request: { user?: { _id: Types.ObjectId } }): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

export const createSpace = asyncHandler(async (request, response) => {
  const space = await documentService.createSpace(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Space created', space);
});

export const listSpaces = asyncHandler(async (request, response) => {
  const spaces = await documentService.listSpaces(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
  );
  sendSuccess(response, 200, 'Spaces retrieved', spaces);
});

export const getKnowledgeHome = asyncHandler(async (request, response) => {
  const home = await documentService.getKnowledgeHome(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
  );
  sendSuccess(response, 200, 'Knowledge home retrieved', home);
});

export const favoriteTarget = asyncHandler(async (request, response) => {
  const favorite = await documentService.favoriteTarget(userId(request), request.body);
  sendSuccess(response, 201, 'Favorite saved', favorite);
});

export const unfavoriteTarget = asyncHandler(async (request, response) => {
  await documentService.unfavoriteTarget(
    userId(request),
    request.params.targetType as 'page' | 'space' | 'template',
    new Types.ObjectId(request.params.targetId),
  );
  sendSuccess(response, 200, 'Favorite removed');
});

export const listFavorites = asyncHandler(async (request, response) => {
  const favorites = await documentService.listFavorites(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
  );
  sendSuccess(response, 200, 'Favorites retrieved', favorites);
});

export const createFolder = asyncHandler(async (request, response) => {
  const folder = await documentService.createFolder(
    new Types.ObjectId(request.params.spaceId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Folder created', folder);
});

export const getSpaceTree = asyncHandler(async (request, response) => {
  const tree = await documentService.getTree(
    new Types.ObjectId(request.params.spaceId),
    userId(request),
    request.query,
  );
  sendSuccess(response, 200, 'Space tree retrieved', tree);
});

export const createPage = asyncHandler(async (request, response) => {
  const page = await documentService.createPage(
    new Types.ObjectId(request.params.spaceId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Page created', page);
});

export const pinPage = asyncHandler(async (request, response) => {
  const pin = await documentService.pinPage(
    new Types.ObjectId(request.params.pageId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Page pinned', pin);
});

export const createRelationship = asyncHandler(async (request, response) => {
  const relationship = await documentService.createRelationship(
    new Types.ObjectId(request.params.pageId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Relationship created', relationship);
});

export const listRelationships = asyncHandler(async (request, response) => {
  const relationships = await documentService.listRelationships(
    new Types.ObjectId(request.params.pageId),
    userId(request),
  );
  sendSuccess(response, 200, 'Relationships retrieved', relationships);
});

export const listBacklinks = asyncHandler(async (request, response) => {
  const backlinks = await documentService.listBacklinks(
    new Types.ObjectId(request.params.pageId),
    userId(request),
  );
  sendSuccess(response, 200, 'Backlinks retrieved', backlinks);
});

export const getPage = asyncHandler(async (request, response) => {
  const page = await documentService.getPage(
    new Types.ObjectId(request.params.pageId),
    userId(request),
  );
  sendSuccess(response, 200, 'Page retrieved', page);
});

export const updatePage = asyncHandler(async (request, response) => {
  const page = await documentService.updatePage(
    new Types.ObjectId(request.params.pageId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Page updated', page);
});

export const saveBlocks = asyncHandler(async (request, response) => {
  const blocks = await documentService.saveBlocks(
    new Types.ObjectId(request.params.pageId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Blocks saved', blocks);
});

export const publishPage = asyncHandler(async (request, response) => {
  const version = await documentService.publishPage(
    new Types.ObjectId(request.params.pageId),
    userId(request),
    typeof request.body.summary === 'string' ? request.body.summary : null,
  );
  sendSuccess(response, 200, 'Page published', version);
});

export const archivePage = asyncHandler(async (request, response) => {
  const page = await documentService.archivePage(
    new Types.ObjectId(request.params.pageId),
    userId(request),
  );
  sendSuccess(response, 200, 'Page archived', page);
});

export const restorePage = asyncHandler(async (request, response) => {
  const page = await documentService.restorePage(
    new Types.ObjectId(request.params.pageId),
    userId(request),
  );
  sendSuccess(response, 200, 'Page restored', page);
});

export const deletePage = asyncHandler(async (request, response) => {
  await documentService.deletePage(new Types.ObjectId(request.params.pageId), userId(request));
  sendSuccess(response, 200, 'Page deleted');
});

export const listVersions = asyncHandler(async (request, response) => {
  const versions = await documentService.listVersions(
    new Types.ObjectId(request.params.pageId),
    userId(request),
  );
  sendSuccess(response, 200, 'Versions retrieved', versions);
});

export const createComment = asyncHandler(async (request, response) => {
  const comment = await documentService.createComment(
    new Types.ObjectId(request.params.pageId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Comment created', comment);
});

export const listComments = asyncHandler(async (request, response) => {
  const comments = await documentService.listComments(
    new Types.ObjectId(request.params.pageId),
    userId(request),
  );
  sendSuccess(response, 200, 'Comments retrieved', comments);
});

export const updateComment = asyncHandler(async (request, response) => {
  const comment = await documentService.updateComment(
    new Types.ObjectId(request.params.commentId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Comment updated', comment);
});

export const createTag = asyncHandler(async (request, response) => {
  const tag = await documentService.createTag(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Tag created', tag);
});

export const listTags = asyncHandler(async (request, response) => {
  const tags = await documentService.listTags(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
  );
  sendSuccess(response, 200, 'Tags retrieved', tags);
});

export const createTemplate = asyncHandler(async (request, response) => {
  const template = await documentService.createTemplate(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Template created', template);
});

export const listTemplates = asyncHandler(async (request, response) => {
  const templates = await documentService.listTemplates(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
    typeof request.query.spaceId === 'string' ? new Types.ObjectId(request.query.spaceId) : null,
  );
  sendSuccess(response, 200, 'Templates retrieved', templates);
});

export const useTemplate = asyncHandler(async (request, response) => {
  const page = await documentService.createPageFromTemplate(
    new Types.ObjectId(request.params.templateId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Page created from template', page);
});

export const watchPage = asyncHandler(async (request, response) => {
  const watcher = await documentService.watchPage(
    new Types.ObjectId(request.params.pageId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Page watch updated', watcher);
});

export const unwatchPage = asyncHandler(async (request, response) => {
  await documentService.unwatchPage(new Types.ObjectId(request.params.pageId), userId(request));
  sendSuccess(response, 200, 'Page watch removed');
});

export const synchronizeDocuments = asyncHandler(async (request, response) => {
  const result = await documentOperationsService.synchronize(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Document sync completed', result);
});

export const importDocument = asyncHandler(async (request, response) => {
  const result = await documentOperationsService.importDocument(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
    request.body,
    request.file,
    request.requestId ?? null,
  );
  sendSuccess(response, 201, 'Document imported', result);
});

export const exportDocument = asyncHandler(async (request, response) => {
  const result = await documentOperationsService.exportDocument(
    userId(request),
    {
      pageId: String(request.query.pageId),
      format: request.query.format as 'markdown' | 'html' | 'pdf' | 'text' | 'json',
    },
    request.requestId ?? null,
  );
  response.setHeader('Content-Type', result.summary.contentType);
  response.setHeader('Content-Disposition', `attachment; filename="${result.summary.fileName}"`);
  response.setHeader('Content-Length', result.summary.size.toString());
  response.status(200).send(result.buffer);
});

export const bulkOperateDocuments = asyncHandler(async (request, response) => {
  const result = await documentOperationsService.bulkOperate(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
    request.body,
    request.requestId ?? null,
  );
  sendSuccess(response, 200, 'Bulk document operation completed', result);
});

export const uploadDocumentMedia = asyncHandler(async (request, response) => {
  const result = await documentOperationsService.uploadMedia(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
    request.file,
    typeof request.body.pageId === 'string' ? request.body.pageId : null,
    request.requestId ?? null,
  );
  sendSuccess(response, 201, 'Media uploaded', result);
});

export const listDocumentMedia = asyncHandler(async (request, response) => {
  const result = await documentOperationsService.listMedia(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
    request.query as unknown as ListMediaInput,
  );
  sendSuccess(response, 200, 'Media assets retrieved', result);
});

export const updateDocumentMedia = asyncHandler(async (request, response) => {
  const result = await documentOperationsService.updateMedia(
    new Types.ObjectId(request.params.mediaId),
    userId(request),
    request.body,
    request.requestId ?? null,
  );
  sendSuccess(response, 200, 'Media updated', result);
});

export const deleteDocumentMedia = asyncHandler(async (request, response) => {
  await documentOperationsService.deleteMedia(
    new Types.ObjectId(request.params.mediaId),
    userId(request),
    request.requestId ?? null,
  );
  sendSuccess(response, 200, 'Media deleted');
});

export const getDocumentRetentionPolicy = asyncHandler(async (request, response) => {
  const result = await documentOperationsService.getRetentionPolicy(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
  );
  sendSuccess(response, 200, 'Retention policy retrieved', result);
});

export const updateDocumentRetentionPolicy = asyncHandler(async (request, response) => {
  const result = await documentOperationsService.updateRetentionPolicy(
    new Types.ObjectId(request.params.workspaceId),
    userId(request),
    request.body,
    request.requestId ?? null,
  );
  sendSuccess(response, 200, 'Retention policy updated', result);
});

export const cleanupDocumentOperations = asyncHandler(async (request, response) => {
  if (request.user?.role !== 'admin') throw new ForbiddenError('Admin access required');
  const result = await documentOperationsService.cleanupExpiredExports(request.requestId ?? null);
  sendSuccess(response, 200, 'Document cleanup completed', result);
});
