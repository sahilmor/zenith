import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { BadRequestError, UnauthorizedError } from '../../../utils/app-error.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { TaskService } from '../services/task.service.js';

const taskService = new TaskService();

const requireUserId = (request: Request): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

const paramObjectId = (value: string | undefined): Types.ObjectId => {
  if (!value) throw new BadRequestError('Missing route parameter');
  return new Types.ObjectId(value);
};

export const createTask: RequestHandler = asyncHandler(async (request, response) => {
  const task = await taskService.createTask(
    paramObjectId(request.params.columnId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Task created', task);
});

export const listTasks: RequestHandler = asyncHandler(async (request, response) => {
  const tasks = await taskService.listTasks(
    paramObjectId(request.params.columnId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Tasks retrieved', tasks);
});

export const listAdvancedTasks: RequestHandler = asyncHandler(async (request, response) => {
  const tasks = await taskService.listAdvancedTasks(
    requireUserId(request),
    request.query as unknown as Parameters<TaskService['listAdvancedTasks']>[1],
  );
  sendSuccess(response, 200, 'Tasks retrieved', tasks);
});

export const getTask: RequestHandler = asyncHandler(async (request, response) => {
  const task = await taskService.getTask(
    paramObjectId(request.params.taskId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Task retrieved', task);
});

export const updateTask: RequestHandler = asyncHandler(async (request, response) => {
  const task = await taskService.updateTask(
    paramObjectId(request.params.taskId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Task updated', task);
});

export const deleteTask: RequestHandler = asyncHandler(async (request, response) => {
  await taskService.deleteTask(paramObjectId(request.params.taskId), requireUserId(request));
  sendSuccess(response, 200, 'Task deleted');
});

export const archiveTask: RequestHandler = asyncHandler(async (request, response) => {
  const task = await taskService.archiveTask(
    paramObjectId(request.params.taskId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Task archived', task);
});

export const restoreTask: RequestHandler = asyncHandler(async (request, response) => {
  const task = await taskService.restoreTask(
    paramObjectId(request.params.taskId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Task restored', task);
});

export const reorderTasks: RequestHandler = asyncHandler(async (request, response) => {
  const tasks = await taskService.reorderTasks(requireUserId(request), request.body);
  sendSuccess(response, 200, 'Tasks reordered', tasks);
});

export const bulkUpdateTasks: RequestHandler = asyncHandler(async (request, response) => {
  const tasks = await taskService.bulkUpdateTasks(requireUserId(request), request.body);
  sendSuccess(response, 200, 'Tasks updated', tasks);
});

export const createSubtask: RequestHandler = asyncHandler(async (request, response) => {
  const subtask = await taskService.createSubtask(
    paramObjectId(request.params.taskId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Subtask created', subtask);
});

export const listSubtasks: RequestHandler = asyncHandler(async (request, response) => {
  const subtasks = await taskService.listSubtasks(
    paramObjectId(request.params.taskId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Subtasks retrieved', subtasks);
});

export const updateSubtask: RequestHandler = asyncHandler(async (request, response) => {
  const subtask = await taskService.updateSubtask(
    paramObjectId(request.params.subtaskId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Subtask updated', subtask);
});

export const deleteSubtask: RequestHandler = asyncHandler(async (request, response) => {
  await taskService.deleteSubtask(paramObjectId(request.params.subtaskId), requireUserId(request));
  sendSuccess(response, 200, 'Subtask deleted');
});
