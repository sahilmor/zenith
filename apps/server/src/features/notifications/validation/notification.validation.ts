import type { NotificationType } from '@pm/types';
import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const notificationTypes = [
  'task_assigned',
  'task_unassigned',
  'task_mention',
  'comment_mention',
  'comment_reply',
  'task_moved',
  'task_due_soon',
  'task_overdue',
  'workspace_invitation',
  'workspace_role_changed',
  'project_created',
  'board_created',
  'attachment_uploaded',
  'task_archived',
  'task_restored',
  'system_announcement',
] as const satisfies readonly NotificationType[];

export const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    workspaceId: objectId.optional(),
    isRead: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    type: z.enum(notificationTypes).optional(),
    search: z.string().trim().max(120).optional(),
    sort: z.enum(['newest', 'oldest']).default('newest'),
  }),
});

export const notificationParamsSchema = z.object({
  params: z.object({ notificationId: objectId }),
});

export const updateNotificationPreferencesSchema = z.object({
  body: z
    .object({
      inApp: z.boolean().optional(),
      email: z.boolean().optional(),
      assignments: z.boolean().optional(),
      comments: z.boolean().optional(),
      mentions: z.boolean().optional(),
      dueDates: z.boolean().optional(),
      workspace: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required'),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>['query'];
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>['body'];
