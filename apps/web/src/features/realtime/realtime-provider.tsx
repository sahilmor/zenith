'use client';

import type {
  PresenceSnapshotPayload,
  RealtimeMutationPayload,
  RealtimeNotificationPayload,
  TypingPayload,
} from '@pm/types';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { boardKeys } from '@/features/boards/api/board-hooks';
import { notificationKeys } from '@/features/notifications/api/notification-hooks';
import { projectKeys } from '@/features/projects/api/project-hooks';
import { collaborationKeys } from '@/features/tasks/api/task-collaboration-hooks';
import { taskKeys } from '@/features/tasks/api/task-hooks';
import { workspaceKeys } from '@/features/workspaces/api/workspace-hooks';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { createRealtimeSocket, type RealtimeSocket } from './socket-client';

interface RealtimeContextValue {
  readonly socket: RealtimeSocket | null;
  readonly connected: boolean;
  readonly presence: Record<string, PresenceSnapshotPayload>;
  readonly notifications: RealtimeNotificationPayload[];
  readonly typing: Record<string, TypingPayload[]>;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const presenceKey = (payload: PresenceSnapshotPayload): string =>
  `${payload.scope}:${payload.roomId}`;

export function RealtimeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<RealtimeSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Record<string, PresenceSnapshotPayload>>({});
  const [notifications, setNotifications] = useState<RealtimeNotificationPayload[]>([]);
  const [typing, setTyping] = useState<Record<string, TypingPayload[]>>({});

  useEffect(() => {
    if (!accessToken) {
      setSocket(null);
      setConnected(false);
      return undefined;
    }

    const nextSocket = createRealtimeSocket(accessToken);
    setSocket(nextSocket);

    nextSocket.on('connect', () => setConnected(true));
    nextSocket.on('disconnect', () => setConnected(false));
    nextSocket.on('presence:snapshot', (payload: PresenceSnapshotPayload) =>
      setPresence((current) => ({ ...current, [presenceKey(payload)]: payload })),
    );
    nextSocket.on('notification:event', (payload: RealtimeNotificationPayload) => {
      setNotifications((current) => [payload, ...current].slice(0, 50));
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    });
    nextSocket.on('typing:update', (payload: TypingPayload) => {
      setTyping((current) => {
        const users = current[payload.taskId] ?? [];
        const filtered = users.filter((item) => item.userId !== payload.userId);
        return {
          ...current,
          [payload.taskId]: payload.typing ? [...filtered, payload] : filtered,
        };
      });
    });
    nextSocket.on('realtime:event', (payload: RealtimeMutationPayload) => {
      if (payload.resource === 'notification') {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
        return;
      }
      if (payload.actorId === userId) return;
      if (payload.workspaceId) {
        void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
        void queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(payload.workspaceId) });
      }
      if (payload.resource === 'member') {
        void queryClient.invalidateQueries({
          queryKey: workspaceKeys.members(payload.workspaceId),
        });
        void queryClient.invalidateQueries({
          queryKey: workspaceKeys.invitations(payload.workspaceId),
        });
      }
      if (payload.projectId) {
        void queryClient.invalidateQueries({ queryKey: projectKeys.detail(payload.projectId) });
        void queryClient.invalidateQueries({
          queryKey: boardKeys.byProject(payload.projectId),
        });
      }
      if (payload.workspaceId && payload.resource === 'project') {
        void queryClient.invalidateQueries({
          queryKey: projectKeys.byWorkspace(payload.workspaceId),
        });
      }
      if (payload.boardId) {
        void queryClient.invalidateQueries({ queryKey: boardKeys.detail(payload.boardId) });
        void queryClient.invalidateQueries({ queryKey: boardKeys.columns(payload.boardId) });
      }
      if (payload.resource === 'task' && payload.boardId) {
        void queryClient.invalidateQueries({ queryKey: ['columns'] });
        void queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
      }
      if (payload.taskId) {
        void queryClient.invalidateQueries({ queryKey: taskKeys.detail(payload.taskId) });
        void queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(payload.taskId) });
        void queryClient.invalidateQueries({
          queryKey: collaborationKeys.comments(payload.taskId),
        });
        void queryClient.invalidateQueries({
          queryKey: collaborationKeys.attachments(payload.taskId),
        });
        void queryClient.invalidateQueries({
          queryKey: collaborationKeys.activity(payload.taskId),
        });
        void queryClient.invalidateQueries({ queryKey: collaborationKeys.labels(payload.taskId) });
      }
    });

    nextSocket.connect();

    return () => {
      nextSocket.removeAllListeners();
      nextSocket.disconnect();
      setSocket((current) => (current === nextSocket ? null : current));
      setConnected(false);
    };
  }, [accessToken, queryClient, userId]);

  useEffect(() => {
    if (!socket || !connected || !workspaceId) return undefined;
    socket.emit('room:join', { scope: 'workspace', id: workspaceId });
    return () => {
      socket.emit('room:leave', { scope: 'workspace', id: workspaceId });
    };
  }, [connected, socket, workspaceId]);

  const value = useMemo(
    () => ({ socket, connected, presence, notifications, typing }),
    [connected, notifications, presence, socket, typing],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtimeContext = (): RealtimeContextValue => {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtimeContext must be used inside RealtimeProvider');
  return context;
};
