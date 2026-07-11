import { Types } from 'mongoose';
import { BoardRepository } from '../features/boards/repositories/board.repository.js';
import { ProjectRepository } from '../features/projects/repositories/project.repository.js';
import { TaskRepository } from '../features/tasks/repositories/task.repository.js';
import { WorkspaceRepository } from '../features/workspaces/repositories/workspace.repository.js';
import type { RealtimeRoomScope } from './socket.types.js';

export class SocketAuthorizationService {
  public constructor(
    private readonly workspaces = new WorkspaceRepository(),
    private readonly projects = new ProjectRepository(),
    private readonly boards = new BoardRepository(),
    private readonly tasks = new TaskRepository(),
  ) {}

  public async canAccessRoom(
    scope: RealtimeRoomScope,
    id: string,
    userId: Types.ObjectId,
  ): Promise<boolean> {
    const workspaceId = await this.getWorkspaceIdForRoom(scope, id);
    if (!workspaceId) return false;

    const [workspace, membership] = await Promise.all([
      this.workspaces.findWorkspaceById(workspaceId),
      this.workspaces.findMembership(workspaceId, userId),
    ]);

    return Boolean(workspace && !workspace.archived && membership?.status === 'active');
  }

  public async getWorkspaceIdForRoom(
    scope: RealtimeRoomScope,
    id: string,
  ): Promise<Types.ObjectId | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const objectId = new Types.ObjectId(id);
    return this.resolveWorkspaceId(scope, objectId);
  }

  private async resolveWorkspaceId(
    scope: RealtimeRoomScope,
    id: Types.ObjectId,
  ): Promise<Types.ObjectId | null> {
    if (scope === 'workspace') return id;
    if (scope === 'project') return (await this.projects.findById(id))?.workspaceId ?? null;
    if (scope === 'board') return (await this.boards.findById(id))?.workspaceId ?? null;
    return (await this.tasks.findById(id))?.workspaceId ?? null;
  }
}
