import type { Request, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { UnauthorizedError } from '../../../utils/app-error.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { notificationService } from '../services/notification.service.js';
import type { ListNotificationsQuery } from '../validation/notification.validation.js';

const requireUserId = (request: Request): Types.ObjectId => {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user._id;
};

export const listNotifications: RequestHandler = asyncHandler(async (request, response) => {
  const notifications = await notificationService.list(
    requireUserId(request),
    request.query as unknown as ListNotificationsQuery,
  );
  sendSuccess(response, 200, 'Notifications retrieved', notifications);
});

export const unreadCount: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Unread notification count retrieved',
    await notificationService.unreadCount(requireUserId(request)),
  );
});

export const markNotificationRead: RequestHandler = asyncHandler(async (request, response) => {
  const notification = await notificationService.markRead(
    requireUserId(request),
    new Types.ObjectId(request.params.notificationId),
  );
  sendSuccess(response, 200, 'Notification marked as read', notification);
});

export const markAllNotificationsRead: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Notifications marked as read',
    await notificationService.markAllRead(requireUserId(request)),
  );
});

export const deleteNotification: RequestHandler = asyncHandler(async (request, response) => {
  await notificationService.deleteOne(
    requireUserId(request),
    new Types.ObjectId(request.params.notificationId),
  );
  sendSuccess(response, 200, 'Notification deleted');
});

export const clearNotifications: RequestHandler = asyncHandler(async (request, response) => {
  sendSuccess(
    response,
    200,
    'Notifications cleared',
    await notificationService.deleteAll(requireUserId(request)),
  );
});

export const getNotificationPreferences: RequestHandler = asyncHandler(
  async (request, response) => {
    sendSuccess(
      response,
      200,
      'Notification preferences retrieved',
      await notificationService.getPreferences(requireUserId(request)),
    );
  },
);

export const updateNotificationPreferences: RequestHandler = asyncHandler(
  async (request, response) => {
    sendSuccess(
      response,
      200,
      'Notification preferences updated',
      await notificationService.updatePreferences(requireUserId(request), request.body),
    );
  },
);
