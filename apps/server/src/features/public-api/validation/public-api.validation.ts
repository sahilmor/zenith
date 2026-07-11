import { z } from 'zod';

export const listPublicTasksRouteSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
});

export type ListPublicTasksQuery = z.infer<typeof listPublicTasksRouteSchema>['query'];
