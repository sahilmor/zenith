import { z } from 'zod';
import { workspaceRoles, workspaceVisibilities } from '../constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const manageableRole = z.enum(['admin', 'manager', 'member', 'guest']);
const memberRole = z.enum(workspaceRoles);

export const workspaceParamsSchema = z.object({
  params: z.object({
    workspaceId: objectId,
  }),
});

export const memberParamsSchema = z.object({
  params: z.object({
    workspaceId: objectId,
    memberId: objectId,
  }),
});

export const createWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional().nullable(),
    visibility: z.enum(workspaceVisibilities).default('private'),
  }),
});

export const updateWorkspaceSchema = z.object({
  params: z.object({
    workspaceId: objectId,
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().max(500).optional().nullable(),
      logo: z.string().url().optional().nullable(),
      visibility: z.enum(workspaceVisibilities).optional(),
      settings: z
        .object({
          allowPublicDiscovery: z.boolean().optional(),
        })
        .optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required'),
});

export const inviteMemberSchema = z.object({
  params: z.object({
    workspaceId: objectId,
  }),
  body: z.object({
    email: z.string().trim().email().toLowerCase(),
    role: manageableRole.default('member'),
  }),
});

export const updateMemberRoleSchema = z.object({
  params: z.object({
    workspaceId: objectId,
    memberId: objectId,
  }),
  body: z.object({
    role: memberRole,
  }),
});

export const acceptInvitationSchema = z.object({
  body: z.object({
    token: z.string().trim().min(24),
  }),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>['body'];
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>['body'];
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>['body'];
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>['body'];
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>['body'];
