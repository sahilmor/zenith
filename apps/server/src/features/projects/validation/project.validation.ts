import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const projectKey = z
  .string()
  .trim()
  .min(2)
  .max(10)
  .regex(/^[A-Za-z][A-Za-z0-9]*$/, 'Use letters and numbers, starting with a letter')
  .transform((value) => value.toUpperCase());

export const workspaceProjectParamsSchema = z.object({
  params: z.object({
    workspaceId: objectId,
  }),
});

export const projectParamsSchema = z.object({
  params: z.object({
    projectId: objectId,
  }),
});

export const createProjectSchema = z.object({
  params: z.object({
    workspaceId: objectId,
  }),
  body: z.object({
    name: z.string().trim().min(2).max(120),
    key: projectKey,
    description: z.string().trim().max(1000).optional().nullable(),
    icon: z.string().trim().max(16).optional().nullable(),
    color: z
      .string()
      .trim()
      .regex(/^#[0-9a-f]{6}$/i, 'Use a hex color')
      .optional()
      .nullable(),
    coverImage: z.string().url().optional().nullable(),
    visibility: z.enum(['private', 'public']).default('private'),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    projectId: objectId,
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      description: z.string().trim().max(1000).optional().nullable(),
      icon: z.string().trim().max(16).optional().nullable(),
      color: z
        .string()
        .trim()
        .regex(/^#[0-9a-f]{6}$/i, 'Use a hex color')
        .optional()
        .nullable(),
      coverImage: z.string().url().optional().nullable(),
      visibility: z.enum(['private', 'public']).optional(),
      ownerId: objectId.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required'),
});

export const archiveProjectSchema = projectParamsSchema;
export const restoreProjectSchema = projectParamsSchema;

export type CreateProjectInput = z.infer<typeof createProjectSchema>['body'];
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>['body'];
