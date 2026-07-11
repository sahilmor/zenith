import type {
  NotificationListSummary,
  NotificationPreferencesSummary,
  NotificationSummary,
  NotificationType,
} from '@pm/types';

export type Notification = NotificationSummary;
export type NotificationList = NotificationListSummary;
export type NotificationPreferences = NotificationPreferencesSummary;
export type { NotificationType };

export interface NotificationFilters {
  page?: number;
  limit?: number;
  workspaceId?: string | null;
  isRead?: boolean;
  type?: NotificationType;
  search?: string;
  sort?: 'newest' | 'oldest';
}
