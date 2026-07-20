import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { sendSuccess } from '../../../utils/api-response.js';
import { BadRequestError, UnauthorizedError } from '../../../utils/app-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { DevOpsService } from '../services/devops.service.js';

const devOpsService = new DevOpsService();

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

const rangeFilters = (
  request: Request,
): { from?: Date; to?: Date; repositoryId?: Types.ObjectId; status?: string } => {
  const filters: { from?: Date; to?: Date; repositoryId?: Types.ObjectId; status?: string } = {};
  const from = queryDate(request.query.from);
  const to = queryDate(request.query.to);
  const repositoryId = queryObjectId(request.query.repositoryId);
  if (from) filters.from = from;
  if (to) filters.to = to;
  if (repositoryId) filters.repositoryId = repositoryId;
  if (typeof request.query.status === 'string') filters.status = request.query.status;
  return filters;
};

export const getDevOpsSummary: RequestHandler = asyncHandler(async (request, response) => {
  const summary = await devOpsService.getWorkspaceSummary(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    rangeFilters(request),
  );
  sendSuccess(response, 200, 'Engineering summary retrieved', summary);
});

export const createRepository: RequestHandler = asyncHandler(async (request, response) => {
  const repository = await devOpsService.createRepository(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Repository connected', repository);
});

export const listRepositories: RequestHandler = asyncHandler(async (request, response) => {
  const repositories = await devOpsService.listRepositories(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Repositories retrieved', repositories);
});

export const archiveRepository: RequestHandler = asyncHandler(async (request, response) => {
  const repository = await devOpsService.archiveRepository(
    paramObjectId(request.params.repositoryId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Repository archived', repository);
});

export const upsertBranch: RequestHandler = asyncHandler(async (request, response) => {
  const branch = await devOpsService.upsertBranch(
    paramObjectId(request.params.repositoryId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Branch saved', branch);
});

export const listBranches: RequestHandler = asyncHandler(async (request, response) => {
  const branches = await devOpsService.listBranches(
    paramObjectId(request.params.repositoryId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Branches retrieved', branches);
});

export const upsertCommit: RequestHandler = asyncHandler(async (request, response) => {
  const commit = await devOpsService.upsertCommit(
    paramObjectId(request.params.repositoryId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Commit saved', commit);
});

export const upsertPullRequest: RequestHandler = asyncHandler(async (request, response) => {
  const pullRequest = await devOpsService.upsertPullRequest(
    paramObjectId(request.params.repositoryId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Pull request saved', pullRequest);
});

export const upsertPipelineRun: RequestHandler = asyncHandler(async (request, response) => {
  const pipelineRun = await devOpsService.upsertPipelineRun(
    paramObjectId(request.params.repositoryId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Pipeline run saved', pipelineRun);
});

export const upsertDeployment: RequestHandler = asyncHandler(async (request, response) => {
  const deployment = await devOpsService.upsertDeployment(
    paramObjectId(request.params.repositoryId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Deployment saved', deployment);
});
