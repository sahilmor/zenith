import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const isoDate = z
  .string()
  .datetime()
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .optional();

export const analyticsDashboardSchema = z.object({
  query: z.object({
    workspaceId: objectId,
    from: isoDate,
    to: isoDate,
  }),
});

export const workspaceAnalyticsSchema = z.object({
  params: z.object({ workspaceId: objectId }),
  query: z.object({
    from: isoDate,
    to: isoDate,
  }),
});

export const projectAnalyticsSchema = z.object({
  params: z.object({ projectId: objectId }),
  query: z.object({
    from: isoDate,
    to: isoDate,
  }),
});

export const boardAnalyticsSchema = z.object({
  params: z.object({ boardId: objectId }),
  query: z.object({
    from: isoDate,
    to: isoDate,
  }),
});

export const userAnalyticsSchema = z.object({
  params: z.object({ userId: objectId }),
  query: z.object({
    workspaceId: objectId,
    from: isoDate,
    to: isoDate,
  }),
});

export const reportSchema = z.object({
  query: z
    .object({
      scope: z
        .enum(['workspace', 'project', 'board', 'user', 'labels', 'dueDates', 'completion'])
        .default('workspace'),
      workspaceId: objectId.optional(),
      projectId: objectId.optional(),
      boardId: objectId.optional(),
      userId: objectId.optional(),
      format: z.enum(['json', 'csv', 'xlsx', 'pdf']).default('json'),
      from: isoDate,
      to: isoDate,
      status: z.enum(['open', 'in_progress', 'done', 'archived']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      search: z.string().trim().max(120).optional(),
    })
    .superRefine((query, context) => {
      if (!query.workspaceId && !query.projectId && !query.boardId && !query.userId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['workspaceId'],
          message: 'A workspace, project, board, or user id is required',
        });
      }
    }),
});
