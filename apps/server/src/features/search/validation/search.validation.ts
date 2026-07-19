import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const searchEntityTypes = [
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
] as const;

const filterSchema = z
  .object({
    entityTypes: z.array(z.enum(searchEntityTypes)).optional(),
    ownerId: objectId.optional(),
    archived: z.boolean().optional(),
    updatedFrom: z.string().datetime().optional(),
    updatedTo: z.string().datetime().optional(),
    favorites: z.boolean().optional(),
    templates: z.boolean().optional(),
  })
  .default({});

export const universalSearchSchema = z.object({
  query: z.object({
    workspaceId: objectId,
    q: z.string().trim().max(200).optional(),
    entityTypes: z.string().trim().optional(),
    ownerId: objectId.optional(),
    archived: z.coerce.boolean().optional(),
    updatedFrom: z.string().datetime().optional(),
    updatedTo: z.string().datetime().optional(),
    sort: z
      .enum(['relevance', 'updated', 'created', 'alphabetical', 'popularity'])
      .default('relevance'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

export const suggestionsSchema = z.object({
  query: z.object({
    workspaceId: objectId,
    q: z.string().trim().max(120).optional(),
    limit: z.coerce.number().int().positive().max(20).default(10),
  }),
});

export const workspaceSearchSchema = z.object({ query: z.object({ workspaceId: objectId }) });

export const savedSearchSchema = z.object({
  body: z.object({
    workspaceId: objectId,
    name: z.string().min(1).max(120),
    query: z.string().trim().min(1).max(200),
    filters: filterSchema,
    pinned: z.boolean().default(false),
  }),
});

export const savedSearchParamsSchema = z.object({ params: z.object({ savedSearchId: objectId }) });

export type UniversalSearchQuery = z.infer<typeof universalSearchSchema>['query'];
export type SuggestionsQuery = z.infer<typeof suggestionsSchema>['query'];
export type SavedSearchInput = z.infer<typeof savedSearchSchema>['body'];
