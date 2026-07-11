'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import type { CreateProjectInput, Project, UpdateProjectInput } from '../types';

export const projectKeys = {
  byWorkspace: (workspaceId: string | null | undefined) =>
    ['workspaces', workspaceId, 'projects'] as const,
  detail: (projectId: string | null | undefined) => ['projects', projectId] as const,
};

export function useProjects(workspaceId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: projectKeys.byWorkspace(workspaceId),
    queryFn: () => apiRequest<Project[]>(`/api/workspaces/${workspaceId}/projects`),
    enabled: enabled && Boolean(workspaceId),
  });
}

export function useProject(projectId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => apiRequest<Project>(`/api/projects/${projectId}`),
    enabled: enabled && Boolean(projectId),
  });
}

export function useCreateProject(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['project-create'],
    meta: {
      loadingTitle: 'Creating project',
      successTitle: 'Project created',
      errorTitle: 'Project creation failed',
    },
    mutationFn: (input: CreateProjectInput) =>
      apiRequest<Project>(`/api/workspaces/${workspaceId}/projects`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: projectKeys.byWorkspace(workspaceId) }),
  });
}

export function useUpdateProject(projectId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['project-update'],
    meta: {
      loadingTitle: 'Updating project',
      successTitle: 'Project updated',
      errorTitle: 'Project update failed',
    },
    mutationFn: (input: UpdateProjectInput) =>
      apiRequest<Project>(`/api/projects/${projectId}`, { method: 'PATCH', body: input }),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      queryClient.invalidateQueries({ queryKey: projectKeys.byWorkspace(project.workspaceId) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['project-delete'],
    meta: {
      loadingTitle: 'Deleting project',
      successTitle: 'Project deleted',
      errorTitle: 'Project delete failed',
    },
    mutationFn: (project: Project) =>
      apiRequest<unknown>(`/api/projects/${project.id}`, { method: 'DELETE' }).then(() => project),
    onSuccess: (project) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(project.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.byWorkspace(project.workspaceId) });
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['project-archive'],
    meta: {
      loadingTitle: 'Archiving project',
      successTitle: 'Project archived',
      errorTitle: 'Project archive failed',
    },
    mutationFn: (project: Project) =>
      apiRequest<Project>(`/api/projects/${project.id}/archive`, { method: 'POST' }),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      queryClient.invalidateQueries({ queryKey: projectKeys.byWorkspace(project.workspaceId) });
    },
  });
}

export function useRestoreProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['project-restore'],
    meta: {
      loadingTitle: 'Restoring project',
      successTitle: 'Project restored',
      errorTitle: 'Project restore failed',
    },
    mutationFn: (project: Project) =>
      apiRequest<Project>(`/api/projects/${project.id}/restore`, { method: 'POST' }),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      queryClient.invalidateQueries({ queryKey: projectKeys.byWorkspace(project.workspaceId) });
    },
  });
}
