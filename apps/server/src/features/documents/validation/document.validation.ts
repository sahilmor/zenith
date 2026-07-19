import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const slug = z
  .string()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const documentBlockTypes = [
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
] as const;

const permissionSchema = z.object({
  userId: objectId,
  role: z.enum(['owner', 'editor', 'commenter', 'viewer', 'none']),
});
const favoriteTargetTypeSchema = z.enum(['page', 'space', 'template']);
const pinScopeSchema = z.enum(['workspace', 'space', 'personal']);
const relationshipTargetTypeSchema = z.enum([
  'page',
  'task',
  'project',
  'goal',
  'incident',
  'form',
  'template',
  'document',
  'file',
]);
const relationshipTypeSchema = z.enum([
  'related_to',
  'depends_on',
  'parent_of',
  'child_of',
  'reference',
  'supersedes',
  'embed',
]);
const subscriptionSchema = z.enum([
  'all_updates',
  'major_updates',
  'comments_only',
  'mentions_only',
  'mute',
]);

const blockSchema = z.object({
  stableId: z.string().min(1).max(80).optional(),
  parentBlockId: objectId.nullable().optional(),
  type: z.enum(documentBlockTypes),
  order: z.number().int().nonnegative(),
  content: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({}),
});
const blocksSchema = z.array(blockSchema).max(500);

export const createSpaceSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    name: z.string().min(1).max(120),
    slug: slug.optional(),
    description: z.string().max(500).nullable().optional(),
    icon: z.string().max(32).nullable().optional(),
    color: z.string().max(32).nullable().optional(),
    banner: z.string().url().nullable().optional(),
    homepagePageId: objectId.nullable().optional(),
    defaultTemplateId: objectId.nullable().optional(),
    defaultPermissions: z.array(permissionSchema).default([]),
    visibility: z.enum(['workspace', 'private']).default('workspace'),
  }),
});

export const listSpacesSchema = z.object({ params: z.object({ workspaceId: objectId }) });

export const createFolderSchema = z.object({
  params: z.object({ spaceId: objectId }),
  body: z.object({
    parentFolderId: objectId.nullable().optional(),
    name: z.string().min(1).max(120),
    slug: slug.optional(),
    description: z.string().max(500).nullable().optional(),
    icon: z.string().max(32).nullable().optional(),
    order: z.number().int().nonnegative().default(0),
    visibility: z.enum(['workspace', 'private']).default('workspace'),
    permissions: z.array(permissionSchema).default([]),
  }),
});

export const listSpaceChildrenSchema = z.object({
  params: z.object({ spaceId: objectId }),
  query: z.object({
    folderId: objectId.nullable().optional(),
    parentPageId: objectId.nullable().optional(),
  }),
});

export const createPageSchema = z.object({
  params: z.object({ spaceId: objectId }),
  body: z.object({
    folderId: objectId.nullable().optional(),
    parentPageId: objectId.nullable().optional(),
    title: z.string().min(1).max(180),
    slug: slug.optional(),
    icon: z.string().max(32).nullable().optional(),
    coverImage: z.string().url().nullable().optional(),
    summary: z.string().max(1000).nullable().optional(),
    properties: z.record(z.unknown()).default({}),
    tagIds: z.array(objectId).default([]),
    status: z.enum(['draft', 'published', 'readonly', 'template']).default('draft'),
    permissions: z.array(permissionSchema).default([]),
    blocks: blocksSchema.default([]),
  }),
});

export const pageParamsSchema = z.object({ params: z.object({ pageId: objectId }) });

export const updatePageSchema = z.object({
  params: z.object({ pageId: objectId }),
  body: z.object({
    title: z.string().min(1).max(180).optional(),
    folderId: objectId.nullable().optional(),
    parentPageId: objectId.nullable().optional(),
    icon: z.string().max(32).nullable().optional(),
    coverImage: z.string().url().nullable().optional(),
    summary: z.string().max(1000).nullable().optional(),
    ownerId: objectId.optional(),
    properties: z.record(z.unknown()).optional(),
    tagIds: z.array(objectId).optional(),
    status: z.enum(['draft', 'published', 'readonly', 'template']).optional(),
    permissions: z.array(permissionSchema).optional(),
  }),
});

export const saveBlocksSchema = z.object({
  params: z.object({ pageId: objectId }),
  body: z.object({ blocks: blocksSchema }),
});

export const createCommentSchema = z.object({
  params: z.object({ pageId: objectId }),
  body: z.object({
    blockId: objectId.nullable().optional(),
    parentCommentId: objectId.nullable().optional(),
    content: z.string().min(1).max(5000),
  }),
});

export const updateCommentSchema = z.object({
  params: z.object({ commentId: objectId }),
  body: z.object({
    content: z.string().min(1).max(5000).optional(),
    resolved: z.boolean().optional(),
  }),
});

export const knowledgeHomeSchema = z.object({ params: z.object({ workspaceId: objectId }) });

export const listFavoritesSchema = z.object({ params: z.object({ workspaceId: objectId }) });

export const favoriteTargetSchema = z.object({
  body: z.object({
    workspaceId: objectId,
    targetType: favoriteTargetTypeSchema,
    targetId: objectId,
    sortOrder: z.number().int().nonnegative().default(0),
  }),
});

export const unfavoriteTargetSchema = z.object({
  params: z.object({
    targetType: favoriteTargetTypeSchema,
    targetId: objectId,
  }),
});

export const pinPageSchema = z.object({
  params: z.object({ pageId: objectId }),
  body: z.object({
    scope: pinScopeSchema.default('personal'),
    spaceId: objectId.nullable().optional(),
    sortOrder: z.number().int().nonnegative().default(0),
  }),
});

export const createRelationshipSchema = z.object({
  params: z.object({ pageId: objectId }),
  body: z.object({
    targetType: relationshipTargetTypeSchema,
    targetId: objectId,
    relationshipType: relationshipTypeSchema.default('related_to'),
    metadata: z.record(z.unknown()).default({}),
  }),
});

export const createTagSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    name: z.string().min(1).max(80),
    color: z.string().min(1).max(32).default('#64748b'),
    description: z.string().max(300).nullable().optional(),
  }),
});

export const listTagsSchema = z.object({ params: z.object({ workspaceId: objectId }) });

export const listTemplatesSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  query: z.object({ spaceId: objectId.nullable().optional() }),
});

export const createTemplateSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    spaceId: objectId.nullable().optional(),
    name: z.string().min(1).max(120),
    category: z.string().min(1).max(80).default('General'),
    description: z.string().max(500).nullable().optional(),
    icon: z.string().max(32).nullable().optional(),
    blocks: blocksSchema.default([]),
    variables: z.array(z.string().min(1).max(80)).default([]),
  }),
});

export const useTemplateSchema = z.object({
  params: z.object({ templateId: objectId }),
  body: z.object({
    spaceId: objectId,
    folderId: objectId.nullable().optional(),
    parentPageId: objectId.nullable().optional(),
    title: z.string().min(1).max(180),
    variables: z.record(z.string()).default({}),
  }),
});

export const watchPageSchema = z.object({
  params: z.object({ pageId: objectId }),
  body: z.object({ subscription: subscriptionSchema.default('all_updates') }),
});

const syncOperationTypeSchema = z.enum([
  'create_page',
  'update_page',
  'save_blocks',
  'archive_page',
  'restore_page',
  'delete_page',
  'comment',
  'favorite',
  'watch',
]);

export const documentSyncSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    operations: z
      .array(
        z.object({
          clientOperationId: z.string().min(1).max(120),
          pageId: objectId.nullable().optional(),
          type: syncOperationTypeSchema,
          baseUpdatedAt: z.string().datetime().nullable().optional(),
          payload: z.record(z.unknown()).default({}),
        }),
      )
      .max(50),
  }),
});

export const importDocumentSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    spaceId: objectId,
    folderId: objectId.nullable().optional(),
    parentPageId: objectId.nullable().optional(),
    title: z.string().min(1).max(180),
    format: z.enum(['markdown', 'html', 'text', 'docx', 'pdf']),
    content: z.string().max(1_000_000).default(''),
    status: z.enum(['draft', 'published']).default('draft'),
  }),
});

export const exportDocumentSchema = z.object({
  query: z.object({
    pageId: objectId,
    format: z.enum(['markdown', 'html', 'pdf', 'text', 'json']).default('markdown'),
  }),
});

export const bulkDocumentSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    action: z.enum([
      'archive',
      'restore',
      'delete',
      'duplicate',
      'move',
      'change_owner',
      'change_tags',
      'publish',
      'unpublish',
    ]),
    pageIds: z.array(objectId).min(1).max(100),
    folderId: objectId.nullable().optional(),
    parentPageId: objectId.nullable().optional(),
    ownerId: objectId.optional(),
    tagIds: z.array(objectId).optional(),
  }),
});

export const listMediaSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  query: z.object({
    search: z.string().max(120).optional(),
    archived: z
      .string()
      .transform((value) => value === 'true')
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(30),
  }),
});

export const uploadMediaSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    pageId: objectId.nullable().optional(),
  }),
});

export const mediaParamsSchema = z.object({ params: z.object({ mediaId: objectId }) });

export const updateMediaSchema = z.object({
  params: z.object({ mediaId: objectId }),
  body: z.object({
    fileName: z.string().min(1).max(255).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const retentionPolicySchema = z.object({ params: z.object({ workspaceId: objectId }) });

export const updateRetentionPolicySchema = z.object({
  params: z.object({ workspaceId: objectId }),
  body: z.object({
    draftRetentionDays: z.number().int().positive().optional(),
    archiveRetentionDays: z.number().int().positive().optional(),
    deletedRetentionDays: z.number().int().positive().optional(),
    temporaryExportRetentionHours: z.number().int().positive().optional(),
    temporaryImportRetentionHours: z.number().int().positive().optional(),
  }),
});

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>['body'];
export type CreateFolderInput = z.infer<typeof createFolderSchema>['body'];
export type CreatePageInput = z.infer<typeof createPageSchema>['body'];
export type UpdatePageInput = z.infer<typeof updatePageSchema>['body'];
export type SaveBlocksInput = z.infer<typeof saveBlocksSchema>['body'];
export type CreateDocumentCommentInput = z.infer<typeof createCommentSchema>['body'];
export type UpdateDocumentCommentInput = z.infer<typeof updateCommentSchema>['body'];
export type FavoriteTargetInput = z.infer<typeof favoriteTargetSchema>['body'];
export type PinPageInput = z.infer<typeof pinPageSchema>['body'];
export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>['body'];
export type CreateTagInput = z.infer<typeof createTagSchema>['body'];
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>['body'];
export type UseTemplateInput = z.infer<typeof useTemplateSchema>['body'];
export type WatchPageInput = z.infer<typeof watchPageSchema>['body'];
export type DocumentSyncInput = z.infer<typeof documentSyncSchema>['body'];
export type DocumentImportInput = z.infer<typeof importDocumentSchema>['body'];
export type ExportDocumentInput = z.infer<typeof exportDocumentSchema>['query'];
export type BulkDocumentInput = z.infer<typeof bulkDocumentSchema>['body'];
export type ListMediaInput = z.infer<typeof listMediaSchema>['query'];
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>['body'];
export type UpdateRetentionPolicyInput = z.infer<typeof updateRetentionPolicySchema>['body'];
