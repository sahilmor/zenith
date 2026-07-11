import type { WorkspaceRole } from '@pm/types';

export const workspaceRoles = ['owner', 'admin', 'manager', 'member', 'guest'] as const;
export const workspaceMemberStatuses = ['active', 'invited', 'suspended'] as const;
export const workspaceInvitationStatuses = ['pending', 'accepted', 'expired', 'revoked'] as const;
export const workspaceVisibilities = ['private', 'public'] as const;
export const workspacePlans = ['free', 'pro', 'business', 'enterprise'] as const;

export const workspaceManagerRoles = ['owner', 'admin'] satisfies WorkspaceRole[];
