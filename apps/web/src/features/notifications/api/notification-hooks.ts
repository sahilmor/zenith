'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import type {
  Notification,
  NotificationFilters,
  NotificationList,
  NotificationPreferences,
} from '../types';

export const notificationKeys = {
  list: (filters: NotificationFilters = {}) => ['notifications', filters] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  preferences: ['notifications', 'preferences'] as const,
};

const toSearchParams = (filters: NotificationFilters): string => {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.workspaceId) params.set('workspaceId', filters.workspaceId);
  if (filters.isRead !== undefined) params.set('isRead', String(filters.isRead));
  if (filters.type) params.set('type', filters.type);
  if (filters.search) params.set('search', filters.search);
  if (filters.sort) params.set('sort', filters.sort);
  const query = params.toString();
  return query ? `?${query}` : '';
};

export function useNotifications(filters: NotificationFilters = {}) {
  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => apiRequest<NotificationList>(`/api/notifications${toSearchParams(filters)}`),
  });
}

export function useInfiniteNotifications(filters: NotificationFilters = {}, limit = 20) {
  return useInfiniteQuery({
    queryKey: ['notifications', 'infinite', filters, limit] as const,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiRequest<NotificationList>(
        `/api/notifications${toSearchParams({ ...filters, page: pageParam, limit })}`,
      ),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: () => apiRequest<{ count: number }>('/api/notifications/unread-count'),
    refetchInterval: 60_000,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: () => apiRequest<NotificationPreferences>('/api/notifications/preferences'),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['notification-preferences-update'],
    meta: {
      loadingTitle: 'Updating preferences',
      successTitle: 'Preferences updated',
      errorTitle: 'Preference update failed',
    },
    mutationFn: (input: Partial<NotificationPreferences>) =>
      apiRequest<NotificationPreferences>('/api/notifications/preferences', {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: (preferences) => queryClient.setQueryData(notificationKeys.preferences, preferences),
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['notification-read'],
    meta: { feedback: false },
    mutationFn: (notificationId: string) =>
      apiRequest<Notification>(`/api/notifications/${notificationId}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['notifications-read-all'],
    meta: {
      loadingTitle: 'Marking notifications read',
      successTitle: 'Notifications marked read',
      errorTitle: 'Notification update failed',
    },
    mutationFn: () =>
      apiRequest<{ updated: number }>('/api/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['notification-delete'],
    meta: { feedback: false },
    mutationFn: (notificationId: string) =>
      apiRequest<unknown>(`/api/notifications/${notificationId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useClearNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['notifications-clear'],
    meta: {
      loadingTitle: 'Clearing notifications',
      successTitle: 'Notifications cleared',
      errorTitle: 'Clear notifications failed',
    },
    mutationFn: () => apiRequest<{ deleted: number }>('/api/notifications', { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
