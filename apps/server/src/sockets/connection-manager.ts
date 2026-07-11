import type { PresenceSnapshotPayload, PresenceUserSummary } from '@pm/types';
import type { AuthenticatedSocket } from './socket.types.js';
import { parseRoomName } from './rooms.js';

interface ConnectionProfile {
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly avatar: string | null;
  lastSeen: string;
  connections: Set<string>;
}

export class ConnectionManager {
  private readonly profiles = new Map<string, ConnectionProfile>();
  private readonly roomsBySocket = new Map<string, Set<string>>();
  private readonly socketsByRoom = new Map<string, Set<string>>();

  public connect(socket: AuthenticatedSocket): void {
    const userId = socket.data.user.id;
    const existing = this.profiles.get(userId);
    if (existing) {
      existing.connections.add(socket.id);
      existing.lastSeen = new Date().toISOString();
    } else {
      this.profiles.set(userId, {
        userId,
        name: socket.data.profile.name,
        email: socket.data.profile.email,
        avatar: socket.data.profile.avatar,
        lastSeen: new Date().toISOString(),
        connections: new Set([socket.id]),
      });
    }
    this.roomsBySocket.set(socket.id, new Set());
  }

  public disconnect(socket: AuthenticatedSocket): string[] {
    const rooms = [...(this.roomsBySocket.get(socket.id) ?? [])];
    rooms.forEach((room) => this.leave(socket, room));
    this.roomsBySocket.delete(socket.id);

    const profile = this.profiles.get(socket.data.user.id);
    if (!profile) return rooms;
    profile.connections.delete(socket.id);
    profile.lastSeen = new Date().toISOString();
    return rooms;
  }

  public join(socket: AuthenticatedSocket, room: string): boolean {
    const socketRooms = this.roomsBySocket.get(socket.id) ?? new Set<string>();
    if (socketRooms.has(room)) return false;
    socketRooms.add(room);
    this.roomsBySocket.set(socket.id, socketRooms);

    const roomSockets = this.socketsByRoom.get(room) ?? new Set<string>();
    roomSockets.add(socket.id);
    this.socketsByRoom.set(room, roomSockets);
    return true;
  }

  public leave(socket: AuthenticatedSocket, room: string): boolean {
    const socketRooms = this.roomsBySocket.get(socket.id);
    if (!socketRooms?.delete(room)) return false;

    const roomSockets = this.socketsByRoom.get(room);
    roomSockets?.delete(socket.id);
    if (roomSockets?.size === 0) this.socketsByRoom.delete(room);
    return true;
  }

  public snapshot(room: string): PresenceSnapshotPayload | null {
    const parsed = parseRoomName(room);
    if (!parsed) return null;
    const socketIds = this.socketsByRoom.get(room) ?? new Set<string>();
    const userIds = new Set<string>();
    for (const socketId of socketIds) {
      const profile = [...this.profiles.values()].find((item) => item.connections.has(socketId));
      if (profile) userIds.add(profile.userId);
    }

    const users: PresenceUserSummary[] = [...userIds]
      .map((userId) => this.profiles.get(userId))
      .filter((profile): profile is ConnectionProfile => Boolean(profile))
      .map((profile) => ({
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        online: profile.connections.size > 0,
        lastSeen: profile.lastSeen,
        connectionCount: profile.connections.size,
      }));

    return { scope: parsed.scope, roomId: parsed.id, users };
  }

  public activeConnectionCount(): number {
    return [...this.profiles.values()].reduce(
      (count, profile) => count + profile.connections.size,
      0,
    );
  }
}

export const connectionManager = new ConnectionManager();
