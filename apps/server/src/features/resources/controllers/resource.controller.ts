import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { sendSuccess } from '../../../utils/api-response.js';
import { BadRequestError, UnauthorizedError } from '../../../utils/app-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { ResourceService } from '../services/resource.service.js';

const resourceService = new ResourceService();

const requireUserId = (request: Request): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

const paramObjectId = (value: string | undefined): Types.ObjectId => {
  if (!value) throw new BadRequestError('Missing route parameter');
  return new Types.ObjectId(value);
};

const queryObjectId = (value: unknown): Types.ObjectId | undefined =>
  typeof value === 'string' ? new Types.ObjectId(value) : undefined;

const queryDate = (value: unknown): Date | undefined =>
  typeof value === 'string' ? new Date(value) : undefined;

const resourceFilters = (
  request: Request,
): {
  userId?: Types.ObjectId;
  projectId?: Types.ObjectId;
  taskId?: Types.ObjectId;
  from?: Date;
  to?: Date;
} => {
  const filters: {
    userId?: Types.ObjectId;
    projectId?: Types.ObjectId;
    taskId?: Types.ObjectId;
    from?: Date;
    to?: Date;
  } = {};
  const userId = queryObjectId(request.query.userId);
  const projectId = queryObjectId(request.query.projectId);
  const taskId = queryObjectId(request.query.taskId);
  const from = queryDate(request.query.from);
  const to = queryDate(request.query.to);
  if (userId) filters.userId = userId;
  if (projectId) filters.projectId = projectId;
  if (taskId) filters.taskId = taskId;
  if (from) filters.from = from;
  if (to) filters.to = to;
  return filters;
};

const rangeFilters = (request: Request): { from?: Date; to?: Date } => {
  const filters: { from?: Date; to?: Date } = {};
  const from = queryDate(request.query.from);
  const to = queryDate(request.query.to);
  if (from) filters.from = from;
  if (to) filters.to = to;
  return filters;
};

export const upsertResourceProfile: RequestHandler = asyncHandler(async (request, response) => {
  const profile = await resourceService.upsertProfile(
    paramObjectId(request.params.workspaceId),
    paramObjectId(request.params.userId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Resource profile saved', profile);
});

export const listResourceProfiles: RequestHandler = asyncHandler(async (request, response) => {
  const profiles = await resourceService.listProfiles(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Resource profiles retrieved', profiles);
});

export const startTimer: RequestHandler = asyncHandler(async (request, response) => {
  const timer = await resourceService.startTimer(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Timer started', timer);
});

export const heartbeatTimer: RequestHandler = asyncHandler(async (request, response) => {
  const timer = await resourceService.heartbeatTimer(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Timer heartbeat recorded', timer);
});

export const getTimer: RequestHandler = asyncHandler(async (request, response) => {
  const timer = await resourceService.getTimer(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Timer retrieved', timer);
});

export const stopTimer: RequestHandler = asyncHandler(async (request, response) => {
  const entry = await resourceService.stopTimer(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Timer stopped', entry);
});

export const createTimeEntry: RequestHandler = asyncHandler(async (request, response) => {
  const entry = await resourceService.createTimeEntry(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Time entry created', entry);
});

export const listTimeEntries: RequestHandler = asyncHandler(async (request, response) => {
  const entries = await resourceService.listTimeEntries(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    resourceFilters(request),
  );
  sendSuccess(response, 200, 'Time entries retrieved', entries);
});

export const getTimesheet: RequestHandler = asyncHandler(async (request, response) => {
  const timesheet = await resourceService.getTimesheet(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    resourceFilters(request),
  );
  sendSuccess(response, 200, 'Timesheet retrieved', timesheet);
});

export const createAllocation: RequestHandler = asyncHandler(async (request, response) => {
  const allocation = await resourceService.createAllocation(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Resource allocation created', allocation);
});

export const createAvailability: RequestHandler = asyncHandler(async (request, response) => {
  const availability = await resourceService.createAvailability(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Availability recorded', availability);
});

export const getResourceSummary: RequestHandler = asyncHandler(async (request, response) => {
  const summary = await resourceService.getWorkspaceSummary(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    rangeFilters(request),
  );
  sendSuccess(response, 200, 'Resource summary retrieved', summary);
});

export const getResourceForecast: RequestHandler = asyncHandler(async (request, response) => {
  const forecast = await resourceService.forecast(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    rangeFilters(request),
  );
  sendSuccess(response, 200, 'Resource forecast retrieved', forecast);
});
