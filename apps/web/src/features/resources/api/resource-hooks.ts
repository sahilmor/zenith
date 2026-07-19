'use client';

import type {
  ResourceAllocationSummary,
  ResourceAvailabilitySummary,
  ResourceForecastSummary,
  ResourceProfileSummary,
  ResourceWorkspaceSummary,
  TimeEntrySummary,
  TimerSummary,
  TimesheetSummary,
} from '@pm/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';

export interface ResourceRangeFilters {
  readonly from?: string | null;
  readonly to?: string | null;
  readonly userId?: string | null;
  readonly projectId?: string | null;
  readonly taskId?: string | null;
}

export interface UpsertResourceProfileInput {
  readonly userId: string;
  readonly title?: string | null;
  readonly department?: string | null;
  readonly location?: string | null;
  readonly timezone?: string;
  readonly weeklyCapacityMinutes?: number;
  readonly costRate?: number | null;
  readonly billRate?: number | null;
  readonly skills?: { readonly name: string; readonly level: number }[];
  readonly competencies?: string[];
  readonly active?: boolean;
}

export interface StartTimerInput {
  readonly projectId?: string | null;
  readonly taskId?: string | null;
  readonly description?: string | null;
  readonly billable?: boolean;
  readonly startedAt?: string;
  readonly timezone?: string;
}

export interface CreateTimeEntryInput extends StartTimerInput {
  readonly userId?: string;
  readonly minutes?: number;
  readonly startedAt: string;
  readonly endedAt: string;
}

export interface CreateAllocationInput {
  readonly projectId: string;
  readonly userId: string;
  readonly role?: string | null;
  readonly allocationPercent: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly status?: 'planned' | 'active' | 'completed' | 'canceled';
  readonly notes?: string | null;
}

export interface CreateAvailabilityInput {
  readonly userId: string;
  readonly type: 'holiday' | 'leave' | 'training' | 'focus' | 'unavailable';
  readonly title: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly minutesUnavailable?: number | null;
  readonly notes?: string | null;
}

export const resourceKeys = {
  summary: (workspaceId: string | null | undefined, filters: ResourceRangeFilters) =>
    ['resources', workspaceId, 'summary', filters] as const,
  forecast: (workspaceId: string | null | undefined, filters: ResourceRangeFilters) =>
    ['resources', workspaceId, 'forecast', filters] as const,
  profiles: (workspaceId: string | null | undefined) =>
    ['resources', workspaceId, 'profiles'] as const,
  timer: (workspaceId: string | null | undefined) => ['resources', workspaceId, 'timer'] as const,
  timeEntries: (workspaceId: string | null | undefined, filters: ResourceRangeFilters) =>
    ['resources', workspaceId, 'timeEntries', filters] as const,
  timesheet: (workspaceId: string | null | undefined, filters: ResourceRangeFilters) =>
    ['resources', workspaceId, 'timesheet', filters] as const,
};

const toQueryString = (filters: ResourceRangeFilters): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

export function useResourceSummary(
  workspaceId: string | null | undefined,
  filters: ResourceRangeFilters = {},
) {
  return useQuery({
    queryKey: resourceKeys.summary(workspaceId, filters),
    queryFn: () =>
      apiRequest<ResourceWorkspaceSummary>(
        `/api/workspaces/${workspaceId}/resources${toQueryString(filters)}`,
      ),
    enabled: Boolean(workspaceId),
  });
}

export function useResourceForecast(
  workspaceId: string | null | undefined,
  filters: ResourceRangeFilters = {},
) {
  return useQuery({
    queryKey: resourceKeys.forecast(workspaceId, filters),
    queryFn: () =>
      apiRequest<ResourceForecastSummary>(
        `/api/workspaces/${workspaceId}/resources/forecast${toQueryString(filters)}`,
      ),
    enabled: Boolean(workspaceId),
  });
}

export function useResourceProfiles(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: resourceKeys.profiles(workspaceId),
    queryFn: () =>
      apiRequest<ResourceProfileSummary[]>(`/api/workspaces/${workspaceId}/resources/profiles`),
    enabled: Boolean(workspaceId),
  });
}

export function useRunningTimer(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: resourceKeys.timer(workspaceId),
    queryFn: () => apiRequest<TimerSummary | null>(`/api/workspaces/${workspaceId}/time/timer`),
    enabled: Boolean(workspaceId),
    refetchInterval: 30_000,
  });
}

export function useTimesheet(
  workspaceId: string | null | undefined,
  filters: ResourceRangeFilters = {},
) {
  return useQuery({
    queryKey: resourceKeys.timesheet(workspaceId, filters),
    queryFn: () =>
      apiRequest<TimesheetSummary>(
        `/api/workspaces/${workspaceId}/time/timesheet${toQueryString(filters)}`,
      ),
    enabled: Boolean(workspaceId),
  });
}

export function useStartTimer(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['resource-timer-start'],
    meta: {
      loadingTitle: 'Starting timer',
      successTitle: 'Timer started',
      errorTitle: 'Timer failed',
    },
    mutationFn: (input: StartTimerInput) =>
      apiRequest<TimerSummary>(`/api/workspaces/${workspaceId}/time/timer/start`, {
        method: 'POST',
        body: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, ...input },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.timer(workspaceId) }),
  });
}

export function useStopTimer(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['resource-timer-stop'],
    meta: {
      loadingTitle: 'Stopping timer',
      successTitle: 'Time logged',
      errorTitle: 'Timer stop failed',
    },
    mutationFn: (input: { readonly endedAt?: string; readonly description?: string | null } = {}) =>
      apiRequest<TimeEntrySummary>(`/api/workspaces/${workspaceId}/time/timer/stop`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.timer(workspaceId) });
      queryClient.invalidateQueries({ queryKey: ['resources', workspaceId] });
    },
  });
}

export function useCreateTimeEntry(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['resource-time-entry-create'],
    meta: {
      loadingTitle: 'Logging time',
      successTitle: 'Time logged',
      errorTitle: 'Time log failed',
    },
    mutationFn: (input: CreateTimeEntryInput) =>
      apiRequest<TimeEntrySummary>(`/api/workspaces/${workspaceId}/time/entries`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources', workspaceId] }),
  });
}

export function useUpsertResourceProfile(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['resource-profile-upsert'],
    meta: {
      loadingTitle: 'Saving profile',
      successTitle: 'Resource profile saved',
      errorTitle: 'Profile save failed',
    },
    mutationFn: (input: UpsertResourceProfileInput) =>
      apiRequest<ResourceProfileSummary>(
        `/api/workspaces/${workspaceId}/resources/profiles/${input.userId}`,
        {
          method: 'PUT',
          body: input,
        },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources', workspaceId] }),
  });
}

export function useCreateAllocation(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['resource-allocation-create'],
    meta: {
      loadingTitle: 'Creating allocation',
      successTitle: 'Allocation created',
      errorTitle: 'Allocation failed',
    },
    mutationFn: (input: CreateAllocationInput) =>
      apiRequest<ResourceAllocationSummary>(
        `/api/workspaces/${workspaceId}/resources/allocations`,
        {
          method: 'POST',
          body: input,
        },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources', workspaceId] }),
  });
}

export function useCreateAvailability(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['resource-availability-create'],
    meta: {
      loadingTitle: 'Recording availability',
      successTitle: 'Availability saved',
      errorTitle: 'Availability failed',
    },
    mutationFn: (input: CreateAvailabilityInput) =>
      apiRequest<ResourceAvailabilitySummary>(
        `/api/workspaces/${workspaceId}/resources/availability`,
        {
          method: 'POST',
          body: input,
        },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources', workspaceId] }),
  });
}
