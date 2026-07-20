import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { UserRepository } from '../../auth/repositories/user.repository.js';
import { WorkspaceService } from '../services/workspace.service.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../../utils/app-error.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';

const workspaceService = new WorkspaceService();
const users = new UserRepository();

const requireUserId = (request: Parameters<RequestHandler>[0]): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

const paramObjectId = (value: string | undefined): Types.ObjectId => {
  if (!value) throw new BadRequestError('Missing route parameter');
  return new Types.ObjectId(value);
};

export const createWorkspace: RequestHandler = asyncHandler(async (request, response) => {
  const workspace = await workspaceService.createWorkspace(requireUserId(request), request.body);
  sendSuccess(response, 201, 'Workspace created', workspace);
});

export const listWorkspaces: RequestHandler = asyncHandler(async (request, response) => {
  const workspaces = await workspaceService.listWorkspaces(requireUserId(request));
  sendSuccess(response, 200, 'Workspaces retrieved', workspaces);
});

export const getWorkspace: RequestHandler = asyncHandler(async (request, response) => {
  const workspace = await workspaceService.getWorkspace(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Workspace retrieved', workspace);
});

export const updateWorkspace: RequestHandler = asyncHandler(async (request, response) => {
  const workspace = await workspaceService.updateWorkspace(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 200, 'Workspace updated', workspace);
});

export const archiveWorkspace: RequestHandler = asyncHandler(async (request, response) => {
  await workspaceService.archiveWorkspace(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Workspace archived');
});

export const inviteMember: RequestHandler = asyncHandler(async (request, response) => {
  const invitation = await workspaceService.inviteMember(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    request.body,
  );
  sendSuccess(response, 201, 'Invitation sent', invitation);
});

export const listMembers: RequestHandler = asyncHandler(async (request, response) => {
  const members = await workspaceService.listMembers(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Members retrieved', members);
});

export const listInvitations: RequestHandler = asyncHandler(async (request, response) => {
  const invitations = await workspaceService.listInvitations(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Invitations retrieved', invitations);
});

export const updateMemberRole: RequestHandler = asyncHandler(async (request, response) => {
  const member = await workspaceService.updateMemberRole(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    paramObjectId(request.params.memberId),
    request.body,
  );
  sendSuccess(response, 200, 'Member role updated', member);
});

export const removeMember: RequestHandler = asyncHandler(async (request, response) => {
  await workspaceService.removeMember(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
    paramObjectId(request.params.memberId),
  );
  sendSuccess(response, 200, 'Member removed');
});

export const acceptInvitation: RequestHandler = asyncHandler(async (request, response) => {
  const userId = requireUserId(request);
  const user = await users.findById(userId.toString());
  if (!user) throw new NotFoundError('User not found');
  const workspace = await workspaceService.acceptInvitation(user, request.body.token);
  sendSuccess(response, 200, 'Invitation accepted', workspace);
});

export const previewInvitation: RequestHandler = asyncHandler(async (request, response) => {
  const invitation = await workspaceService.previewInvitation(request.params.token ?? '');
  sendSuccess(response, 200, 'Invitation retrieved', invitation);
});

export const leaveWorkspace: RequestHandler = asyncHandler(async (request, response) => {
  await workspaceService.leaveWorkspace(
    paramObjectId(request.params.workspaceId),
    requireUserId(request),
  );
  sendSuccess(response, 200, 'Workspace left');
});
