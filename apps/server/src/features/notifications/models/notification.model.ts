import type { NotificationType } from '@pm/types';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', default: null },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    type: {
      type: String,
      required: true,
      enum: [
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
      ] satisfies NotificationType[],
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ workspaceId: 1, createdAt: -1 });

export type Notification = InferSchemaType<typeof notificationSchema>;
export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationModel = model<Notification>('Notification', notificationSchema);
