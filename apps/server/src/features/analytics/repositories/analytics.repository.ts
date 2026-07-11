import type { TaskPriority, TaskStatus } from '@pm/types';
import type { FilterQuery, Types } from 'mongoose';
import { ActivityEventModel } from '../../activity/models/activity-event.model.js';
import { BoardModel } from '../../boards/models/board.model.js';
import { ColumnModel } from '../../boards/models/column.model.js';
import { ProjectModel } from '../../projects/models/project.model.js';
import { TaskActivityModel } from '../../tasks/models/task-activity.model.js';
import { TaskModel, type TaskDocument } from '../../tasks/models/task.model.js';
import { WorkspaceMemberModel } from '../../workspaces/models/workspace-member.model.js';

export interface AnalyticsScopeQuery {
  readonly workspaceId?: Types.ObjectId;
  readonly projectId?: Types.ObjectId;
  readonly boardId?: Types.ObjectId;
  readonly userId?: Types.ObjectId;
  readonly from?: Date;
  readonly to?: Date;
  readonly status?: TaskStatus;
  readonly priority?: TaskPriority;
  readonly search?: string;
}

export interface CountBucket {
  readonly key: string;
  readonly value: number;
}

export class AnalyticsRepository {
  public taskFilter(
    scope: AnalyticsScopeQuery,
    includeArchived = false,
  ): FilterQuery<TaskDocument> {
    const filter: FilterQuery<TaskDocument> = {};
    if (scope.workspaceId) filter.workspaceId = scope.workspaceId;
    if (scope.projectId) filter.projectId = scope.projectId;
    if (scope.boardId) filter.boardId = scope.boardId;
    if (scope.userId) filter.assigneeIds = scope.userId;
    if (scope.status) filter.status = scope.status;
    if (scope.priority) filter.priority = scope.priority;
    if (!includeArchived) filter.archived = false;
    if (scope.search) filter.title = { $regex: scope.search, $options: 'i' };
    if (scope.from || scope.to) {
      filter.createdAt = {
        ...(scope.from ? { $gte: scope.from } : {}),
        ...(scope.to ? { $lte: scope.to } : {}),
      };
    }
    return filter;
  }

  public async countTasks(scope: AnalyticsScopeQuery, includeArchived = false): Promise<number> {
    return TaskModel.countDocuments(this.taskFilter(scope, includeArchived)).exec();
  }

  public async countOpen(scope: AnalyticsScopeQuery): Promise<number> {
    return TaskModel.countDocuments({
      ...this.taskFilter(scope),
      status: { $ne: 'done' },
    }).exec();
  }

  public async countCompleted(scope: AnalyticsScopeQuery): Promise<number> {
    return TaskModel.countDocuments({ ...this.taskFilter(scope), status: 'done' }).exec();
  }

  public async countArchived(scope: AnalyticsScopeQuery): Promise<number> {
    return TaskModel.countDocuments({
      ...this.taskFilter(scope, true),
      $or: [{ archived: true }, { status: 'archived' }],
    }).exec();
  }

  public async countOverdue(scope: AnalyticsScopeQuery, now: Date): Promise<number> {
    return TaskModel.countDocuments({
      ...this.taskFilter(scope),
      dueDate: { $lt: now },
      status: { $ne: 'done' },
    }).exec();
  }

  public async countUpcoming(scope: AnalyticsScopeQuery, now: Date, until: Date): Promise<number> {
    return TaskModel.countDocuments({
      ...this.taskFilter(scope),
      dueDate: { $gte: now, $lte: until },
      status: { $ne: 'done' },
    }).exec();
  }

  public async countByField(
    scope: AnalyticsScopeQuery,
    field: 'status' | 'priority',
  ): Promise<CountBucket[]> {
    return TaskModel.aggregate<CountBucket>([
      { $match: this.taskFilter(scope) },
      { $group: { _id: `$${field}`, value: { $sum: 1 } } },
      { $project: { _id: 0, key: { $toString: '$_id' }, value: 1 } },
      { $sort: { value: -1 } },
    ]).exec();
  }

  public async countByArrayField(
    scope: AnalyticsScopeQuery,
    field: 'assigneeIds' | 'labels',
  ): Promise<CountBucket[]> {
    return TaskModel.aggregate<CountBucket>([
      { $match: this.taskFilter(scope) },
      { $unwind: { path: `$${field}`, preserveNullAndEmptyArrays: false } },
      { $group: { _id: `$${field}`, value: { $sum: 1 } } },
      { $project: { _id: 0, key: { $toString: '$_id' }, value: 1 } },
      { $sort: { value: -1 } },
      { $limit: 12 },
    ]).exec();
  }

  public async countPerColumn(scope: AnalyticsScopeQuery): Promise<CountBucket[]> {
    return TaskModel.aggregate<CountBucket>([
      { $match: this.taskFilter(scope) },
      { $group: { _id: '$columnId', value: { $sum: 1 } } },
      {
        $lookup: {
          from: 'columns',
          localField: '_id',
          foreignField: '_id',
          as: 'column',
        },
      },
      { $unwind: '$column' },
      { $project: { _id: 0, key: { $toString: '$_id' }, label: '$column.name', value: 1 } },
      { $sort: { 'column.order': 1 } },
    ]).exec();
  }

  public async trendByCompletion(scope: AnalyticsScopeQuery): Promise<CountBucket[]> {
    return TaskModel.aggregate<CountBucket>([
      { $match: { ...this.taskFilter(scope), status: 'done' } },
      {
        $group: {
          _id: { $dateToString: { date: '$updatedAt', format: '%Y-%m-%d' } },
          value: { $sum: 1 },
        },
      },
      { $project: { _id: 0, key: '$_id', value: 1 } },
      { $sort: { key: 1 } },
      { $limit: 60 },
    ]).exec();
  }

  public async trendByActivity(scope: AnalyticsScopeQuery): Promise<CountBucket[]> {
    const filter: Record<string, unknown> = {};
    if (scope.workspaceId) filter.workspaceId = scope.workspaceId;
    if (scope.projectId) filter.projectId = scope.projectId;
    if (scope.boardId) filter.boardId = scope.boardId;
    if (scope.userId) filter.userId = scope.userId;
    if (scope.from || scope.to) {
      filter.createdAt = {
        ...(scope.from ? { $gte: scope.from } : {}),
        ...(scope.to ? { $lte: scope.to } : {}),
      };
    }
    return TaskActivityModel.aggregate<CountBucket>([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d' } },
          value: { $sum: 1 },
        },
      },
      { $project: { _id: 0, key: '$_id', value: 1 } },
      { $sort: { key: 1 } },
      { $limit: 60 },
    ]).exec();
  }

  public async recentTasks(scope: AnalyticsScopeQuery, limit = 8): Promise<TaskDocument[]> {
    return TaskModel.find(this.taskFilter(scope))
      .sort({ updatedAt: -1 })
      .limit(limit)
      .exec() as Promise<TaskDocument[]>;
  }

  public async reportTasks(scope: AnalyticsScopeQuery, limit = 5000): Promise<TaskDocument[]> {
    return TaskModel.find(this.taskFilter(scope, true))
      .sort({ updatedAt: -1 })
      .limit(limit)
      .exec() as Promise<TaskDocument[]>;
  }

  public async averageCompletionHours(scope: AnalyticsScopeQuery): Promise<number> {
    const tasks = (await TaskModel.find({ ...this.taskFilter(scope), status: 'done' })
      .select('createdAt startDate updatedAt dueDate')
      .limit(5000)
      .exec()) as TaskDocument[];
    if (tasks.length === 0) return 0;
    const totalHours = tasks.reduce((sum, task) => {
      const start = task.startDate ?? task.createdAt;
      return sum + (task.updatedAt.getTime() - start.getTime()) / 3_600_000;
    }, 0);
    return Math.max(0, totalHours / tasks.length);
  }

  public async activeMemberCount(workspaceId: Types.ObjectId): Promise<number> {
    return WorkspaceMemberModel.countDocuments({ workspaceId, status: 'active' }).exec();
  }

  public async projectCount(workspaceId: Types.ObjectId): Promise<number> {
    return ProjectModel.countDocuments({ workspaceId, status: 'active' }).exec();
  }

  public async boardCount(workspaceId: Types.ObjectId): Promise<number> {
    return BoardModel.countDocuments({ workspaceId, archived: false }).exec();
  }

  public async projectProgress(workspaceId: Types.ObjectId): Promise<CountBucket[]> {
    return TaskModel.aggregate<CountBucket>([
      { $match: { workspaceId, archived: false } },
      {
        $group: {
          _id: '$projectId',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: '_id',
          as: 'project',
        },
      },
      { $unwind: '$project' },
      {
        $project: {
          _id: 0,
          key: { $toString: '$_id' },
          label: '$project.name',
          value: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
            ],
          },
        },
      },
      { $sort: { value: -1 } },
      { $limit: 12 },
    ]).exec();
  }

  public async boardProgress(scope: AnalyticsScopeQuery): Promise<CountBucket[]> {
    return TaskModel.aggregate<CountBucket>([
      { $match: this.taskFilter(scope) },
      {
        $group: {
          _id: '$boardId',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'boards',
          localField: '_id',
          foreignField: '_id',
          as: 'board',
        },
      },
      { $unwind: '$board' },
      {
        $project: {
          _id: 0,
          key: { $toString: '$_id' },
          label: '$board.name',
          value: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
            ],
          },
        },
      },
      { $sort: { value: -1 } },
      { $limit: 12 },
    ]).exec();
  }

  public async taskActivity(scope: AnalyticsScopeQuery, limit = 20) {
    const filter: Record<string, unknown> = {};
    if (scope.workspaceId) filter.workspaceId = scope.workspaceId;
    if (scope.from || scope.to) {
      filter.createdAt = {
        ...(scope.from ? { $gte: scope.from } : {}),
        ...(scope.to ? { $lte: scope.to } : {}),
      };
    }
    return ActivityEventModel.find(filter).sort({ createdAt: -1 }).limit(limit).exec();
  }

  public async workload(workspaceId: Types.ObjectId): Promise<CountBucket[]> {
    return TaskModel.aggregate<CountBucket>([
      { $match: { workspaceId, archived: false, status: { $ne: 'done' } } },
      { $unwind: { path: '$assigneeIds', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$assigneeIds', value: { $sum: 1 } } },
      { $project: { _id: 0, key: { $toString: '$_id' }, value: 1 } },
      { $sort: { value: -1 } },
    ]).exec();
  }

  public async overdueWorkload(workspaceId: Types.ObjectId, now: Date): Promise<CountBucket[]> {
    return TaskModel.aggregate<CountBucket>([
      {
        $match: {
          workspaceId,
          archived: false,
          status: { $ne: 'done' },
          dueDate: { $lt: now },
        },
      },
      { $unwind: { path: '$assigneeIds', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$assigneeIds', value: { $sum: 1 } } },
      { $project: { _id: 0, key: { $toString: '$_id' }, value: 1 } },
    ]).exec();
  }

  public async completedWorkload(workspaceId: Types.ObjectId): Promise<CountBucket[]> {
    return TaskModel.aggregate<CountBucket>([
      { $match: { workspaceId, archived: false, status: 'done' } },
      { $unwind: { path: '$assigneeIds', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$assigneeIds', value: { $sum: 1 } } },
      { $project: { _id: 0, key: { $toString: '$_id' }, value: 1 } },
    ]).exec();
  }

  public async columnsForBoard(boardId: Types.ObjectId) {
    return ColumnModel.find({ boardId, archived: false }).sort({ order: 1 }).exec();
  }
}
