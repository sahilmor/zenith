import type {
  NotificationListSummary,
  NotificationPreferencesSummary,
  NotificationSummary,
  NotificationType,
} from '@pm/types';
import { Types } from 'mongoose';
import { ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import { realtimeService } from '../../../sockets/realtime.service.js';
import type { NotificationDocument } from '../models/notification.model.js';
import type { NotificationPreferenceDocument } from '../models/notification-preference.model.js';
import {
  NotificationPreferenceRepository,
  NotificationRepository,
} from '../repositories/notification.repository.js';
import {
  createNotificationContent,
  notificationCategoryForType,
  type NotificationFactoryInput,
} from './notification-factory.js';
import type {
  ListNotificationsQuery,
  UpdateNotificationPreferencesInput,
} from '../validation/notification.validation.js';

export interface CreateNotificationInput extends NotificationFactoryInput {
  readonly userId: Types.ObjectId;
  readonly workspaceId?: Types.ObjectId | null;
  readonly projectId?: Types.ObjectId | null;
  readonly taskId?: Types.ObjectId | null;
  readonly actorId?: Types.ObjectId | null;
  readonly metadata?: Record<string, unknown>;
}

export class NotificationService {
  public constructor(
    private readonly notifications = new NotificationRepository(),
    private readonly preferences = new NotificationPreferenceRepository(),
  ) {}

  public async create(input: CreateNotificationInput): Promise<NotificationSummary | null> {
    if (input.actorId?.equals(input.userId)) return null;
    const preference = await this.preferences.getOrCreate(input.userId);
    if (!this.canSend(preference, input.type)) return null;

    const content = createNotificationContent(input);
    const notification = await this.notifications.create({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      actorId: input.actorId ?? null,
      type: input.type,
      title: content.title,
      message: content.message,
      metadata: input.metadata ?? {},
    });
    const summary = this.toSummary(notification);
    realtimeService.emitNotification({
      workspaceId: summary.workspaceId ?? summary.userId,
      recipientId: summary.userId,
      actorId: summary.actorId ?? summary.userId,
      type: this.toRealtimeType(summary.type),
      ...(summary.taskId ? { taskId: summary.taskId } : {}),
      message: summary.message,
    });
    await this.emitUnreadCount(input.userId);
    return summary;
  }

  public async list(
    userId: Types.ObjectId,
    query: ListNotificationsQuery,
  ): Promise<NotificationListSummary> {
    const result = await this.notifications.list({
      userId,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      ...(query.workspaceId ? { workspaceId: new Types.ObjectId(query.workspaceId) } : {}),
      ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search ? { search: query.search } : {}),
    });
    return {
      items: result.items.map((notification) => this.toSummary(notification)),
      page: query.page,
      limit: query.limit,
      total: result.total,
      hasMore: query.page * query.limit < result.total,
    };
  }

  public async unreadCount(userId: Types.ObjectId): Promise<{ count: number }> {
    return { count: await this.notifications.unreadCount(userId) };
  }

  public async markRead(
    userId: Types.ObjectId,
    notificationId: Types.ObjectId,
  ): Promise<NotificationSummary> {
    const notification = await this.notifications.markRead(notificationId, userId);
    if (!notification) throw new NotFoundError('Notification not found');
    await this.emitUnreadCount(userId);
    realtimeService.emitMutation({
      resource: 'notification',
      action: 'updated',
      workspaceId: notification.workspaceId?.toString() ?? userId.toString(),
      actorId: userId.toString(),
      data: this.toSummary(notification),
    });
    return this.toSummary(notification);
  }

  public async markAllRead(userId: Types.ObjectId): Promise<{ updated: number }> {
    const updated = await this.notifications.markAllRead(userId);
    await this.emitUnreadCount(userId);
    realtimeService.emitMutation({
      resource: 'notification',
      action: 'updated',
      workspaceId: userId.toString(),
      actorId: userId.toString(),
      data: { allRead: true },
    });
    return { updated };
  }

  public async deleteOne(userId: Types.ObjectId, notificationId: Types.ObjectId): Promise<void> {
    const notification = await this.notifications.findById(notificationId);
    if (!notification) throw new NotFoundError('Notification not found');
    if (!notification.userId.equals(userId)) throw new ForbiddenError('Notification access denied');
    await this.notifications.deleteOne(notificationId, userId);
    await this.emitUnreadCount(userId);
    realtimeService.emitMutation({
      resource: 'notification',
      action: 'deleted',
      workspaceId: notification.workspaceId?.toString() ?? userId.toString(),
      actorId: userId.toString(),
      data: { notificationId: notification.id },
    });
  }

  public async deleteAll(userId: Types.ObjectId): Promise<{ deleted: number }> {
    const deleted = await this.notifications.deleteAll(userId);
    await this.emitUnreadCount(userId);
    realtimeService.emitMutation({
      resource: 'notification',
      action: 'deleted',
      workspaceId: userId.toString(),
      actorId: userId.toString(),
      data: { allDeleted: true },
    });
    return { deleted };
  }

  public async getPreferences(userId: Types.ObjectId): Promise<NotificationPreferencesSummary> {
    return this.toPreferenceSummary(await this.preferences.getOrCreate(userId));
  }

  public async updatePreferences(
    userId: Types.ObjectId,
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferencesSummary> {
    return this.toPreferenceSummary(await this.preferences.update(userId, { ...input }));
  }

  private canSend(preference: NotificationPreferenceDocument, type: NotificationType): boolean {
    if (!preference.inApp) return false;
    const category = notificationCategoryForType(type);
    return category === 'inApp' ? true : Boolean(preference[category]);
  }

  private async emitUnreadCount(userId: Types.ObjectId): Promise<void> {
    realtimeService.emitMutation({
      resource: 'notification',
      action: 'updated',
      workspaceId: userId.toString(),
      actorId: userId.toString(),
      data: { unreadCount: await this.notifications.unreadCount(userId) },
    });
  }

  private toRealtimeType(
    type: NotificationType,
  ): 'mention' | 'task_assignment' | 'task_completion' | 'comment_reply' | 'workspace_invitation' {
    if (type === 'task_assigned' || type === 'task_unassigned') return 'task_assignment';
    if (type === 'comment_reply') return 'comment_reply';
    if (type === 'workspace_invitation') return 'workspace_invitation';
    if (type === 'task_restored') return 'task_completion';
    return 'mention';
  }

  private toSummary(notification: NotificationDocument): NotificationSummary {
    return {
      id: notification.id,
      userId: notification.userId.toString(),
      workspaceId: notification.workspaceId?.toString() ?? null,
      projectId: notification.projectId?.toString() ?? null,
      taskId: notification.taskId?.toString() ?? null,
      actorId: notification.actorId?.toString() ?? null,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata as Record<string, unknown>,
      isRead: notification.isRead,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    };
  }

  private toPreferenceSummary(
    preference: NotificationPreferenceDocument,
  ): NotificationPreferencesSummary {
    return {
      userId: preference.userId.toString(),
      inApp: preference.inApp,
      email: preference.email,
      assignments: preference.assignments,
      comments: preference.comments,
      mentions: preference.mentions,
      dueDates: preference.dueDates,
      workspace: preference.workspace,
      createdAt: preference.createdAt.toISOString(),
      updatedAt: preference.updatedAt.toISOString(),
    };
  }
}

export const notificationService = new NotificationService();
