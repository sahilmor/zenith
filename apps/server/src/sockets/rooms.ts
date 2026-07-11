import type { RealtimeRoomScope } from './socket.types.js';

export const roomName = (scope: RealtimeRoomScope, id: string): string => `${scope}:${id}`;

export const workspaceRoom = (workspaceId: string): string => roomName('workspace', workspaceId);

export const projectRoom = (projectId: string): string => roomName('project', projectId);

export const boardRoom = (boardId: string): string => roomName('board', boardId);

export const taskRoom = (taskId: string): string => roomName('task', taskId);

export const userRoom = (userId: string): string => `user:${userId}`;

export const parseRoomName = (room: string): { scope: RealtimeRoomScope; id: string } | null => {
  const [scope, id, extra] = room.split(':');
  if (extra || !id) return null;
  if (scope !== 'workspace' && scope !== 'project' && scope !== 'board' && scope !== 'task')
    return null;
  return { scope, id };
};
