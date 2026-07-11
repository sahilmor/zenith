import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const color = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{6}$/i, 'Use a hex color');

export const taskParamsSchema = z.object({
  params: z.object({ taskId: objectId }),
});

export const commentParamsSchema = z.object({
  params: z.object({ commentId: objectId }),
});

export const attachmentParamsSchema = z.object({
  params: z.object({ attachmentId: objectId }),
});

export const labelParamsSchema = z.object({
  params: z.object({ labelId: objectId }),
});

export const taskLabelParamsSchema = z.object({
  params: z.object({ taskId: objectId, labelId: objectId }),
});

export const createCommentSchema = z.object({
  params: z.object({ taskId: objectId }),
  body: z.object({
    content: z.string().trim().min(1).max(10000),
  }),
});

export const updateCommentSchema = z.object({
  params: z.object({ commentId: objectId }),
  body: z.object({
    content: z.string().trim().min(1).max(10000),
  }),
});

export const createReplySchema = z.object({
  params: z.object({ commentId: objectId }),
  body: z.object({
    content: z.string().trim().min(1).max(10000),
  }),
});

export const createLabelSchema = z.object({
  params: z.object({ taskId: objectId }),
  body: z.object({
    name: z.string().trim().min(1).max(40),
    color: color.default('#64748b'),
  }),
});

export const updateLabelSchema = z.object({
  params: z.object({ labelId: objectId }),
  body: z
    .object({
      name: z.string().trim().min(1).max(40).optional(),
      color: color.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required'),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>['body'];
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>['body'];
export type CreateReplyInput = z.infer<typeof createReplySchema>['body'];
export type CreateLabelInput = z.infer<typeof createLabelSchema>['body'];
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>['body'];
