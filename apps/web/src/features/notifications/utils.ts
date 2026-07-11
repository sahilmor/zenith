import type { Notification } from './types';

export const relativeTime = (value: string): string => {
  const diff = Date.now() - new Date(value).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
};

export const notificationHref = (notification: Notification): string => {
  if (notification.taskId && notification.projectId)
    return `/dashboard/projects/${notification.projectId}/boards?taskId=${notification.taskId}`;
  if (notification.projectId) return `/dashboard/projects/${notification.projectId}`;
  if (notification.workspaceId) return '/dashboard/projects';
  return '/dashboard';
};
