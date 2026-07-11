import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const color = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{6}$/i, 'Use a hex color');

export const projectBoardParamsSchema = z.object({
  params: z.object({
    projectId: objectId,
  }),
});

export const boardParamsSchema = z.object({
  params: z.object({
    boardId: objectId,
  }),
});

export const columnParamsSchema = z.object({
  params: z.object({
    columnId: objectId,
  }),
});

export const createBoardSchema = z.object({
  params: z.object({
    projectId: objectId,
  }),
  body: z.object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).optional().nullable(),
    isDefault: z.boolean().default(false),
  }),
});

export const updateBoardSchema = z.object({
  params: z.object({
    boardId: objectId,
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      description: z.string().trim().max(1000).optional().nullable(),
      isDefault: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required'),
});

export const createColumnSchema = z.object({
  params: z.object({
    boardId: objectId,
  }),
  body: z.object({
    name: z.string().trim().min(2).max(80),
    color: color.optional().nullable(),
    limit: z.coerce.number().int().positive().optional().nullable(),
  }),
});

export const updateColumnSchema = z.object({
  params: z.object({
    columnId: objectId,
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      color: color.optional().nullable(),
      limit: z.coerce.number().int().positive().optional().nullable(),
      archived: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required'),
});

export const reorderColumnsSchema = z.object({
  params: z.object({
    boardId: objectId,
  }),
  body: z.object({
    columnIds: z.array(objectId).min(1),
  }),
});

export const archiveBoardSchema = boardParamsSchema;
export const restoreBoardSchema = boardParamsSchema;

export type CreateBoardInput = z.infer<typeof createBoardSchema>['body'];
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>['body'];
export type CreateColumnInput = z.infer<typeof createColumnSchema>['body'];
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>['body'];
export type ReorderColumnsInput = z.infer<typeof reorderColumnsSchema>['body'];
