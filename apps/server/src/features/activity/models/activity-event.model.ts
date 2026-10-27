import { Schema, model, type HydratedDocument, type InferSchemaType, type Types } from 'mongoose';

export const activityEventNames = [
  'workspace.created',
  'workspace.updated',
  'member.invited',
  'member.joined',
  'member.removed',
  'member.role_changed',
  'workspace.archived',
  'project.created',
  'project.updated',
  'project.archived',
  'project.restored',
  'project.deleted',
  'board.created',
  'board.updated',
  'board.archived',
  'board.restored',
  'column.created',
  'column.updated',
  'column.deleted',
  'column.reordered',
  'task.created',
  'task.updated',
  'task.archived',
  'task.restored',
  'task.reordered',
  'subtask.created',
  'subtask.updated',
  'subtask.deleted',
  'document.space.created',
  'document.folder.created',
  'document.page.created',
  'document.page.updated',
  'document.blocks.saved',
  'document.page.published',
  'document.page.archived',
  'document.page.restored',
  'document.page.deleted',
  'document.comment.created',
  'document.imported',
  'document.exported',
  'document.bulk.updated',
  'document.media.uploaded',
  'document.media.updated',
] as const;

const activityEventSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: {
      type: String,
      required: true,
      enum: activityEventNames,
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityEventSchema.index({ workspaceId: 1, createdAt: -1 });

export type ActivityEventName = (typeof activityEventNames)[number];

export interface CreateActivityEventInput {
  workspaceId: Types.ObjectId;
  actorId: Types.ObjectId;
  event: ActivityEventName;
  metadata?: Record<string, unknown>;
}

export type ActivityEvent = InferSchemaType<typeof activityEventSchema>;
export type ActivityEventDocument = HydratedDocument<ActivityEvent>;
export const ActivityEventModel = model<ActivityEvent>('ActivityEvent', activityEventSchema);
