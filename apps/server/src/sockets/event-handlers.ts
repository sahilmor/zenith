import { connectionManager } from './connection-manager.js';
import { roomName, taskRoom, userRoom } from './rooms.js';
import { SocketAuthorizationService } from './authorization.service.js';
import type { AuthenticatedSocket, JoinRoomPayload, LeaveRoomPayload } from './socket.types.js';

const authorization = new SocketAuthorizationService();
const typingTimers = new Map<string, NodeJS.Timeout>();
const typingExpiryMs = 3500;

const emitPresenceSnapshot = (socket: AuthenticatedSocket, room: string): void => {
  const snapshot = connectionManager.snapshot(room);
  if (snapshot) socket.nsp.to(room).emit('presence:snapshot', snapshot);
};

const isValidRoomPayload = (
  payload: JoinRoomPayload | LeaveRoomPayload,
): payload is JoinRoomPayload | LeaveRoomPayload =>
  Boolean(payload?.id) &&
  (payload.scope === 'workspace' ||
    payload.scope === 'project' ||
    payload.scope === 'board' ||
    payload.scope === 'task');

export const registerSocketHandlers = (socket: AuthenticatedSocket): void => {
  connectionManager.connect(socket);
  void socket.join(userRoom(socket.data.user.id));

  socket.on('room:join', (payload, ack) => {
    void (async () => {
      if (!isValidRoomPayload(payload)) {
        ack?.({ ok: false, message: 'Invalid room payload' });
        return;
      }

      const allowed = await authorization.canAccessRoom(
        payload.scope,
        payload.id,
        socket.data.user._id,
      );
      if (!allowed) {
        ack?.({ ok: false, message: 'Room access denied' });
        socket.emit('error', { message: 'Room access denied' });
        return;
      }

      const room = roomName(payload.scope, payload.id);
      const workspaceId = await authorization.getWorkspaceIdForRoom(payload.scope, payload.id);
      const joined = connectionManager.join(socket, room);
      if (joined) await socket.join(room);
      socket.data.joinedRooms.add(room);
      if (workspaceId) socket.data.roomWorkspaceIds.set(room, workspaceId.toString());
      emitPresenceSnapshot(socket, room);
      ack?.({ ok: true });
    })().catch(() => ack?.({ ok: false, message: 'Unable to join room' }));
  });

  socket.on('room:leave', (payload, ack) => {
    if (!isValidRoomPayload(payload)) {
      ack?.({ ok: false, message: 'Invalid room payload' });
      return;
    }

    const room = roomName(payload.scope, payload.id);
    const left = connectionManager.leave(socket, room);
    if (left) void socket.leave(room);
    socket.data.joinedRooms.delete(room);
    socket.data.roomWorkspaceIds.delete(room);
    emitPresenceSnapshot(socket, room);
    ack?.({ ok: true });
  });

  socket.on('typing:update', (payload) => {
    if (!payload.taskId) return;
    const room = taskRoom(payload.taskId);
    if (!socket.data.joinedRooms.has(room)) return;
    const workspaceId = socket.data.roomWorkspaceIds.get(room);
    if (!workspaceId) return;

    const typingKey = `${socket.id}:${payload.taskId}`;
    const emitTyping = (typing: boolean) => {
      socket.to(room).emit('typing:update', {
        workspaceId,
        taskId: payload.taskId,
        userId: socket.data.user.id,
        name: socket.data.profile.name,
        typing,
        timestamp: new Date().toISOString(),
      });
    };

    if (payload.typing) {
      emitTyping(true);
      const existing = typingTimers.get(typingKey);
      if (existing) clearTimeout(existing);
      typingTimers.set(
        typingKey,
        setTimeout(() => {
          emitTyping(false);
          typingTimers.delete(typingKey);
        }, typingExpiryMs),
      );
      return;
    }

    const existing = typingTimers.get(typingKey);
    if (existing) clearTimeout(existing);
    typingTimers.delete(typingKey);
    emitTyping(false);
  });

  socket.on('disconnect', () => {
    const rooms = connectionManager.disconnect(socket);
    rooms.forEach((room) => emitPresenceSnapshot(socket, room));
    [...typingTimers.keys()]
      .filter((key) => key.startsWith(`${socket.id}:`))
      .forEach((key) => {
        const timer = typingTimers.get(key);
        if (timer) clearTimeout(timer);
        typingTimers.delete(key);
      });
  });
};
