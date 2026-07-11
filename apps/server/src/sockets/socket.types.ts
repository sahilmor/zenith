import type {
  PresenceSnapshotPayload,
  RealtimeMutationPayload,
  RealtimeNotificationPayload,
  TypingPayload,
} from '@pm/types';
import type { Socket } from 'socket.io';
import type { AuthenticatedUser } from '../types/auth.js';

export type RealtimeRoomScope = 'workspace' | 'project' | 'board' | 'task';

export interface JoinRoomPayload {
  readonly scope: RealtimeRoomScope;
  readonly id: string;
}

export interface LeaveRoomPayload {
  readonly scope: RealtimeRoomScope;
  readonly id: string;
}

export interface TypingClientPayload {
  readonly taskId: string;
  readonly typing: boolean;
}

export interface ServerToClientEvents {
  'presence:snapshot': (payload: PresenceSnapshotPayload) => void;
  'presence:user-online': (payload: PresenceSnapshotPayload) => void;
  'presence:user-offline': (payload: PresenceSnapshotPayload) => void;
  'realtime:event': (payload: RealtimeMutationPayload) => void;
  'notification:event': (payload: RealtimeNotificationPayload) => void;
  'typing:update': (payload: TypingPayload) => void;
  error: (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  'room:join': (payload: JoinRoomPayload, ack?: (response: SocketAck) => void) => void;
  'room:leave': (payload: LeaveRoomPayload, ack?: (response: SocketAck) => void) => void;
  'typing:update': (payload: TypingClientPayload) => void;
}

export interface SocketAck {
  readonly ok: boolean;
  readonly message?: string;
}

export interface SocketData {
  user: AuthenticatedUser;
  profile: {
    readonly name: string;
    readonly email: string;
    readonly avatar: string | null;
  };
  joinedRooms: Set<string>;
  roomWorkspaceIds: Map<string, string>;
}

export type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  never,
  SocketData
>;
