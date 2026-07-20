'use client';

import type { DevOpsRepositorySummary, DevOpsWorkspaceSummary, GitProvider } from '@pm/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';

export interface DevOpsRangeFilters {
  readonly from?: string | null;
  readonly to?: string | null;
  readonly repositoryId?: string | null;
  readonly status?: string | null;
}

export interface CreateRepositoryInput {
  readonly projectId?: string | null;
  readonly provider: GitProvider;
  readonly providerRepositoryId: string;
  readonly name: string;
  readonly fullName: string;
  readonly url: string;
  readonly defaultBranch?: string;
  readonly visibility?: 'private' | 'public' | 'internal';
  readonly language?: string | null;
  readonly topics?: string[];
}

export const devOpsKeys = {
  summary: (workspaceId: string | null | undefined, filters: DevOpsRangeFilters) =>
    ['devops', workspaceId, 'summary', filters] as const,
  repositories: (workspaceId: string | null | undefined) =>
    ['devops', workspaceId, 'repositories'] as const,
};

const toQueryString = (filters: DevOpsRangeFilters): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

export function useDevOpsSummary(
  workspaceId: string | null | undefined,
  filters: DevOpsRangeFilters = {},
) {
  return useQuery({
    queryKey: devOpsKeys.summary(workspaceId, filters),
    queryFn: () =>
      apiRequest<DevOpsWorkspaceSummary>(
        `/api/workspaces/${workspaceId}/devops${toQueryString(filters)}`,
      ),
    enabled: Boolean(workspaceId),
  });
}

export function useDevOpsRepositories(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: devOpsKeys.repositories(workspaceId),
    queryFn: () =>
      apiRequest<DevOpsRepositorySummary[]>(`/api/workspaces/${workspaceId}/devops/repositories`),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateDevOpsRepository(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['devops-repository-create'],
    meta: {
      loadingTitle: 'Connecting repository',
      successTitle: 'Repository connected',
      errorTitle: 'Repository connection failed',
    },
    mutationFn: (input: CreateRepositoryInput) =>
      apiRequest<DevOpsRepositorySummary>(`/api/workspaces/${workspaceId}/devops/repositories`, {
        method: 'POST',
        body: { defaultBranch: 'main', visibility: 'private', topics: [], ...input },
      }),
    onSuccess: (repository) => {
      queryClient.setQueryData<DevOpsRepositorySummary[]>(
        devOpsKeys.repositories(workspaceId),
        (current) => {
          if (!current) return [repository];
          if (current.some((item) => item.id === repository.id)) return current;
          return [repository, ...current];
        },
      );
      queryClient.invalidateQueries({ queryKey: devOpsKeys.summary(workspaceId, {}) });
    },
  });
}
