import type { RealtimeMutationPayload, RealtimeNotificationPayload } from '@pm/types';
import { randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import { boardRoom, projectRoom, taskRoom, userRoom, workspaceRoom } from './rooms.js';
import type { ClientToServerEvents, ServerToClientEvents } from './socket.types.js';

type RealtimeServer = Server<ClientToServerEvents, ServerToClientEvents>;

class RealtimeService {
  private io: RealtimeServer | null = null;

  public bind(io: RealtimeServer): void {
    this.io = io;
  }

  public emitMutation<TData>(
    input: Omit<RealtimeMutationPayload<TData>, 'id' | 'timestamp'>,
  ): void {
    if (!this.io) return;
    const payload: RealtimeMutationPayload<TData> = {
      ...input,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const rooms = new Set<string>([workspaceRoom(payload.workspaceId)]);
    if (payload.projectId) rooms.add(projectRoom(payload.projectId));
    if (payload.boardId) rooms.add(boardRoom(payload.boardId));
    if (payload.taskId) rooms.add(taskRoom(payload.taskId));

    rooms.forEach((room) => this.io?.to(room).emit('realtime:event', payload));
  }

  public emitNotification(input: Omit<RealtimeNotificationPayload, 'id' | 'timestamp'>): void {
    if (!this.io) return;
    this.io.to(userRoom(input.recipientId)).emit('notification:event', {
      ...input,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    });
  }
}

export const realtimeService = new RealtimeService();
