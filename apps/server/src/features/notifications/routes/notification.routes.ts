import { Router } from 'express';
import { verifyToken } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  clearNotifications,
  deleteNotification,
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
  updateNotificationPreferences,
} from '../controllers/notification.controller.js';
import {
  listNotificationsSchema,
  notificationParamsSchema,
  updateNotificationPreferencesSchema,
} from '../validation/notification.validation.js';

export const notificationRouter = Router();

notificationRouter.use(verifyToken);

notificationRouter.get('/', validate(listNotificationsSchema), listNotifications);
notificationRouter.get('/unread-count', unreadCount);
notificationRouter.get('/preferences', getNotificationPreferences);
notificationRouter.patch(
  '/preferences',
  validate(updateNotificationPreferencesSchema),
  updateNotificationPreferences,
);
notificationRouter.patch(
  '/:notificationId/read',
  validate(notificationParamsSchema),
  markNotificationRead,
);
notificationRouter.patch('/read-all', markAllNotificationsRead);
notificationRouter.delete(
  '/:notificationId',
  validate(notificationParamsSchema),
  deleteNotification,
);
notificationRouter.delete('/', clearNotifications);
