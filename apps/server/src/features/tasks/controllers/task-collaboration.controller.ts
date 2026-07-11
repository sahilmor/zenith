import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { BadRequestError, UnauthorizedError } from '../../../utils/app-error.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { TaskCollaborationService } from '../services/task-collaboration.service.js';

let collaborationService = new TaskCollaborationService();

export const setTaskCollaborationService = (service: TaskCollaborationService): void => {
  collaborationService = service;
};

export const resetTaskCollaborationService = (): void => {
  collaborationService = new TaskCollaborationService();
};

const requireUserId = (request: Request): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

const paramObjectId = (value: string | undefined): Types.ObjectId => {
  if (!value) throw new BadRequestError('Missing route parameter');
  return new Types.ObjectId(value);
};

export const createComment: RequestHandler = asyncHandler(async (request, response) => {
  const comment = await collaborationService.createComment(
    paramObjectId(request.params.taskId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Comment created', comment);
});

export const listComments: RequestHandler = asyncHandler(async (request, response) => {
  const comments = await collaborationService.listComments(
    paramObjectId(request.params.taskId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Comments retrieved', comments);
});

export const updateComment: RequestHandler = asyncHandler(async (request, response) => {
  const comment = await collaborationService.updateComment(
    paramObjectId(request.params.commentId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Comment updated', comment);
});

export const deleteComment: RequestHandler = asyncHandler(async (request, response) => {
  await collaborationService.deleteComment(
    paramObjectId(request.params.commentId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Comment deleted');
});

export const createReply: RequestHandler = asyncHandler(async (request, response) => {
  const comment = await collaborationService.createReply(
    paramObjectId(request.params.commentId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Reply created', comment);
});

export const uploadAttachment: RequestHandler = asyncHandler(async (request, response) => {
  const attachment = await collaborationService.uploadAttachment(
    paramObjectId(request.params.taskId),
    requireUserId(request),
    request.file,
  );
  sendSuccess(response, 201, 'Attachment uploaded', attachment);
});

export const listAttachments: RequestHandler = asyncHandler(async (request, response) => {
  const attachments = await collaborationService.listAttachments(
    paramObjectId(request.params.taskId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Attachments retrieved', attachments);
});

export const deleteAttachment: RequestHandler = asyncHandler(async (request, response) => {
  await collaborationService.deleteAttachment(
    paramObjectId(request.params.attachmentId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Attachment deleted');
});

export const listActivity: RequestHandler = asyncHandler(async (request, response) => {
  const activity = await collaborationService.listActivity(
    paramObjectId(request.params.taskId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Task activity retrieved', activity);
});

export const watchTask: RequestHandler = asyncHandler(async (request, response) => {
  const watcher = await collaborationService.watchTask(
    paramObjectId(request.params.taskId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Task watched', watcher);
});

export const unwatchTask: RequestHandler = asyncHandler(async (request, response) => {
  await collaborationService.unwatchTask(
    paramObjectId(request.params.taskId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Task unwatched');
});

export const listLabels: RequestHandler = asyncHandler(async (request, response) => {
  const labels = await collaborationService.listLabels(
    paramObjectId(request.params.taskId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Labels retrieved', labels);
});

export const createLabel: RequestHandler = asyncHandler(async (request, response) => {
  const label = await collaborationService.createAndAssignLabel(
    paramObjectId(request.params.taskId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Label assigned', label);
});

export const updateLabel: RequestHandler = asyncHandler(async (request, response) => {
  const label = await collaborationService.updateLabel(
    paramObjectId(request.params.labelId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Label updated', label);
});

export const removeLabel: RequestHandler = asyncHandler(async (request, response) => {
  await collaborationService.removeLabel(
    paramObjectId(request.params.taskId),
    paramObjectId(request.params.labelId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Label removed');
});
