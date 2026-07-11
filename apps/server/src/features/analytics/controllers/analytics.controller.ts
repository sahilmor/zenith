import type { Request, RequestHandler } from 'express';
import type {
  AnalyticsReportFormat,
  AnalyticsReportScope,
  TaskPriority,
  TaskStatus,
} from '@pm/types';
import { Types } from 'mongoose';
import { sendSuccess } from '../../../utils/api-response.js';
import { BadRequestError, UnauthorizedError } from '../../../utils/app-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { AnalyticsService } from '../services/analytics.service.js';

const analyticsService = new AnalyticsService();

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

const queryString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const queryDateRange = (request: Request): { from?: string; to?: string } => {
  const range: { from?: string; to?: string } = {};
  const from = queryString(request.query.from);
  const to = queryString(request.query.to);
  if (from) range.from = from;
  if (to) range.to = to;
  return range;
};

export const getDashboardAnalytics: RequestHandler = asyncHandler(async (request, response) => {
  const workspaceId = queryObjectId(request.query.workspaceId);
  if (!workspaceId) throw new BadRequestError('workspaceId is required');
  const analytics = await analyticsService.getWorkspaceAnalytics(
    workspaceId,
    requireUserId(request),
    queryDateRange(request),
  );
  sendSuccess(response, 200, 'Dashboard analytics retrieved', analytics);
});

export const getWorkspaceAnalytics: RequestHandler = asyncHandler(async (request, response) => {
  const analytics = await analyticsService.getWorkspaceAnalytics(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    queryDateRange(request),
  );
  sendSuccess(response, 200, 'Workspace analytics retrieved', analytics);
});

export const getProjectAnalytics: RequestHandler = asyncHandler(async (request, response) => {
  const analytics = await analyticsService.getProjectAnalytics(
    paramObjectId(request.params.projectId),
    requireUserId(request),
    queryDateRange(request),
  );
  sendSuccess(response, 200, 'Project analytics retrieved', analytics);
});

export const getBoardAnalytics: RequestHandler = asyncHandler(async (request, response) => {
  const analytics = await analyticsService.getBoardAnalytics(
    paramObjectId(request.params.boardId),
    requireUserId(request),
    queryDateRange(request),
  );
  sendSuccess(response, 200, 'Board analytics retrieved', analytics);
});

export const getUserAnalytics: RequestHandler = asyncHandler(async (request, response) => {
  const workspaceId = queryObjectId(request.query.workspaceId);
  if (!workspaceId) throw new BadRequestError('workspaceId is required');
  const analytics = await analyticsService.getUserAnalytics(
    workspaceId,
    paramObjectId(request.params.userId),
    requireUserId(request),
    queryDateRange(request),
  );
  sendSuccess(response, 200, 'User analytics retrieved', analytics);
});

export const exportReport: RequestHandler = asyncHandler(async (request, response) => {
  const workspaceId = queryObjectId(request.query.workspaceId);
  const projectId = queryObjectId(request.query.projectId);
  const boardId = queryObjectId(request.query.boardId);
  const userId = queryObjectId(request.query.userId);
  const status = queryString(request.query.status);
  const priority = queryString(request.query.priority);
  const search = queryString(request.query.search);
  const reportInput = {
    scope: queryString(request.query.scope) as AnalyticsReportScope,
    format: queryString(request.query.format) as AnalyticsReportFormat,
    ...queryDateRange(request),
    ...(workspaceId ? { workspaceId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(boardId ? { boardId } : {}),
    ...(userId ? { userId } : {}),
    ...(status ? { status: status as TaskStatus } : {}),
    ...(priority ? { priority: priority as TaskPriority } : {}),
    ...(search ? { search } : {}),
  };
  const report = await analyticsService.generateReport(reportInput, requireUserId(request));

  if (report.contentType === 'application/json') {
    sendSuccess(response, 200, 'Report generated', report.body);
    return;
  }

  response.setHeader('Content-Type', report.contentType);
  response.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
  response.status(200).send(report.body);
});
