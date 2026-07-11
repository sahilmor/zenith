import type {
  WorkspaceInvitationSummary,
  WorkspaceMemberSummary,
  WorkspaceRole,
  WorkspaceSummary,
  WorkspaceVisibility,
} from '@pm/types';

export type Workspace = WorkspaceSummary;
export type WorkspaceMember = WorkspaceMemberSummary;
export type WorkspaceInvitation = WorkspaceInvitationSummary;

export interface CreateWorkspaceInput {
  name: string;
  description?: string | null;
  visibility?: WorkspaceVisibility;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string | null;
  logo?: string | null;
  visibility?: WorkspaceVisibility;
  settings?: {
    allowPublicDiscovery?: boolean;
  };
}

export interface InviteMemberInput {
  email: string;
  role: Exclude<WorkspaceRole, 'owner'>;
}

export interface UpdateMemberRoleInput {
  role: WorkspaceRole;
}
