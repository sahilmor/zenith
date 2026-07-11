import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationBell } from './notification-bell';

vi.mock('../api/notification-hooks', () => ({
  useNotifications: () => ({
    isLoading: false,
    data: {
      items: [
        {
          id: 'notification-1',
          userId: 'user-1',
          workspaceId: null,
          projectId: 'project-1',
          taskId: null,
          actorId: 'user-2',
          type: 'project_created',
          title: 'Project created',
          message: 'A project was created.',
          metadata: {},
          isRead: false,
          readAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    },
  }),
  useUnreadCount: () => ({ data: { count: 3 } }),
  useMarkAllAsRead: () => ({ mutate: vi.fn() }),
  useMarkAsRead: () => ({ mutate: vi.fn() }),
  useDeleteNotification: () => ({ mutate: vi.fn() }),
}));

function wrapper(children: ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('NotificationBell', () => {
  it('shows unread badge and recent notifications', () => {
    render(wrapper(<NotificationBell />));

    expect(screen.getByText('3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Project created')).toBeInTheDocument();
    expect(screen.getByText('View inbox')).toBeInTheDocument();
  });
});
