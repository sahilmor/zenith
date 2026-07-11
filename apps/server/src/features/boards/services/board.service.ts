import type { BoardSummary, ColumnSummary, WorkspaceRole } from '@pm/types';
import { Types } from 'mongoose';
import { ActivityService } from '../../activity/services/activity.service.js';
import { ProjectRepository } from '../../projects/repositories/project.repository.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import { realtimeService } from '../../../sockets/realtime.service.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';
import { notificationService } from '../../notifications/services/notification.service.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import type { BoardDocument } from '../models/board.model.js';
import type { ColumnDocument } from '../models/column.model.js';
import { BoardRepository, ColumnRepository } from '../repositories/board.repository.js';
import type {
  CreateBoardInput,
  CreateColumnInput,
  ReorderColumnsInput,
  UpdateBoardInput,
  UpdateColumnInput,
} from '../validation/board.validation.js';

const boardWriteRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager']);
const defaultColumns = [
  { name: 'Todo', color: '#64748b' },
  { name: 'In Progress', color: '#3b82f6' },
  { name: 'Review', color: '#f59e0b' },
  { name: 'Done', color: '#22c55e' },
] as const;

export class BoardService {
  public constructor(
    private readonly boards = new BoardRepository(),
    private readonly columns = new ColumnRepository(),
    private readonly projects = new ProjectRepository(),
    private readonly workspaces = new WorkspaceRepository(),
    private readonly activity = new ActivityService(),
  ) {}

  public async createBoard(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateBoardInput,
  ): Promise<BoardSummary> {
    const project = await this.requireProject(projectId);
    await this.requireWorkspaceRole(project.workspaceId, userId, boardWriteRoles);
    const board = await this.boards.create({
      workspaceId: project.workspaceId,
      projectId,
      name: input.name,
      description: input.description ?? null,
      isDefault: input.isDefault,
      createdBy: userId,
    });
    await this.columns.insertMany(
      defaultColumns.map((column, order) => ({
        boardId: board._id,
        name: column.name,
        color: column.color,
        order,
      })),
    );
    await this.activity.record({
      workspaceId: project.workspaceId,
      actorId: userId,
      event: 'board.created',
      metadata: { boardId: board.id, projectId: project.id, name: board.name },
    });
    const summary = this.toBoardSummary(board);
    realtimeService.emitMutation({
      resource: 'board',
      action: 'created',
      workspaceId: summary.workspaceId,
      projectId: summary.projectId,
      boardId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    const members = await WorkspaceMemberModel.find({
      workspaceId: project.workspaceId,
      status: 'active',
      userId: { $ne: userId },
    }).exec();
    await Promise.all(
      members.map((member) =>
        notificationService.create({
          userId: member.userId,
          workspaceId: project.workspaceId,
          projectId,
          actorId: userId,
          type: 'board_created',
          boardName: board.name,
        }),
      ),
    );
    return summary;
  }

  public async listBoards(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<BoardSummary[]> {
    const project = await this.requireProject(projectId);
    await this.requireWorkspaceMembership(project.workspaceId, userId);
    const boards = await this.boards.listByProject(projectId);
    return boards.map((board) => this.toBoardSummary(board));
  }

  public async getBoard(boardId: Types.ObjectId, userId: Types.ObjectId): Promise<BoardSummary> {
    const board = await this.requireBoardAccess(boardId, userId);
    return this.toBoardSummary(board);
  }

  public async updateBoard(
    boardId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateBoardInput,
  ): Promise<BoardSummary> {
    const board = await this.requireBoardWriteAccess(boardId, userId);
    this.ensureBoardActive(board);
    const updated = await this.boards.update(boardId, input);
    if (!updated) throw new NotFoundError('Board not found');
    await this.activity.record({
      workspaceId: board.workspaceId,
      actorId: userId,
      event: 'board.updated',
      metadata: { boardId: board.id, fields: Object.keys(input) },
    });
    const summary = this.toBoardSummary(updated);
    realtimeService.emitMutation({
      resource: 'board',
      action: 'updated',
      workspaceId: summary.workspaceId,
      projectId: summary.projectId,
      boardId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async archiveBoard(
    boardId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<BoardSummary> {
    const board = await this.requireBoardWriteAccess(boardId, userId);
    if (board.archived) return this.toBoardSummary(board);
    const updated = await this.boards.update(boardId, { archived: true });
    if (!updated) throw new NotFoundError('Board not found');
    await this.activity.record({
      workspaceId: board.workspaceId,
      actorId: userId,
      event: 'board.archived',
      metadata: { boardId: board.id, projectId: board.projectId.toString() },
    });
    await auditLogService.record({
      actorId: userId,
      workspaceId: board.workspaceId,
      targetType: 'board',
      targetId: board.id,
      action: 'board.deleted',
      metadata: { archived: true, projectId: board.projectId.toString(), name: board.name },
    });
    const summary = this.toBoardSummary(updated);
    realtimeService.emitMutation({
      resource: 'board',
      action: 'archived',
      workspaceId: summary.workspaceId,
      projectId: summary.projectId,
      boardId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async restoreBoard(
    boardId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<BoardSummary> {
    const board = await this.requireBoardWriteAccess(boardId, userId);
    if (!board.archived) return this.toBoardSummary(board);
    const updated = await this.boards.update(boardId, { archived: false });
    if (!updated) throw new NotFoundError('Board not found');
    await this.activity.record({
      workspaceId: board.workspaceId,
      actorId: userId,
      event: 'board.restored',
      metadata: { boardId: board.id, projectId: board.projectId.toString() },
    });
    const summary = this.toBoardSummary(updated);
    realtimeService.emitMutation({
      resource: 'board',
      action: 'restored',
      workspaceId: summary.workspaceId,
      projectId: summary.projectId,
      boardId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async createColumn(
    boardId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateColumnInput,
  ): Promise<ColumnSummary> {
    const board = await this.requireBoardWriteAccess(boardId, userId);
    this.ensureBoardActive(board);
    const order = await this.columns.nextOrder(boardId);
    const column = await this.columns.create({
      boardId,
      name: input.name,
      color: input.color ?? null,
      limit: input.limit ?? null,
      order,
    });
    await this.activity.record({
      workspaceId: board.workspaceId,
      actorId: userId,
      event: 'column.created',
      metadata: { boardId: board.id, columnId: column.id, name: column.name },
    });
    const summary = this.toColumnSummary(column);
    realtimeService.emitMutation({
      resource: 'column',
      action: 'created',
      workspaceId: board.workspaceId.toString(),
      projectId: board.projectId.toString(),
      boardId: board.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async listColumns(
    boardId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ColumnSummary[]> {
    await this.requireBoardAccess(boardId, userId);
    const columns = await this.columns.listByBoard(boardId);
    return columns.map((column) => this.toColumnSummary(column));
  }

  public async updateColumn(
    columnId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateColumnInput,
  ): Promise<ColumnSummary> {
    const { board, column } = await this.requireColumnWriteAccess(columnId, userId);
    this.ensureBoardActive(board);
    const updated = await this.columns.update(columnId, input);
    if (!updated) throw new NotFoundError('Column not found');
    await this.activity.record({
      workspaceId: board.workspaceId,
      actorId: userId,
      event: 'column.updated',
      metadata: { boardId: board.id, columnId: column.id, fields: Object.keys(input) },
    });
    const summary = this.toColumnSummary(updated);
    realtimeService.emitMutation({
      resource: 'column',
      action: 'updated',
      workspaceId: board.workspaceId.toString(),
      projectId: board.projectId.toString(),
      boardId: board.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async deleteColumn(columnId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const { board, column } = await this.requireColumnWriteAccess(columnId, userId);
    this.ensureBoardActive(board);
    await this.columns.update(columnId, { archived: true });
    await this.activity.record({
      workspaceId: board.workspaceId,
      actorId: userId,
      event: 'column.deleted',
      metadata: { boardId: board.id, columnId: column.id, name: column.name },
    });
    realtimeService.emitMutation({
      resource: 'column',
      action: 'deleted',
      workspaceId: board.workspaceId.toString(),
      projectId: board.projectId.toString(),
      boardId: board.id,
      actorId: userId.toString(),
      data: { columnId: column.id },
    });
  }

  public async reorderColumns(
    boardId: Types.ObjectId,
    userId: Types.ObjectId,
    input: ReorderColumnsInput,
  ): Promise<ColumnSummary[]> {
    const board = await this.requireBoardWriteAccess(boardId, userId);
    this.ensureBoardActive(board);
    const existing = await this.columns.listByBoard(boardId);
    const existingIds = new Set(existing.map((column) => column.id));
    if (input.columnIds.some((columnId) => !existingIds.has(columnId))) {
      throw new NotFoundError('Column not found in board');
    }
    await Promise.all(
      input.columnIds.map((columnId, order) =>
        this.columns.updateOrder(new Types.ObjectId(columnId), order),
      ),
    );
    await this.activity.record({
      workspaceId: board.workspaceId,
      actorId: userId,
      event: 'column.reordered',
      metadata: { boardId: board.id, columnIds: input.columnIds },
    });
    const reordered = await this.columns.listByBoard(boardId);
    const summaries = reordered.map((column) => this.toColumnSummary(column));
    realtimeService.emitMutation({
      resource: 'column',
      action: 'reordered',
      workspaceId: board.workspaceId.toString(),
      projectId: board.projectId.toString(),
      boardId: board.id,
      actorId: userId.toString(),
      data: summaries,
    });
    return summaries;
  }

  private async requireProject(projectId: Types.ObjectId) {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    if (project.status === 'archived')
      throw new ForbiddenError('Archived projects cannot be modified');
    return project;
  }

  private async requireBoardAccess(
    boardId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<BoardDocument> {
    const board = await this.boards.findById(boardId);
    if (!board) throw new NotFoundError('Board not found');
    await this.requireWorkspaceMembership(board.workspaceId, userId);
    return board;
  }

  private async requireBoardWriteAccess(
    boardId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<BoardDocument> {
    const board = await this.boards.findById(boardId);
    if (!board) throw new NotFoundError('Board not found');
    await this.requireWorkspaceRole(board.workspaceId, userId, boardWriteRoles);
    return board;
  }

  private async requireColumnWriteAccess(
    columnId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<{ board: BoardDocument; column: ColumnDocument }> {
    const column = await this.columns.findById(columnId);
    if (!column) throw new NotFoundError('Column not found');
    const board = await this.requireBoardWriteAccess(column.boardId, userId);
    return { board, column };
  }

  private async requireWorkspaceMembership(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<WorkspaceRole> {
    const [workspace, membership] = await Promise.all([
      this.workspaces.findWorkspaceById(workspaceId),
      this.workspaces.findMembership(workspaceId, userId),
    ]);
    if (!workspace || workspace.archived) throw new NotFoundError('Workspace not found');
    if (!membership || membership.status !== 'active')
      throw new ForbiddenError('Workspace access denied');
    return membership.role as WorkspaceRole;
  }

  private async requireWorkspaceRole(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
    roles: ReadonlySet<WorkspaceRole>,
  ): Promise<void> {
    const role = await this.requireWorkspaceMembership(workspaceId, userId);
    if (!roles.has(role)) throw new ForbiddenError('Board manager access required');
  }

  private ensureBoardActive(board: BoardDocument): void {
    if (board.archived) throw new ForbiddenError('Archived boards cannot be modified');
  }

  private toBoardSummary(board: BoardDocument): BoardSummary {
    return {
      id: board.id,
      workspaceId: board.workspaceId.toString(),
      projectId: board.projectId.toString(),
      name: board.name,
      description: board.description ?? null,
      isDefault: board.isDefault,
      archived: board.archived,
      createdBy: board.createdBy.toString(),
      createdAt: board.createdAt.toISOString(),
      updatedAt: board.updatedAt.toISOString(),
    };
  }

  private toColumnSummary(column: ColumnDocument): ColumnSummary {
    return {
      id: column.id,
      boardId: column.boardId.toString(),
      name: column.name,
      color: column.color ?? null,
      order: column.order,
      limit: column.limit ?? null,
      archived: column.archived,
      createdAt: column.createdAt.toISOString(),
      updatedAt: column.updatedAt.toISOString(),
    };
  }
}
