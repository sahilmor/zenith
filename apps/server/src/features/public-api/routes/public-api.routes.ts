import { Router } from 'express';
import { verifyApiKey } from '../../../middleware/api-key.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { UnauthorizedError } from '../../../utils/app-error.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { TaskRepository } from '../../tasks/repositories/task.repository.js';
import {
  listPublicTasksRouteSchema,
  type ListPublicTasksQuery,
} from '../validation/public-api.validation.js';

export const publicApiRouter = Router();
const tasks = new TaskRepository();

publicApiRouter.get(
  '/tasks',
  validate(listPublicTasksRouteSchema),
  verifyApiKey('tasks:read'),
  asyncHandler(async (request, response) => {
    const apiKey = request.apiKey;
    if (!apiKey) throw new UnauthorizedError('API key is required');
    const query = request.query as unknown as ListPublicTasksQuery;
    const result = await tasks.list({
      workspaceId: apiKey.workspaceId,
      page: query.page,
      limit: query.limit,
      sort: 'updatedAt',
      direction: 'desc',
      archived: false,
    });
    sendSuccess(response, 200, 'Tasks retrieved', {
      items: result.items.map((task) => ({
        id: task.id,
        workspaceId: task.workspaceId.toString(),
        projectId: task.projectId.toString(),
        boardId: task.boardId.toString(),
        columnId: task.columnId.toString(),
        title: task.title,
        description: task.description ?? null,
        priority: task.priority,
        status: task.status,
        archived: task.archived,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
      page: query.page,
      limit: query.limit,
      total: result.total,
      hasMore: query.page * query.limit < result.total,
    });
  }),
);
