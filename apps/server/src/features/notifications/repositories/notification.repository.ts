import type { NotificationType } from '@pm/types';
import type { FilterQuery, Types } from 'mongoose';
import { NotificationModel, type NotificationDocument } from '../models/notification.model.js';
import {
  NotificationPreferenceModel,
  type NotificationPreferenceDocument,
} from '../models/notification-preference.model.js';

export interface NotificationListFilters {
  readonly userId: Types.ObjectId;
  readonly workspaceId?: Types.ObjectId;
  readonly isRead?: boolean;
  readonly type?: NotificationType;
  readonly search?: string;
  readonly page: number;
  readonly limit: number;
  readonly sort: 'newest' | 'oldest';
}

export interface NotificationPreferenceUpdate {
  readonly inApp?: boolean | undefined;
  readonly email?: boolean | undefined;
  readonly assignments?: boolean | undefined;
  readonly comments?: boolean | undefined;
  readonly mentions?: boolean | undefined;
  readonly dueDates?: boolean | undefined;
  readonly workspace?: boolean | undefined;
}

export class NotificationRepository {
  public async create(input: {
    userId: Types.ObjectId;
    workspaceId?: Types.ObjectId | null;
    projectId?: Types.ObjectId | null;
    taskId?: Types.ObjectId | null;
    actorId?: Types.ObjectId | null;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<NotificationDocument> {
    return NotificationModel.create(input) as Promise<NotificationDocument>;
  }

  public async list(filters: NotificationListFilters): Promise<{
    items: NotificationDocument[];
    total: number;
  }> {
    const query = this.toQuery(filters);
    const skip = (filters.page - 1) * filters.limit;
    const sort = filters.sort === 'oldest' ? 1 : -1;
    const [items, total] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: sort })
        .skip(skip)
        .limit(filters.limit)
        .exec() as Promise<NotificationDocument[]>,
      NotificationModel.countDocuments(query).exec(),
    ]);
    return { items, total };
  }

  public async unreadCount(userId: Types.ObjectId): Promise<number> {
    return NotificationModel.countDocuments({ userId, isRead: false }).exec();
  }

  public async findById(notificationId: Types.ObjectId): Promise<NotificationDocument | null> {
    return NotificationModel.findById(
      notificationId,
    ).exec() as Promise<NotificationDocument | null>;
  }

  public async markRead(
    notificationId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<NotificationDocument | null> {
    return NotificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true },
    ).exec() as Promise<NotificationDocument | null>;
  }

  public async markAllRead(userId: Types.ObjectId): Promise<number> {
    const result = await NotificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    ).exec();
    return result.modifiedCount;
  }

  public async deleteOne(notificationId: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    const result = await NotificationModel.deleteOne({ _id: notificationId, userId }).exec();
    return result.deletedCount === 1;
  }

  public async deleteAll(userId: Types.ObjectId): Promise<number> {
    const result = await NotificationModel.deleteMany({ userId }).exec();
    return result.deletedCount;
  }

  private toQuery(filters: NotificationListFilters): FilterQuery<NotificationDocument> {
    const query: FilterQuery<NotificationDocument> = { userId: filters.userId };
    if (filters.workspaceId) query.workspaceId = filters.workspaceId;
    if (filters.isRead !== undefined) query.isRead = filters.isRead;
    if (filters.type) query.type = filters.type;
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { message: { $regex: filters.search, $options: 'i' } },
      ];
    }
    return query;
  }
}

export class NotificationPreferenceRepository {
  public async getOrCreate(userId: Types.ObjectId): Promise<NotificationPreferenceDocument> {
    return NotificationPreferenceModel.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec() as Promise<NotificationPreferenceDocument>;
  }

  public async update(
    userId: Types.ObjectId,
    input: NotificationPreferenceUpdate,
  ): Promise<NotificationPreferenceDocument> {
    return NotificationPreferenceModel.findOneAndUpdate({ userId }, input, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }).exec() as Promise<NotificationPreferenceDocument>;
  }
}
