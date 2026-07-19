'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import type {
  RecentSearch,
  SavedSearch,
  SearchAnalytics,
  SearchSuggestion,
  UniversalSearchResponse,
} from '../types';

export const searchKeys = {
  results: (workspaceId: string | null | undefined, query: string, entityTypes?: string) =>
    ['search', workspaceId, query, entityTypes ?? 'all'] as const,
  suggestions: (workspaceId: string | null | undefined, query: string) =>
    ['search', workspaceId, 'suggestions', query] as const,
  recent: (workspaceId: string | null | undefined) => ['search', workspaceId, 'recent'] as const,
  saved: (workspaceId: string | null | undefined) => ['search', workspaceId, 'saved'] as const,
  trending: (workspaceId: string | null | undefined) =>
    ['search', workspaceId, 'trending'] as const,
  analytics: (workspaceId: string | null | undefined) =>
    ['search', workspaceId, 'analytics'] as const,
};

export function useUniversalSearch(input: {
  readonly workspaceId: string | null | undefined;
  readonly query: string;
  readonly entityTypes?: string;
  readonly enabled?: boolean;
}) {
  const params = new URLSearchParams();
  if (input.workspaceId) params.set('workspaceId', input.workspaceId);
  if (input.query.trim()) params.set('q', input.query.trim());
  if (input.entityTypes) params.set('entityTypes', input.entityTypes);
  return useQuery({
    queryKey: searchKeys.results(input.workspaceId, input.query, input.entityTypes),
    queryFn: () => apiRequest<UniversalSearchResponse>(`/api/search?${params.toString()}`),
    enabled: Boolean(input.workspaceId && input.enabled),
  });
}

export function useSearchSuggestions(workspaceId: string | null | undefined, query: string) {
  const params = new URLSearchParams();
  if (workspaceId) params.set('workspaceId', workspaceId);
  if (query.trim()) params.set('q', query.trim());
  return useQuery({
    queryKey: searchKeys.suggestions(workspaceId, query),
    queryFn: () => apiRequest<SearchSuggestion[]>(`/api/search/suggestions?${params.toString()}`),
    enabled: Boolean(workspaceId),
  });
}

export function useTrendingSearch(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: searchKeys.trending(workspaceId),
    queryFn: () => apiRequest(`/api/search/trending?workspaceId=${workspaceId}`),
    enabled: Boolean(workspaceId),
  });
}

export function useRecentSearches(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: searchKeys.recent(workspaceId),
    queryFn: () => apiRequest<RecentSearch[]>(`/api/search/recent?workspaceId=${workspaceId}`),
    enabled: Boolean(workspaceId),
  });
}

export function useSavedSearches(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: searchKeys.saved(workspaceId),
    queryFn: () => apiRequest<SavedSearch[]>(`/api/search/saved?workspaceId=${workspaceId}`),
    enabled: Boolean(workspaceId),
  });
}

export function useSaveSearch(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['search-save'],
    meta: {
      loadingTitle: 'Saving search',
      successTitle: 'Search saved',
      errorTitle: 'Search save failed',
    },
    mutationFn: (input: { name: string; query: string; pinned?: boolean }) =>
      apiRequest<SavedSearch>('/api/search/saved', {
        method: 'POST',
        body: { workspaceId, filters: {}, pinned: false, ...input },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: searchKeys.saved(workspaceId) }),
  });
}

export function useSearchAnalytics(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: searchKeys.analytics(workspaceId),
    queryFn: () => apiRequest<SearchAnalytics>(`/api/search/analytics?workspaceId=${workspaceId}`),
    enabled: Boolean(workspaceId),
  });
}
