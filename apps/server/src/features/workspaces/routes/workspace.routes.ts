import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { requireWorkspaceRole } from '../../../middleware/workspace-auth.middleware.js';
import {
  acceptInvitation,
  archiveWorkspace,
  createWorkspace,
  getWorkspace,
  inviteMember,
  leaveWorkspace,
  listInvitations,
  listMembers,
  listWorkspaces,
  previewInvitation,
  removeMember,
  updateMemberRole,
  updateWorkspace,
} from '../controllers/workspace.controller.js';
import {
  acceptInvitationSchema,
  createWorkspaceSchema,
  inviteMemberSchema,
  invitationTokenParamsSchema,
  memberParamsSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
  workspaceParamsSchema,
} from '../validation/workspace.validation.js';
import { createProject, listProjects } from '../../projects/controllers/project.controller.js';
import {
  createProjectSchema,
  workspaceProjectParamsSchema,
} from '../../projects/validation/project.validation.js';

export const workspaceRouter = Router();

workspaceRouter.use(verifyToken);

workspaceRouter.post('/', validate(createWorkspaceSchema), createWorkspace);
workspaceRouter.get('/', listWorkspaces);
workspaceRouter.post('/invitations/accept', validate(acceptInvitationSchema), acceptInvitation);
workspaceRouter.get(
  '/invitations/:token',
  validate(invitationTokenParamsSchema),
  previewInvitation,
);

workspaceRouter.post('/:workspaceId/projects', validate(createProjectSchema), createProject);
workspaceRouter.get('/:workspaceId/projects', validate(workspaceProjectParamsSchema), listProjects);

workspaceRouter.get('/:workspaceId', validate(workspaceParamsSchema), getWorkspace);
workspaceRouter.patch(
  '/:workspaceId',
  validate(updateWorkspaceSchema),
  requireWorkspaceRole(['owner', 'admin']),
  updateWorkspace,
);
workspaceRouter.delete(
  '/:workspaceId',
  validate(workspaceParamsSchema),
  requireWorkspaceRole(['owner', 'admin']),
  archiveWorkspace,
);
workspaceRouter.post(
  '/:workspaceId/invitations',
  validate(inviteMemberSchema),
  requireWorkspaceRole(['owner', 'admin']),
  inviteMember,
);
workspaceRouter.get(
  '/:workspaceId/invitations',
  validate(workspaceParamsSchema),
  requireWorkspaceRole(['owner', 'admin']),
  listInvitations,
);
workspaceRouter.get('/:workspaceId/members', validate(workspaceParamsSchema), listMembers);
workspaceRouter.patch(
  '/:workspaceId/members/:memberId',
  validate(updateMemberRoleSchema),
  requireWorkspaceRole(['owner', 'admin']),
  updateMemberRole,
);
workspaceRouter.delete(
  '/:workspaceId/members/:memberId',
  validate(memberParamsSchema),
  requireWorkspaceRole(['owner', 'admin']),
  removeMember,
);
workspaceRouter.post('/:workspaceId/leave', validate(workspaceParamsSchema), leaveWorkspace);
