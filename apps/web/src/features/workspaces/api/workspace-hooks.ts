'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import type {
  CreateWorkspaceInput,
  InvitationPreview,
  InviteMemberInput,
  UpdateMemberRoleInput,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
} from '../types';

export const workspaceKeys = {
  all: ['workspaces'] as const,
  detail: (workspaceId: string | null | undefined) => ['workspaces', workspaceId] as const,
  members: (workspaceId: string | null | undefined) =>
    ['workspaces', workspaceId, 'members'] as const,
  invitations: (workspaceId: string | null | undefined) =>
    ['workspaces', workspaceId, 'invitations'] as const,
  invitationPreview: (token: string | null | undefined) =>
    ['workspaces', 'invitations', token] as const,
};

export function useWorkspaces(enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.all,
    queryFn: () => apiRequest<Workspace[]>('/api/workspaces'),
    enabled,
  });
}

export function useWorkspace(workspaceId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => apiRequest<Workspace>(`/api/workspaces/${workspaceId}`),
    enabled: enabled && Boolean(workspaceId),
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['workspace-create'],
    meta: {
      loadingTitle: 'Creating workspace',
      successTitle: 'Workspace created',
      errorTitle: 'Workspace creation failed',
    },
    mutationFn: (input: CreateWorkspaceInput) =>
      apiRequest<Workspace>('/api/workspaces', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.all }),
  });
}

export function useUpdateWorkspace(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['workspace-update'],
    meta: {
      loadingTitle: 'Updating workspace',
      successTitle: 'Workspace updated',
      errorTitle: 'Workspace update failed',
    },
    mutationFn: (input: UpdateWorkspaceInput) =>
      apiRequest<Workspace>(`/api/workspaces/${workspaceId}`, { method: 'PATCH', body: input }),
    onSuccess: (workspace) => {
      queryClient.setQueryData(workspaceKeys.detail(workspace.id), workspace);
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['workspace-archive'],
    meta: {
      loadingTitle: 'Archiving workspace',
      successTitle: 'Workspace archived',
      errorTitle: 'Workspace archive failed',
    },
    mutationFn: (workspaceId: string) =>
      apiRequest<unknown>(`/api/workspaces/${workspaceId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.all }),
  });
}

export function useMembers(workspaceId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => apiRequest<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`),
    enabled: enabled && Boolean(workspaceId),
  });
}

export function useInvitations(workspaceId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.invitations(workspaceId),
    queryFn: () => apiRequest<WorkspaceInvitation[]>(`/api/workspaces/${workspaceId}/invitations`),
    enabled: enabled && Boolean(workspaceId),
  });
}

export function useInviteMember(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['workspace-invite-member'],
    meta: {
      loadingTitle: 'Sending invitation',
      successTitle: 'Invitation sent',
      errorTitle: 'Invitation failed',
    },
    mutationFn: (input: InviteMemberInput) =>
      apiRequest<WorkspaceInvitation>(`/api/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.invitations(workspaceId) });
    },
  });
}

export function useInvitationPreview(token: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.invitationPreview(token),
    queryFn: () => apiRequest<InvitationPreview>(`/api/workspaces/invitations/${token}`),
    enabled: enabled && Boolean(token),
    retry: false,
  });
}

export function useUpdateMemberRole(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['workspace-update-member-role'],
    meta: {
      loadingTitle: 'Updating role',
      successTitle: 'Role updated',
      errorTitle: 'Role update failed',
    },
    mutationFn: ({ memberId, input }: { memberId: string; input: UpdateMemberRoleInput }) =>
      apiRequest<WorkspaceMember>(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) }),
  });
}

export function useRemoveMember(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['workspace-remove-member'],
    meta: {
      loadingTitle: 'Removing member',
      successTitle: 'Member removed',
      errorTitle: 'Remove failed',
    },
    mutationFn: (memberId: string) =>
      apiRequest<unknown>(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'DELETE',
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) }),
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['workspace-accept-invitation'],
    meta: {
      loadingTitle: 'Accepting invitation',
      successTitle: 'Invitation accepted',
      errorTitle: 'Invitation failed',
    },
    mutationFn: (token: string) =>
      apiRequest<Workspace>('/api/workspaces/invitations/accept', {
        method: 'POST',
        body: { token },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.all }),
  });
}
