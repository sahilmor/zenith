import type { TaskPriority, TaskStatus } from '@pm/types';
import type { FilterQuery, Types } from 'mongoose';
import { SubtaskModel, type SubtaskDocument } from '../models/subtask.model.js';
import { TaskModel, type TaskDocument } from '../models/task.model.js';
import { TaskWatcherModel } from '../models/task-watcher.model.js';

export interface TaskListFilters {
  readonly workspaceId?: Types.ObjectId;
  readonly workspaceIds?: Types.ObjectId[];
  readonly projectId?: Types.ObjectId;
  readonly boardId?: Types.ObjectId;
  readonly columnId?: Types.ObjectId;
  readonly status?: TaskStatus;
  readonly priority?: TaskPriority;
  readonly assigneeId?: Types.ObjectId;
  readonly reporterId?: Types.ObjectId;
  readonly createdBy?: Types.ObjectId;
  readonly watchingUserId?: Types.ObjectId;
  readonly labels?: string[];
  readonly search?: string;
  readonly archived?: boolean;
  readonly dueFrom?: Date;
  readonly dueTo?: Date;
  readonly createdFrom?: Date;
  readonly createdTo?: Date;
  readonly updatedFrom?: Date;
  readonly updatedTo?: Date;
  readonly page: number;
  readonly limit: number;
  readonly sort: 'priority' | 'dueDate' | 'createdAt' | 'updatedAt' | 'title' | 'manual';
  readonly direction: 'asc' | 'desc';
}

export class TaskRepository {
  public async create(input: {
    workspaceId: Types.ObjectId;
    projectId: Types.ObjectId;
    boardId: Types.ObjectId;
    columnId: Types.ObjectId;
    title: string;
    description?: string | null;
    order: number;
    priority?: TaskPriority;
    status?: TaskStatus;
    assigneeIds?: Types.ObjectId[];
    reporterId: Types.ObjectId;
    labels?: string[];
    dueDate?: Date | null;
    startDate?: Date | null;
    estimate?: number | null;
    coverImage?: string | null;
    taskTypeId?: Types.ObjectId | null;
    workflowId?: Types.ObjectId | null;
    workflowStateId?: string | null;
    customFields?: unknown[];
    createdBy: Types.ObjectId;
  }): Promise<TaskDocument> {
    return TaskModel.create(input) as Promise<TaskDocument>;
  }

  public async findById(taskId: Types.ObjectId): Promise<TaskDocument | null> {
    return TaskModel.findById(taskId).exec() as Promise<TaskDocument | null>;
  }

  public async listByColumn(columnId: Types.ObjectId): Promise<TaskDocument[]> {
    return TaskModel.find({ columnId, archived: false })
      .sort({ order: 1, createdAt: 1 })
      .exec() as Promise<TaskDocument[]>;
  }

  public async listByBoard(boardId: Types.ObjectId): Promise<TaskDocument[]> {
    return TaskModel.find({ boardId, archived: false })
      .sort({ columnId: 1, order: 1, createdAt: 1 })
      .exec() as Promise<TaskDocument[]>;
  }

  public async list(filters: TaskListFilters): Promise<{ items: TaskDocument[]; total: number }> {
    const query = await this.toListQuery(filters);
    const skip = (filters.page - 1) * filters.limit;
    const sort = this.toSort(filters.sort, filters.direction);
    const [items, total] = await Promise.all([
      TaskModel.find(query).sort(sort).skip(skip).limit(filters.limit).exec() as Promise<
        TaskDocument[]
      >,
      TaskModel.countDocuments(query).exec(),
    ]);
    return { items, total };
  }

  public async nextOrder(columnId: Types.ObjectId): Promise<number> {
    const task = await TaskModel.findOne({ columnId, archived: false }).sort({ order: -1 }).exec();
    return task ? task.order + 1 : 0;
  }

  public async update(
    taskId: Types.ObjectId,
    update: Record<string, unknown>,
  ): Promise<TaskDocument | null> {
    return TaskModel.findByIdAndUpdate(taskId, update, {
      new: true,
    }).exec() as Promise<TaskDocument | null>;
  }

  public async updatePlacement(
    taskId: Types.ObjectId,
    columnId: Types.ObjectId,
    order: number,
  ): Promise<void> {
    await TaskModel.updateOne({ _id: taskId }, { columnId, order }).exec();
  }

  public async bulkUpdate(
    taskIds: Types.ObjectId[],
    update: Record<string, unknown>,
  ): Promise<TaskDocument[]> {
    await TaskModel.updateMany({ _id: { $in: taskIds } }, update).exec();
    return TaskModel.find({ _id: { $in: taskIds } })
      .sort({ updatedAt: -1 })
      .exec() as Promise<TaskDocument[]>;
  }

  private async toListQuery(filters: TaskListFilters): Promise<FilterQuery<TaskDocument>> {
    const query: FilterQuery<TaskDocument> = {};
    if (filters.workspaceId) query.workspaceId = filters.workspaceId;
    if (filters.workspaceIds?.length) query.workspaceId = { $in: filters.workspaceIds };
    if (filters.projectId) query.projectId = filters.projectId;
    if (filters.boardId) query.boardId = filters.boardId;
    if (filters.columnId) query.columnId = filters.columnId;
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assigneeId) query.assigneeIds = filters.assigneeId;
    if (filters.reporterId) query.reporterId = filters.reporterId;
    if (filters.createdBy) query.createdBy = filters.createdBy;
    if (filters.watchingUserId) {
      const watched = await TaskWatcherModel.find({ userId: filters.watchingUserId })
        .select('taskId')
        .exec();
      query._id = { $in: watched.map((watcher) => watcher.taskId) };
    }
    if (filters.labels?.length) query.labels = { $all: filters.labels };
    if (filters.archived !== undefined) query.archived = filters.archived;
    if (filters.search) query.$or = [{ title: { $regex: filters.search, $options: 'i' } }];
    if (filters.dueFrom || filters.dueTo) {
      query.dueDate = {
        ...(filters.dueFrom ? { $gte: filters.dueFrom } : {}),
        ...(filters.dueTo ? { $lte: filters.dueTo } : {}),
      };
    }
    if (filters.createdFrom || filters.createdTo) {
      query.createdAt = {
        ...(filters.createdFrom ? { $gte: filters.createdFrom } : {}),
        ...(filters.createdTo ? { $lte: filters.createdTo } : {}),
      };
    }
    if (filters.updatedFrom || filters.updatedTo) {
      query.updatedAt = {
        ...(filters.updatedFrom ? { $gte: filters.updatedFrom } : {}),
        ...(filters.updatedTo ? { $lte: filters.updatedTo } : {}),
      };
    }
    return query;
  }

  private toSort(
    sort: TaskListFilters['sort'],
    direction: TaskListFilters['direction'],
  ): Record<string, 1 | -1> {
    const value = direction === 'asc' ? 1 : -1;
    if (sort === 'manual') return { order: value, createdAt: 1 };
    if (sort === 'title') return { title: value };
    if (sort === 'priority') return { priority: value, dueDate: 1 };
    return { [sort]: value, createdAt: -1 };
  }
}

export class SubtaskRepository {
  public async create(input: {
    taskId: Types.ObjectId;
    title: string;
    completed?: boolean;
    order: number;
  }): Promise<SubtaskDocument> {
    return SubtaskModel.create(input) as Promise<SubtaskDocument>;
  }

  public async findById(subtaskId: Types.ObjectId): Promise<SubtaskDocument | null> {
    return SubtaskModel.findById(subtaskId).exec() as Promise<SubtaskDocument | null>;
  }

  public async listByTask(taskId: Types.ObjectId): Promise<SubtaskDocument[]> {
    return SubtaskModel.find({ taskId }).sort({ order: 1, createdAt: 1 }).exec() as Promise<
      SubtaskDocument[]
    >;
  }

  public async nextOrder(taskId: Types.ObjectId): Promise<number> {
    const subtask = await SubtaskModel.findOne({ taskId }).sort({ order: -1 }).exec();
    return subtask ? subtask.order + 1 : 0;
  }

  public async update(
    subtaskId: Types.ObjectId,
    update: Record<string, unknown>,
  ): Promise<SubtaskDocument | null> {
    return SubtaskModel.findByIdAndUpdate(subtaskId, update, {
      new: true,
    }).exec() as Promise<SubtaskDocument | null>;
  }

  public async delete(subtaskId: Types.ObjectId): Promise<SubtaskDocument | null> {
    return SubtaskModel.findByIdAndDelete(subtaskId).exec() as Promise<SubtaskDocument | null>;
  }
}
