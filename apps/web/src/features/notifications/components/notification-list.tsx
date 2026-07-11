'use client';

import Link from 'next/link';
import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useDeleteNotification, useMarkAsRead } from '../api/notification-hooks';
import type { Notification } from '../types';
import { notificationHref, relativeTime } from '../utils';

interface NotificationListProps {
  readonly items: Notification[];
  readonly compact?: boolean;
}

export function NotificationList({ items, compact = false }: NotificationListProps) {
  const markAsRead = useMarkAsRead();
  const deleteNotification = useDeleteNotification();

  return (
    <div className="space-y-2">
      {items.map((notification) => (
        <Card
          key={notification.id}
          className={cn(
            'rounded-lg p-3 transition',
            !notification.isRead && 'border-emerald-400/30 bg-emerald-400/[0.06]',
          )}
        >
          <div className="flex gap-3">
            <span
              className={cn(
                'mt-1 size-2 shrink-0 rounded-full bg-slate-700',
                !notification.isRead && 'bg-emerald-300',
              )}
            />
            <Link href={notificationHref(notification)} className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{notification.title}</p>
              <p className={cn('mt-1 text-sm text-slate-400', compact && 'line-clamp-2')}>
                {notification.message}
              </p>
              <p className="mt-2 text-xs text-slate-500">{relativeTime(notification.createdAt)}</p>
            </Link>
            <div className="flex shrink-0 gap-1">
              {!notification.isRead ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => markAsRead.mutate(notification.id)}
                  aria-label="Mark as read"
                >
                  <Check className="size-4" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => deleteNotification.mutate(notification.id)}
                aria-label="Delete notification"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
