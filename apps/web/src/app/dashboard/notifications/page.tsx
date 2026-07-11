'use client';

import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useClearNotifications,
  useInfiniteNotifications,
  useMarkAllAsRead,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/features/notifications/api/notification-hooks';
import { NotificationList } from '@/features/notifications/components/notification-list';
import type { NotificationFilters } from '@/features/notifications/types';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function NotificationsPage() {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [search, setSearch] = useState('');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const filters: NotificationFilters = {
    ...(workspaceId ? { workspaceId } : {}),
    ...(showUnreadOnly ? { isRead: false } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  };
  const notifications = useInfiniteNotifications(filters, 20);
  const preferences = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const markAll = useMarkAllAsRead();
  const clearAll = useClearNotifications();
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = notifications;
  const items = useMemo(
    () => notifications.data?.pages.flatMap((page) => page.items) ?? [],
    [notifications.data],
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !hasNextPage) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          eyebrow="Inbox"
          title="Notifications"
          description="Review mentions, assignments, workspace changes, and task activity."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => markAll.mutate()}>
                <CheckCheck className="size-4" />
                Mark all read
              </Button>
              <Button variant="destructive" onClick={() => clearAll.mutate()}>
                <Trash2 className="size-4" />
                Clear
              </Button>
            </div>
          }
        />
        <Card className="grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_auto]">
          <Input
            aria-label="Search notifications"
            placeholder="Search notifications"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button
            type="button"
            variant={showUnreadOnly ? 'primary' : 'secondary'}
            onClick={() => setShowUnreadOnly((current) => !current)}
          >
            Unread only
          </Button>
        </Card>
        {notifications.isLoading ? (
          <Card className="rounded-lg p-5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-4 h-16 w-full" />
            <Skeleton className="mt-3 h-16 w-full" />
          </Card>
        ) : notifications.isError ? (
          <ErrorState
            title="Unable to load notifications"
            description="Please refresh and try again."
          />
        ) : items.length > 0 ? (
          <>
            <NotificationList items={items} />
            <div ref={loadMoreRef} className="flex justify-center py-2">
              <Button
                variant="secondary"
                disabled={!hasNextPage || isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? 'Loading...' : hasNextPage ? 'Load more' : 'All caught up'}
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Bell className="mx-auto size-8 text-emerald-300" />}
            title="Inbox zero"
            description="You are caught up."
          />
        )}
        <Card className="rounded-lg p-5">
          <h2 className="text-sm font-semibold">Preferences</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                'inApp',
                'email',
                'assignments',
                'comments',
                'mentions',
                'dueDates',
                'workspace',
              ] as const
            ).map((key) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm capitalize text-slate-300"
              >
                {key.replace(/([A-Z])/g, ' $1')}
                <input
                  type="checkbox"
                  checked={Boolean(preferences.data?.[key])}
                  onChange={(event) => updatePreferences.mutate({ [key]: event.target.checked })}
                  className="size-4 accent-emerald-400"
                />
              </label>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
