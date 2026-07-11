'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Dropdown } from '@/components/ui/dropdown';
import { useMarkAllAsRead, useNotifications, useUnreadCount } from '../api/notification-hooks';
import { NotificationList } from './notification-list';

export function NotificationBell() {
  const notifications = useNotifications({ page: 1, limit: 6 });
  const unread = useUnreadCount();
  const markAll = useMarkAllAsRead();
  const count = unread.data?.count ?? 0;

  return (
    <Dropdown
      trigger={
        <span className="relative inline-flex">
          <span
            className="inline-flex size-10 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Notifications"
          >
            <span className="sr-only">Notifications</span>
            <Bell className="size-4" />
          </span>
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-emerald-400 px-1.5 py-0.5 text-center text-[10px] font-semibold text-slate-950">
              {count > 99 ? '99+' : count}
            </span>
          ) : null}
        </span>
      }
    >
      <div className="w-80 p-2">
        <div className="flex items-center justify-between px-2 py-2">
          <p className="text-sm font-semibold text-white">Notifications</p>
          <button
            type="button"
            className="text-xs text-slate-400 hover:text-white"
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </button>
        </div>
        {notifications.isLoading ? (
          <p className="px-2 py-6 text-sm text-slate-500">Loading notifications...</p>
        ) : (notifications.data?.items ?? []).length > 0 ? (
          <NotificationList items={notifications.data?.items ?? []} compact />
        ) : (
          <p className="px-2 py-6 text-sm text-slate-500">No notifications yet.</p>
        )}
        <Link
          href="/dashboard/notifications"
          className="mt-2 block rounded-lg px-3 py-2 text-center text-sm text-slate-300 hover:bg-white/10 hover:text-white"
        >
          View inbox
        </Link>
      </div>
    </Dropdown>
  );
}
