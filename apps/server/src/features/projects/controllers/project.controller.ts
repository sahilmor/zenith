import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { UnauthorizedError, BadRequestError } from '../../../utils/app-error.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { ProjectService } from '../services/project.service.js';

const projectService = new ProjectService();

const requireUserId = (request: Request): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

const paramObjectId = (value: string | undefined): Types.ObjectId => {
  if (!value) throw new BadRequestError('Missing route parameter');
  return new Types.ObjectId(value);
};

export const createProject: RequestHandler = asyncHandler(async (request, response) => {
  const project = await projectService.createProject(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Project created', project);
});

export const listProjects: RequestHandler = asyncHandler(async (request, response) => {
  const projects = await projectService.listProjects(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Projects retrieved', projects);
});

export const getProject: RequestHandler = asyncHandler(async (request, response) => {
  const project = await projectService.getProject(
    paramObjectId(request.params.projectId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Project retrieved', project);
});

export const updateProject: RequestHandler = asyncHandler(async (request, response) => {
  const project = await projectService.updateProject(
    paramObjectId(request.params.projectId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Project updated', project);
});

export const deleteProject: RequestHandler = asyncHandler(async (request, response) => {
  await projectService.deleteProject(
    paramObjectId(request.params.projectId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Project deleted');
});

export const archiveProject: RequestHandler = asyncHandler(async (request, response) => {
  const project = await projectService.archiveProject(
    paramObjectId(request.params.projectId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Project archived', project);
});

export const restoreProject: RequestHandler = asyncHandler(async (request, response) => {
  const project = await projectService.restoreProject(
    paramObjectId(request.params.projectId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Project restored', project);
});
