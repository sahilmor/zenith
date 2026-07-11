'use client';

import type {
  AnalyticsDashboardSummary,
  AnalyticsReportFormat,
  AnalyticsReportScope,
  AnalyticsReportSummary,
  TaskPriority,
  TaskStatus,
} from '@pm/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiDownloadRequest, apiRequest } from '@/lib/api/client';

export interface AnalyticsFilters {
  readonly workspaceId?: string | null;
  readonly projectId?: string | null;
  readonly boardId?: string | null;
  readonly userId?: string | null;
  readonly from?: string | null;
  readonly to?: string | null;
  readonly status?: TaskStatus | null;
  readonly priority?: TaskPriority | null;
  readonly search?: string | null;
}

export interface ReportRequest extends AnalyticsFilters {
  readonly scope: AnalyticsReportScope;
  readonly format: AnalyticsReportFormat;
}

export const analyticsKeys = {
  dashboard: (filters: AnalyticsFilters) => ['analytics', 'dashboard', filters] as const,
  workspace: (workspaceId: string | null | undefined, filters: AnalyticsFilters) =>
    ['analytics', 'workspace', workspaceId, filters] as const,
  project: (projectId: string | null | undefined, filters: AnalyticsFilters) =>
    ['analytics', 'project', projectId, filters] as const,
  board: (boardId: string | null | undefined, filters: AnalyticsFilters) =>
    ['analytics', 'board', boardId, filters] as const,
  user: (userId: string | null | undefined, filters: AnalyticsFilters) =>
    ['analytics', 'user', userId, filters] as const,
};

type QueryValue = string | number | null | undefined;

const toQueryString = (filters: object): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    const queryValue = value as QueryValue;
    if (queryValue === undefined || queryValue === null || queryValue === '') return;
    params.set(key, String(queryValue));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

export function useDashboardAnalytics(filters: AnalyticsFilters, enabled = true) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(filters),
    queryFn: () =>
      apiRequest<AnalyticsDashboardSummary>(`/api/analytics/dashboard${toQueryString(filters)}`),
    enabled: enabled && Boolean(filters.workspaceId),
  });
}

export function useWorkspaceAnalytics(
  workspaceId: string | null | undefined,
  filters: AnalyticsFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: analyticsKeys.workspace(workspaceId, filters),
    queryFn: () =>
      apiRequest<AnalyticsDashboardSummary>(
        `/api/analytics/workspace/${workspaceId}${toQueryString(filters)}`,
      ),
    enabled: enabled && Boolean(workspaceId),
  });
}

export function useProjectAnalytics(
  projectId: string | null | undefined,
  filters: AnalyticsFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: analyticsKeys.project(projectId, filters),
    queryFn: () =>
      apiRequest<AnalyticsDashboardSummary>(
        `/api/analytics/projects/${projectId}${toQueryString(filters)}`,
      ),
    enabled: enabled && Boolean(projectId),
  });
}

export function useBoardAnalytics(
  boardId: string | null | undefined,
  filters: AnalyticsFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: analyticsKeys.board(boardId, filters),
    queryFn: () =>
      apiRequest<AnalyticsDashboardSummary>(
        `/api/analytics/boards/${boardId}${toQueryString(filters)}`,
      ),
    enabled: enabled && Boolean(boardId),
  });
}

export function useUserAnalytics(
  userId: string | null | undefined,
  filters: AnalyticsFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: analyticsKeys.user(userId, filters),
    queryFn: () =>
      apiRequest<AnalyticsDashboardSummary>(
        `/api/analytics/users/${userId}${toQueryString(filters)}`,
      ),
    enabled: enabled && Boolean(userId) && Boolean(filters.workspaceId),
  });
}

export function useReportPreview(filters: ReportRequest, enabled = true) {
  return useQuery({
    queryKey: ['analytics', 'report', filters],
    queryFn: () =>
      apiRequest<AnalyticsReportSummary>(
        `/api/analytics/reports${toQueryString({ ...filters, format: 'json' })}`,
      ),
    enabled:
      enabled &&
      Boolean(filters.workspaceId ?? filters.projectId ?? filters.boardId ?? filters.userId),
  });
}

export function useExportReport() {
  return useMutation({
    mutationKey: ['analytics-report-export'],
    meta: {
      loadingTitle: 'Preparing report',
      successTitle: 'Report exported',
      errorTitle: 'Report export failed',
    },
    mutationFn: async (filters: ReportRequest) => {
      const download = await apiDownloadRequest(`/api/analytics/reports${toQueryString(filters)}`);
      const url = URL.createObjectURL(download.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = download.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return download.fileName;
    },
  });
}
