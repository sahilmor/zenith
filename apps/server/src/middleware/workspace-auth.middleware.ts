import type { WorkspaceRole } from '@pm/types';
import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { WorkspaceRepository } from '../features/workspaces/repositories/workspace.repository.js';
import { ForbiddenError, UnauthorizedError } from '../utils/app-error.js';

const workspaces = new WorkspaceRepository();

export const requireWorkspaceRole =
  (roles: readonly WorkspaceRole[]): RequestHandler =>
  async (request, _response, next) => {
    try {
      if (!request.user) throw new UnauthorizedError('Authentication required');
      const { workspaceId } = request.params;
      if (!workspaceId) throw new ForbiddenError('Workspace access denied');
      if (!Types.ObjectId.isValid(workspaceId)) throw new ForbiddenError('Workspace access denied');
      const membership = await workspaces.findMembership(
        new Types.ObjectId(workspaceId),
        request.user._id,
      );
      if (
        !membership ||
        membership.status !== 'active' ||
        !roles.includes(membership.role as WorkspaceRole)
      ) {
        throw new ForbiddenError('Workspace access denied');
      }
      request.workspaceMembership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
