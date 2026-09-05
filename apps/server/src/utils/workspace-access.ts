import type { WorkspaceRole } from '@pm/types';
import type { Types } from 'mongoose';
import type { WorkspaceRepository } from '../features/workspaces/repositories/workspace.repository.js';
import { ForbiddenError, NotFoundError } from './app-error.js';

/**
 * Canonical workspace-membership check shared by every feature service.
 * Throws NotFoundError if the workspace is missing/archived, ForbiddenError
 * if the caller isn't an active member. Stricter than the
 * requireWorkspaceRole Express middleware (which doesn't check
 * archived/existence) because services are also called from contexts
 * without a request (sockets, jobs) that need the fuller check.
 */
export const requireWorkspaceMembership = async (
  workspaces: WorkspaceRepository,
  workspaceId: Types.ObjectId,
  userId: Types.ObjectId,
): Promise<WorkspaceRole> => {
  const [workspace, membership] = await Promise.all([
    workspaces.findWorkspaceById(workspaceId),
    workspaces.findMembership(workspaceId, userId),
  ]);
  if (!workspace || workspace.archived) throw new NotFoundError('Workspace not found');
  if (!membership || membership.status !== 'active')
    throw new ForbiddenError('Workspace access denied');
  return membership.role as WorkspaceRole;
};

export const requireWorkspaceRole = async (
  workspaces: WorkspaceRepository,
  workspaceId: Types.ObjectId,
  userId: Types.ObjectId,
  roles: ReadonlySet<WorkspaceRole>,
  message = 'Workspace access denied',
): Promise<void> => {
  const role = await requireWorkspaceMembership(workspaces, workspaceId, userId);
  if (!roles.has(role)) throw new ForbiddenError(message);
};
