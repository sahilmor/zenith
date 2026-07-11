import type {
  SubtaskSummary,
  TaskListSummary,
  TaskPriority,
  TaskStatus,
  TaskSummary,
  WorkspaceRole,
} from '@pm/types';
import { Types } from 'mongoose';
import { ActivityService } from '../../activity/services/activity.service.js';
import type { BoardDocument } from '../../boards/models/board.model.js';
import type { ColumnDocument } from '../../boards/models/column.model.js';
import { BoardRepository, ColumnRepository } from '../../boards/repositories/board.repository.js';
import { ProjectRepository } from '../../projects/repositories/project.repository.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import { realtimeService } from '../../../sockets/realtime.service.js';
import { notificationService } from '../../notifications/services/notification.service.js';
import { automationService } from '../../ai/services/automation.service.js';
import { webhookService } from '../../ops/services/webhook.service.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import {
  customFieldValueToSummary,
  customizationService,
} from '../../customization/services/customization.service.js';
import type { SubtaskDocument } from '../models/subtask.model.js';
import type { TaskDocument } from '../models/task.model.js';
import { SubtaskRepository, TaskRepository } from '../repositories/task.repository.js';
import { TaskActivityRepository } from '../repositories/task-collaboration.repository.js';
import type {
  CreateSubtaskInput,
  CreateTaskInput,
  BulkUpdateTasksInput,
  ListTasksQuery,
  ReorderTasksInput,
  UpdateSubtaskInput,
  UpdateTaskInput,
} from '../validation/task.validation.js';

const taskWriteRoles = new Set<WorkspaceRole>(['owner', 'admin', 'manager', 'member']);

export class TaskService {
  public constructor(
    private readonly tasks = new TaskRepository(),
    private readonly subtasks = new SubtaskRepository(),
    private readonly boards = new BoardRepository(),
    private readonly columns = new ColumnRepository(),
    private readonly projects = new ProjectRepository(),
    private readonly workspaces = new WorkspaceRepository(),
    private readonly activity = new ActivityService(),
    private readonly taskActivity = new TaskActivityRepository(),
  ) {}

  public async createTask(
    columnId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateTaskInput,
  ): Promise<TaskSummary> {
    const { board, column } = await this.requireColumnWriteAccess(columnId, userId);
    this.ensureColumnActive(column);
    const project = await this.requireProject(board.projectId);
    const order = await this.tasks.nextOrder(columnId);
    const customizationInput: {
      workspaceId: Types.ObjectId;
      projectId: Types.ObjectId;
      taskTypeId?: string | null;
      customFields?: Record<string, unknown>;
    } = {
      workspaceId: board.workspaceId,
      projectId: board.projectId,
    };
    if (input.customFields !== undefined) customizationInput.customFields = input.customFields;
    if (input.taskTypeId !== undefined) customizationInput.taskTypeId = input.taskTypeId;
    const customization = await customizationService.resolveTaskCustomization(customizationInput);
    const task = await this.tasks.create({
      workspaceId: board.workspaceId,
      projectId: board.projectId,
      boardId: board._id,
      columnId,
      title: input.title,
      description: input.description ?? customization.description ?? null,
      order,
      priority: input.priority ?? customization.priority,
      status: input.status,
      assigneeIds: input.assigneeIds.map((id) => new Types.ObjectId(id)),
      reporterId: userId,
      labels: input.labels.length > 0 ? input.labels : (customization.labels ?? []),
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      estimate: input.estimate ?? null,
      coverImage: input.coverImage ?? null,
      taskTypeId: customization.taskTypeId,
      workflowId: customization.workflowId,
      workflowStateId: customization.workflowStateId,
      customFields: customization.customFields,
      createdBy: userId,
    });
    await this.activity.record({
      workspaceId: board.workspaceId,
      actorId: userId,
      event: 'task.created',
      metadata: { taskId: task.id, projectId: project.id, boardId: board.id, columnId: column.id },
    });
    await this.recordTaskActivity(task, userId, 'task.created', { title: task.title });
    await Promise.all(
      task.assigneeIds.map((assigneeId) =>
        notificationService.create({
          userId: assigneeId,
          workspaceId: task.workspaceId,
          projectId: task.projectId,
          taskId: task._id,
          actorId: userId,
          type: 'task_assigned',
          taskTitle: task.title,
        }),
      ),
    );
    const summary = this.toTaskSummary(task);
    realtimeService.emitMutation({
      resource: 'task',
      action: 'created',
      workspaceId: summary.workspaceId,
      projectId: summary.projectId,
      boardId: summary.boardId,
      taskId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    void automationService.runForEvent({
      workspaceId: task.workspaceId,
      actorId: userId,
      trigger: 'task_created',
      taskId: task._id,
      fields: {
        title: task.title,
        status: task.status,
        priority: task.priority,
        columnId: task.columnId.toString(),
      },
    });
    void webhookService.emit({
      workspaceId: task.workspaceId,
      event: 'task.created',
      payload: { task: summary, actorId: userId.toString() },
    });
    return summary;
  }

  public async listTasks(columnId: Types.ObjectId, userId: Types.ObjectId): Promise<TaskSummary[]> {
    const column = await this.columns.findById(columnId);
    if (!column) throw new NotFoundError('Column not found');
    await this.requireBoardAccess(column.boardId, userId);
    const tasks = await this.tasks.listByColumn(columnId);
    return tasks.map((task) => this.toTaskSummary(task));
  }

  public async listAdvancedTasks(
    userId: Types.ObjectId,
    query: ListTasksQuery,
  ): Promise<TaskListSummary> {
    if (query.workspaceId)
      await this.requireWorkspaceMembership(new Types.ObjectId(query.workspaceId), userId);
    if (query.boardId) await this.requireBoardAccess(new Types.ObjectId(query.boardId), userId);

    const workspaceIds = query.workspaceId
      ? undefined
      : (await this.workspaces.listActiveMemberships(userId)).map(
          (membership) => membership.workspaceId,
        );
    const result = await this.tasks.list({
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      direction: query.direction,
      ...(query.workspaceId ? { workspaceId: new Types.ObjectId(query.workspaceId) } : {}),
      ...(workspaceIds ? { workspaceIds } : {}),
      ...(query.projectId ? { projectId: new Types.ObjectId(query.projectId) } : {}),
      ...(query.boardId ? { boardId: new Types.ObjectId(query.boardId) } : {}),
      ...(query.columnId ? { columnId: new Types.ObjectId(query.columnId) } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assigneeId ? { assigneeId: new Types.ObjectId(query.assigneeId) } : {}),
      ...(query.reporterId ? { reporterId: new Types.ObjectId(query.reporterId) } : {}),
      ...(query.createdBy ? { createdBy: new Types.ObjectId(query.createdBy) } : {}),
      ...(query.watchingUserId ? { watchingUserId: new Types.ObjectId(query.watchingUserId) } : {}),
      ...(query.labels?.length ? { labels: query.labels } : {}),
      ...(query.search ? { search: query.search } : {}),
      ...(query.archived !== undefined ? { archived: query.archived } : { archived: false }),
      ...(query.dueFrom ? { dueFrom: new Date(query.dueFrom) } : {}),
      ...(query.dueTo ? { dueTo: new Date(query.dueTo) } : {}),
      ...(query.createdFrom ? { createdFrom: new Date(query.createdFrom) } : {}),
      ...(query.createdTo ? { createdTo: new Date(query.createdTo) } : {}),
      ...(query.updatedFrom ? { updatedFrom: new Date(query.updatedFrom) } : {}),
      ...(query.updatedTo ? { updatedTo: new Date(query.updatedTo) } : {}),
    });
    return {
      items: result.items.map((task) => this.toTaskSummary(task)),
      page: query.page,
      limit: query.limit,
      total: result.total,
      hasMore: query.page * query.limit < result.total,
    };
  }

  public async getTask(taskId: Types.ObjectId, userId: Types.ObjectId): Promise<TaskSummary> {
    const task = await this.requireTaskAccess(taskId, userId);
    return this.toTaskSummary(task);
  }

  public async updateTask(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateTaskInput,
  ): Promise<TaskSummary> {
    const task = await this.requireTaskWriteAccess(taskId, userId);
    this.ensureTaskActive(task);
    const update = this.toTaskUpdate(input);

    if (input.columnId && input.columnId !== task.columnId.toString()) {
      const column = await this.columns.findById(new Types.ObjectId(input.columnId));
      if (!column) throw new NotFoundError('Column not found');
      if (column.boardId.toString() !== task.boardId.toString()) {
        throw new BadRequestError('Task can only move within its board');
      }
      this.ensureColumnActive(column);
      const transition = await customizationService.validateColumnMove({
        task,
        targetColumnId: column._id,
        userId,
      });
      update.columnId = column._id;
      update.order = await this.tasks.nextOrder(column._id);
      if (transition.workflowStateId) update.workflowStateId = transition.workflowStateId;
    }
    if (input.customFields !== undefined) {
      update.customFields = await customizationService.validateTaskCustomFields({
        task,
        customFields: input.customFields,
      });
    }

    const updated = await this.tasks.update(taskId, update);
    if (!updated) throw new NotFoundError('Task not found');
    await this.activity.record({
      workspaceId: task.workspaceId,
      actorId: userId,
      event: 'task.updated',
      metadata: { taskId: task.id, fields: Object.keys(input) },
    });
    await this.recordTaskActivity(updated, userId, 'task.updated', { fields: Object.keys(input) });
    if (input.assigneeIds !== undefined) {
      const previous = new Set(task.assigneeIds.map((id) => id.toString()));
      const next = new Set(updated.assigneeIds.map((id) => id.toString()));
      await Promise.all([
        ...updated.assigneeIds
          .filter((id) => !previous.has(id.toString()))
          .map((assigneeId) =>
            notificationService.create({
              userId: assigneeId,
              workspaceId: updated.workspaceId,
              projectId: updated.projectId,
              taskId: updated._id,
              actorId: userId,
              type: 'task_assigned',
              taskTitle: updated.title,
            }),
          ),
        ...task.assigneeIds
          .filter((id) => !next.has(id.toString()))
          .map((assigneeId) =>
            notificationService.create({
              userId: assigneeId,
              workspaceId: updated.workspaceId,
              projectId: updated.projectId,
              taskId: updated._id,
              actorId: userId,
              type: 'task_unassigned',
              taskTitle: updated.title,
            }),
          ),
      ]);
    }
    const summary = this.toTaskSummary(updated);
    realtimeService.emitMutation({
      resource: 'task',
      action: input.columnId ? 'moved' : 'updated',
      workspaceId: summary.workspaceId,
      projectId: summary.projectId,
      boardId: summary.boardId,
      taskId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    void automationService.runForEvent({
      workspaceId: updated.workspaceId,
      actorId: userId,
      trigger:
        input.status === 'done' ? 'task_completed' : input.columnId ? 'task_moved' : 'task_updated',
      taskId: updated._id,
      fields: {
        title: updated.title,
        status: updated.status,
        priority: updated.priority,
        columnId: updated.columnId.toString(),
        assigneeIds: updated.assigneeIds.map((id) => id.toString()),
      },
    });
    if (input.assigneeIds !== undefined) {
      void automationService.runForEvent({
        workspaceId: updated.workspaceId,
        actorId: userId,
        trigger: 'task_assigned',
        taskId: updated._id,
        fields: {
          title: updated.title,
          assigneeIds: updated.assigneeIds.map((id) => id.toString()),
        },
      });
    }
    void webhookService.emit({
      workspaceId: updated.workspaceId,
      event: 'task.updated',
      payload: { task: summary, actorId: userId.toString(), fields: Object.keys(input) },
    });
    return summary;
  }

  public async archiveTask(taskId: Types.ObjectId, userId: Types.ObjectId): Promise<TaskSummary> {
    const task = await this.requireTaskWriteAccess(taskId, userId);
    if (task.archived) return this.toTaskSummary(task);
    const updated = await this.tasks.update(taskId, { archived: true, status: 'archived' });
    if (!updated) throw new NotFoundError('Task not found');
    await this.activity.record({
      workspaceId: task.workspaceId,
      actorId: userId,
      event: 'task.archived',
      metadata: { taskId: task.id, boardId: task.boardId.toString() },
    });
    await this.recordTaskActivity(updated, userId, 'task.archived', {});
    await auditLogService.record({
      actorId: userId,
      workspaceId: updated.workspaceId,
      targetType: 'task',
      targetId: updated.id,
      action: 'task.deleted',
      metadata: { archived: true, title: updated.title, boardId: updated.boardId.toString() },
    });
    await Promise.all(
      updated.assigneeIds.map((assigneeId) =>
        notificationService.create({
          userId: assigneeId,
          workspaceId: updated.workspaceId,
          projectId: updated.projectId,
          taskId: updated._id,
          actorId: userId,
          type: 'task_archived',
          taskTitle: updated.title,
        }),
      ),
    );
    const summary = this.toTaskSummary(updated);
    realtimeService.emitMutation({
      resource: 'task',
      action: 'archived',
      workspaceId: summary.workspaceId,
      projectId: summary.projectId,
      boardId: summary.boardId,
      taskId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    void webhookService.emit({
      workspaceId: updated.workspaceId,
      event: 'task.deleted',
      payload: { task: summary, actorId: userId.toString(), archived: true },
    });
    return summary;
  }

  public async restoreTask(taskId: Types.ObjectId, userId: Types.ObjectId): Promise<TaskSummary> {
    const task = await this.requireTaskWriteAccess(taskId, userId);
    if (!task.archived) return this.toTaskSummary(task);
    const updated = await this.tasks.update(taskId, { archived: false, status: 'open' });
    if (!updated) throw new NotFoundError('Task not found');
    await this.activity.record({
      workspaceId: task.workspaceId,
      actorId: userId,
      event: 'task.restored',
      metadata: { taskId: task.id, boardId: task.boardId.toString() },
    });
    await this.recordTaskActivity(updated, userId, 'task.restored', {});
    await Promise.all(
      updated.assigneeIds.map((assigneeId) =>
        notificationService.create({
          userId: assigneeId,
          workspaceId: updated.workspaceId,
          projectId: updated.projectId,
          taskId: updated._id,
          actorId: userId,
          type: 'task_restored',
          taskTitle: updated.title,
        }),
      ),
    );
    const summary = this.toTaskSummary(updated);
    realtimeService.emitMutation({
      resource: 'task',
      action: 'restored',
      workspaceId: summary.workspaceId,
      projectId: summary.projectId,
      boardId: summary.boardId,
      taskId: summary.id,
      actorId: userId.toString(),
      data: summary,
    });
    return summary;
  }

  public async reorderTasks(
    userId: Types.ObjectId,
    input: ReorderTasksInput,
  ): Promise<TaskSummary[]> {
    const board = await this.requireBoardWriteAccess(new Types.ObjectId(input.boardId), userId);
    const boardColumns = await this.columns.listByBoard(board._id);
    const activeColumnIds = new Set(
      boardColumns.filter((column) => !column.archived).map((column) => column.id),
    );
    const suppliedColumnIds = new Set(input.columns.map((column) => column.columnId));

    for (const columnId of suppliedColumnIds) {
      if (!activeColumnIds.has(columnId)) throw new NotFoundError('Column not found in board');
    }

    const allTaskIds = input.columns.flatMap((column) => column.taskIds);
    if (new Set(allTaskIds).size !== allTaskIds.length) {
      throw new BadRequestError('Task reorder cannot contain duplicate task ids');
    }

    const boardTasks = await this.tasks.listByBoard(board._id);
    const boardTaskIds = new Set(boardTasks.map((task) => task.id));
    if (allTaskIds.some((taskId) => !boardTaskIds.has(taskId))) {
      throw new NotFoundError('Task not found in board');
    }

    await Promise.all(
      input.columns.flatMap((column) =>
        column.taskIds.map(async (taskId, order) => {
          const task = boardTasks.find((item) => item.id === taskId);
          if (!task) throw new NotFoundError('Task not found in board');
          const targetColumnId = new Types.ObjectId(column.columnId);
          const transition = await customizationService.validateColumnMove({
            task,
            targetColumnId,
            userId,
          });
          await this.tasks.update(new Types.ObjectId(taskId), {
            columnId: targetColumnId,
            order,
            ...(transition.workflowStateId ? { workflowStateId: transition.workflowStateId } : {}),
          });
        }),
      ),
    );
    await this.activity.record({
      workspaceId: board.workspaceId,
      actorId: userId,
      event: 'task.reordered',
      metadata: { boardId: board.id, columns: input.columns },
    });
    const reordered = await this.tasks.listByBoard(board._id);
    await Promise.all(
      reordered.map((task) =>
        this.recordTaskActivity(task, userId, 'task.moved', {
          columnId: task.columnId.toString(),
          order: task.order,
        }),
      ),
    );
    await Promise.all(
      reordered.flatMap((task) =>
        task.assigneeIds.map((assigneeId) =>
          notificationService.create({
            userId: assigneeId,
            workspaceId: task.workspaceId,
            projectId: task.projectId,
            taskId: task._id,
            actorId: userId,
            type: 'task_moved',
            taskTitle: task.title,
          }),
        ),
      ),
    );
    const summaries = reordered.map((task) => this.toTaskSummary(task));
    realtimeService.emitMutation({
      resource: 'task',
      action: 'reordered',
      workspaceId: board.workspaceId.toString(),
      projectId: board.projectId.toString(),
      boardId: board.id,
      actorId: userId.toString(),
      data: summaries,
    });
    return summaries;
  }

  public async bulkUpdateTasks(
    userId: Types.ObjectId,
    input: BulkUpdateTasksInput,
  ): Promise<TaskSummary[]> {
    const taskIds = input.taskIds.map((taskId) => new Types.ObjectId(taskId));
    const tasks = await Promise.all(
      taskIds.map((taskId) => this.requireTaskWriteAccess(taskId, userId)),
    );
    tasks.forEach((task) => this.ensureTaskActive(task));
    const firstBoardId = tasks[0]?.boardId.toString();
    if (input.columnId) {
      const column = await this.columns.findById(new Types.ObjectId(input.columnId));
      if (!column) throw new NotFoundError('Column not found');
      if (column.boardId.toString() !== firstBoardId) {
        throw new BadRequestError('Bulk move column must belong to the selected board');
      }
      this.ensureColumnActive(column);
    }
    if (input.columnId && tasks.some((task) => task.boardId.toString() !== firstBoardId)) {
      throw new BadRequestError('Bulk column moves must target tasks from one board');
    }

    const update = this.toTaskUpdate(input);
    if (input.archived !== undefined) {
      update.archived = input.archived;
      if (input.archived) update.status = 'archived';
      else if (input.status === undefined) update.status = 'open';
    }
    if (input.columnId) update.columnId = new Types.ObjectId(input.columnId);
    const updated = await this.tasks.bulkUpdate(taskIds, update);
    await Promise.all(
      updated.map((task) =>
        this.recordTaskActivity(task, userId, 'task.bulk_updated', { fields: Object.keys(input) }),
      ),
    );
    const summaries = updated.map((task) => this.toTaskSummary(task));
    summaries.forEach((summary) =>
      realtimeService.emitMutation({
        resource: 'task',
        action: 'updated',
        workspaceId: summary.workspaceId,
        projectId: summary.projectId,
        boardId: summary.boardId,
        taskId: summary.id,
        actorId: userId.toString(),
        data: summary,
      }),
    );
    return summaries;
  }

  public async deleteTask(taskId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    await this.archiveTask(taskId, userId);
  }

  public async createSubtask(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
    input: CreateSubtaskInput,
  ): Promise<SubtaskSummary> {
    const task = await this.requireTaskWriteAccess(taskId, userId);
    this.ensureTaskActive(task);
    const order = await this.subtasks.nextOrder(taskId);
    const subtask = await this.subtasks.create({
      taskId,
      title: input.title,
      completed: input.completed,
      order,
    });
    await this.activity.record({
      workspaceId: task.workspaceId,
      actorId: userId,
      event: 'subtask.created',
      metadata: { taskId: task.id, subtaskId: subtask.id },
    });
    return this.toSubtaskSummary(subtask);
  }

  public async listSubtasks(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<SubtaskSummary[]> {
    await this.requireTaskAccess(taskId, userId);
    const subtasks = await this.subtasks.listByTask(taskId);
    return subtasks.map((subtask) => this.toSubtaskSummary(subtask));
  }

  public async updateSubtask(
    subtaskId: Types.ObjectId,
    userId: Types.ObjectId,
    input: UpdateSubtaskInput,
  ): Promise<SubtaskSummary> {
    const { task, subtask } = await this.requireSubtaskWriteAccess(subtaskId, userId);
    this.ensureTaskActive(task);
    const updated = await this.subtasks.update(subtaskId, input);
    if (!updated) throw new NotFoundError('Subtask not found');
    await this.activity.record({
      workspaceId: task.workspaceId,
      actorId: userId,
      event: 'subtask.updated',
      metadata: { taskId: task.id, subtaskId: subtask.id, fields: Object.keys(input) },
    });
    return this.toSubtaskSummary(updated);
  }

  public async deleteSubtask(subtaskId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const { task, subtask } = await this.requireSubtaskWriteAccess(subtaskId, userId);
    await this.subtasks.delete(subtaskId);
    await this.activity.record({
      workspaceId: task.workspaceId,
      actorId: userId,
      event: 'subtask.deleted',
      metadata: { taskId: task.id, subtaskId: subtask.id },
    });
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
    const board = await this.requireBoardAccess(boardId, userId);
    this.ensureBoardActive(board);
    await this.requireWorkspaceRole(board.workspaceId, userId, taskWriteRoles);
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

  private async requireTaskAccess(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<TaskDocument> {
    const task = await this.tasks.findById(taskId);
    if (!task) throw new NotFoundError('Task not found');
    await this.requireBoardAccess(task.boardId, userId);
    return task;
  }

  private async requireTaskWriteAccess(
    taskId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<TaskDocument> {
    const task = await this.tasks.findById(taskId);
    if (!task) throw new NotFoundError('Task not found');
    await this.requireBoardWriteAccess(task.boardId, userId);
    return task;
  }

  private async requireSubtaskWriteAccess(
    subtaskId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<{ task: TaskDocument; subtask: SubtaskDocument }> {
    const subtask = await this.subtasks.findById(subtaskId);
    if (!subtask) throw new NotFoundError('Subtask not found');
    const task = await this.requireTaskWriteAccess(subtask.taskId, userId);
    return { task, subtask };
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
    if (!roles.has(role)) throw new ForbiddenError('Task write access required');
  }

  private ensureBoardActive(board: BoardDocument): void {
    if (board.archived) throw new ForbiddenError('Archived boards cannot be modified');
  }

  private ensureColumnActive(column: ColumnDocument): void {
    if (column.archived) throw new ForbiddenError('Archived columns cannot be modified');
  }

  private ensureTaskActive(task: TaskDocument): void {
    if (task.archived) throw new ForbiddenError('Archived tasks cannot be modified');
  }

  private toTaskUpdate(input: UpdateTaskInput | BulkUpdateTasksInput): Record<string, unknown> {
    const update: Record<string, unknown> = {};
    if ('title' in input && input.title !== undefined) update.title = input.title;
    if ('description' in input && input.description !== undefined)
      update.description = input.description;
    if (input.priority !== undefined) update.priority = input.priority;
    if (input.status !== undefined) update.status = input.status;
    if (input.assigneeIds !== undefined)
      update.assigneeIds = input.assigneeIds.map((id) => new Types.ObjectId(id));
    if (input.labels !== undefined) update.labels = input.labels;
    if (input.dueDate !== undefined)
      update.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    if (input.startDate !== undefined)
      update.startDate = input.startDate ? new Date(input.startDate) : null;
    if ('estimate' in input && input.estimate !== undefined) update.estimate = input.estimate;
    if ('coverImage' in input && input.coverImage !== undefined)
      update.coverImage = input.coverImage;
    if ('taskTypeId' in input && input.taskTypeId !== undefined)
      update.taskTypeId = input.taskTypeId ? new Types.ObjectId(input.taskTypeId) : null;
    if (input.status === 'archived') update.archived = true;
    return update;
  }

  private async recordTaskActivity(
    task: TaskDocument,
    userId: Types.ObjectId,
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.taskActivity.create({
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      boardId: task.boardId,
      taskId: task._id,
      userId,
      action,
      metadata,
    });
  }

  private toTaskSummary(task: TaskDocument): TaskSummary {
    return {
      id: task.id,
      workspaceId: task.workspaceId.toString(),
      projectId: task.projectId.toString(),
      boardId: task.boardId.toString(),
      columnId: task.columnId.toString(),
      title: task.title,
      description: task.description ?? null,
      order: task.order,
      priority: task.priority as TaskPriority,
      status: task.status as TaskStatus,
      assigneeIds: task.assigneeIds.map((id) => id.toString()),
      reporterId: task.reporterId.toString(),
      labels: task.labels,
      dueDate: task.dueDate?.toISOString() ?? null,
      startDate: task.startDate?.toISOString() ?? null,
      estimate: task.estimate ?? null,
      coverImage: task.coverImage ?? null,
      taskTypeId: task.taskTypeId?.toString() ?? null,
      workflowId: task.workflowId?.toString() ?? null,
      workflowStateId: task.workflowStateId ?? null,
      customFields: task.customFields.map((value) =>
        customFieldValueToSummary({
          fieldId: value.fieldId,
          key: value.key,
          fieldType: value.fieldType,
          stringValue: value.stringValue ?? null,
          numberValue: value.numberValue ?? null,
          booleanValue: value.booleanValue ?? null,
          dateValue: value.dateValue ?? null,
          userIdValue: value.userIdValue ?? null,
          optionIdValue: value.optionIdValue ?? null,
          arrayValue: value.arrayValue ?? [],
        }),
      ),
      archived: task.archived,
      createdBy: task.createdBy.toString(),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private toSubtaskSummary(subtask: SubtaskDocument): SubtaskSummary {
    return {
      id: subtask.id,
      taskId: subtask.taskId.toString(),
      title: subtask.title,
      completed: subtask.completed,
      order: subtask.order,
      createdAt: subtask.createdAt.toISOString(),
      updatedAt: subtask.updatedAt.toISOString(),
    };
  }
}

export const taskService = new TaskService();
