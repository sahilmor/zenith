import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { rateLimit } from '../../../middleware/security.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { env } from '../../../config/env.js';
import {
  archivePage,
  bulkOperateDocuments,
  cleanupDocumentOperations,
  createRelationship,
  createComment,
  createFolder,
  createPage,
  createSpace,
  createTag,
  createTemplate,
  deletePage,
  deleteDocumentMedia,
  exportDocument,
  favoriteTarget,
  getDocumentRetentionPolicy,
  getKnowledgeHome,
  getPage,
  getSpaceTree,
  importDocument,
  listDocumentMedia,
  listBacklinks,
  listComments,
  listFavorites,
  listRelationships,
  listSpaces,
  listTags,
  listTemplates,
  listVersions,
  pinPage,
  publishPage,
  restorePage,
  saveBlocks,
  synchronizeDocuments,
  unfavoriteTarget,
  updateDocumentMedia,
  updateComment,
  updatePage,
  updateDocumentRetentionPolicy,
  uploadDocumentMedia,
  useTemplate,
  watchPage,
  unwatchPage,
} from '../controllers/document.controller.js';
import {
  bulkDocumentSchema,
  createRelationshipSchema,
  createCommentSchema,
  createFolderSchema,
  createPageSchema,
  createSpaceSchema,
  createTagSchema,
  createTemplateSchema,
  favoriteTargetSchema,
  exportDocumentSchema,
  importDocumentSchema,
  knowledgeHomeSchema,
  listMediaSchema,
  listFavoritesSchema,
  listTagsSchema,
  listTemplatesSchema,
  listSpaceChildrenSchema,
  listSpacesSchema,
  documentSyncSchema,
  mediaParamsSchema,
  pageParamsSchema,
  pinPageSchema,
  retentionPolicySchema,
  saveBlocksSchema,
  unfavoriteTargetSchema,
  updateMediaSchema,
  updateCommentSchema,
  updatePageSchema,
  updateRetentionPolicySchema,
  uploadMediaSchema,
  useTemplateSchema,
  watchPageSchema,
} from '../validation/document.validation.js';
import { attachmentUpload, documentImportUpload } from '../../../middleware/upload.middleware.js';

export const documentRouter = Router();
const documentOperationRateLimit = rateLimit(
  env.DOCUMENT_OPERATION_RATE_LIMIT_MAX,
  env.DOCUMENT_OPERATION_RATE_LIMIT_WINDOW_MS,
);
const documentHeavyOperationRateLimit = rateLimit(
  env.DOCUMENT_HEAVY_OPERATION_RATE_LIMIT_MAX,
  env.DOCUMENT_HEAVY_OPERATION_RATE_LIMIT_WINDOW_MS,
);

documentRouter.use(verifyToken);

documentRouter.get(
  '/workspaces/:workspaceId/knowledge-home',
  validate(knowledgeHomeSchema),
  getKnowledgeHome,
);
documentRouter.get('/workspaces/:workspaceId/spaces', validate(listSpacesSchema), listSpaces);
documentRouter.post('/workspaces/:workspaceId/spaces', validate(createSpaceSchema), createSpace);
documentRouter.get(
  '/workspaces/:workspaceId/document-favorites',
  validate(listFavoritesSchema),
  listFavorites,
);
documentRouter.post('/document-favorites', validate(favoriteTargetSchema), favoriteTarget);
documentRouter.get(
  '/documents/export',
  documentHeavyOperationRateLimit,
  validate(exportDocumentSchema),
  exportDocument,
);
documentRouter.delete(
  '/document-favorites/:targetType/:targetId',
  validate(unfavoriteTargetSchema),
  unfavoriteTarget,
);
documentRouter.post(
  '/workspaces/:workspaceId/documents/sync',
  documentOperationRateLimit,
  validate(documentSyncSchema),
  synchronizeDocuments,
);
documentRouter.post(
  '/workspaces/:workspaceId/documents/import',
  documentHeavyOperationRateLimit,
  documentImportUpload.single('file'),
  validate(importDocumentSchema),
  importDocument,
);
documentRouter.post(
  '/workspaces/:workspaceId/documents/bulk',
  documentHeavyOperationRateLimit,
  validate(bulkDocumentSchema),
  bulkOperateDocuments,
);
documentRouter.get('/workspaces/:workspaceId/media', validate(listMediaSchema), listDocumentMedia);
documentRouter.post(
  '/workspaces/:workspaceId/media',
  documentHeavyOperationRateLimit,
  attachmentUpload.single('file'),
  validate(uploadMediaSchema),
  uploadDocumentMedia,
);
documentRouter.get(
  '/workspaces/:workspaceId/document-retention-policy',
  validate(retentionPolicySchema),
  getDocumentRetentionPolicy,
);
documentRouter.patch(
  '/workspaces/:workspaceId/document-retention-policy',
  documentHeavyOperationRateLimit,
  validate(updateRetentionPolicySchema),
  updateDocumentRetentionPolicy,
);
documentRouter.post(
  '/documents/cleanup',
  documentHeavyOperationRateLimit,
  cleanupDocumentOperations,
);
documentRouter.patch(
  '/media/:mediaId',
  documentOperationRateLimit,
  validate(updateMediaSchema),
  updateDocumentMedia,
);
documentRouter.delete(
  '/media/:mediaId',
  documentHeavyOperationRateLimit,
  validate(mediaParamsSchema),
  deleteDocumentMedia,
);
documentRouter.get('/workspaces/:workspaceId/document-tags', validate(listTagsSchema), listTags);
documentRouter.post('/workspaces/:workspaceId/document-tags', validate(createTagSchema), createTag);
documentRouter.get(
  '/workspaces/:workspaceId/document-templates',
  validate(listTemplatesSchema),
  listTemplates,
);
documentRouter.post(
  '/workspaces/:workspaceId/document-templates',
  validate(createTemplateSchema),
  createTemplate,
);
documentRouter.post(
  '/document-templates/:templateId/use',
  validate(useTemplateSchema),
  useTemplate,
);
documentRouter.get('/spaces/:spaceId/tree', validate(listSpaceChildrenSchema), getSpaceTree);
documentRouter.post('/spaces/:spaceId/folders', validate(createFolderSchema), createFolder);
documentRouter.post('/spaces/:spaceId/pages', validate(createPageSchema), createPage);
documentRouter.get('/pages/:pageId', validate(pageParamsSchema), getPage);
documentRouter.patch('/pages/:pageId', validate(updatePageSchema), updatePage);
documentRouter.delete('/pages/:pageId', validate(pageParamsSchema), deletePage);
documentRouter.post('/pages/:pageId/archive', validate(pageParamsSchema), archivePage);
documentRouter.post('/pages/:pageId/restore', validate(pageParamsSchema), restorePage);
documentRouter.post('/pages/:pageId/publish', validate(pageParamsSchema), publishPage);
documentRouter.post('/pages/:pageId/pins', validate(pinPageSchema), pinPage);
documentRouter.get('/pages/:pageId/relationships', validate(pageParamsSchema), listRelationships);
documentRouter.post(
  '/pages/:pageId/relationships',
  validate(createRelationshipSchema),
  createRelationship,
);
documentRouter.get('/pages/:pageId/backlinks', validate(pageParamsSchema), listBacklinks);
documentRouter.post('/pages/:pageId/watch', validate(watchPageSchema), watchPage);
documentRouter.delete('/pages/:pageId/watch', validate(pageParamsSchema), unwatchPage);
documentRouter.put(
  '/pages/:pageId/blocks',
  documentOperationRateLimit,
  validate(saveBlocksSchema),
  saveBlocks,
);
documentRouter.get('/pages/:pageId/versions', validate(pageParamsSchema), listVersions);
documentRouter.get('/pages/:pageId/comments', validate(pageParamsSchema), listComments);
documentRouter.post('/pages/:pageId/comments', validate(createCommentSchema), createComment);
documentRouter.patch('/document-comments/:commentId', validate(updateCommentSchema), updateComment);
