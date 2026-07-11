'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { PresenceSnapshotPayload, TypingPayload } from '@pm/types';
import { useRealtimeContext } from './realtime-provider';

type RoomScope = 'workspace' | 'project' | 'board' | 'task';

export function useSocket() {
  return useRealtimeContext();
}

export function useRealtimeRoom(scope: RoomScope, id: string | null | undefined) {
  const { socket, connected } = useRealtimeContext();

  useEffect(() => {
    if (!socket || !connected || !id) return undefined;
    socket.emit('room:join', { scope, id });
    return () => {
      socket.emit('room:leave', { scope, id });
    };
  }, [connected, id, scope, socket]);
}

export function usePresence(
  scope: RoomScope,
  id: string | null | undefined,
): PresenceSnapshotPayload | null {
  const { presence } = useRealtimeContext();
  return id ? (presence[`${scope}:${id}`] ?? null) : null;
}

export function useRealtimeTasks(boardId: string | null | undefined) {
  useRealtimeRoom('board', boardId);
}

export function useRealtimeComments(taskId: string | null | undefined) {
  useRealtimeRoom('task', taskId);
}

export function useRealtimeNotifications() {
  const { notifications } = useRealtimeContext();
  return notifications;
}

export function useTyping(taskId: string | null | undefined) {
  const { socket, connected, typing } = useRealtimeContext();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingUsers = useMemo<TypingPayload[]>(
    () => (taskId ? (typing[taskId] ?? []) : []),
    [taskId, typing],
  );

  const stopTyping = useCallback(() => {
    if (!socket || !connected || !taskId) return;
    socket.emit('typing:update', { taskId, typing: false });
  }, [connected, socket, taskId]);

  const startTyping = useCallback(() => {
    if (!socket || !connected || !taskId) return;
    socket.emit('typing:update', { taskId, typing: true });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(stopTyping, 1800);
  }, [connected, socket, stopTyping, taskId]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopTyping();
    };
  }, [stopTyping]);

  return { typingUsers, startTyping, stopTyping };
}
