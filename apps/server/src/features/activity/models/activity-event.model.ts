import { Schema, model, type HydratedDocument, type InferSchemaType, type Types } from 'mongoose';

const activityEventSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: {
      type: String,
      required: true,
      enum: [
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
        'goal.created',
        'goal.updated',
        'goal.archived',
        'goal.restored',
        'key_result.created',
        'key_result.updated',
        'key_result.deleted',
        'check_in.created',
        'initiative.created',
        'initiative.updated',
        'initiative.archived',
        'initiative.restored',
        'portfolio.created',
        'portfolio.updated',
        'portfolio.archived',
        'portfolio.restored',
        'strategic_link.created',
        'strategic_link.deleted',
      ],
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityEventSchema.index({ workspaceId: 1, createdAt: -1 });

export type ActivityEventName =
  | 'workspace.created'
  | 'workspace.updated'
  | 'member.invited'
  | 'member.joined'
  | 'member.removed'
  | 'member.role_changed'
  | 'workspace.archived'
  | 'project.created'
  | 'project.updated'
  | 'project.archived'
  | 'project.restored'
  | 'project.deleted'
  | 'board.created'
  | 'board.updated'
  | 'board.archived'
  | 'board.restored'
  | 'column.created'
  | 'column.updated'
  | 'column.deleted'
  | 'column.reordered'
  | 'task.created'
  | 'task.updated'
  | 'task.archived'
  | 'task.restored'
  | 'task.reordered'
  | 'subtask.created'
  | 'subtask.updated'
  | 'subtask.deleted'
  | 'goal.created'
  | 'goal.updated'
  | 'goal.archived'
  | 'goal.restored'
  | 'key_result.created'
  | 'key_result.updated'
  | 'key_result.deleted'
  | 'check_in.created'
  | 'initiative.created'
  | 'initiative.updated'
  | 'initiative.archived'
  | 'initiative.restored'
  | 'portfolio.created'
  | 'portfolio.updated'
  | 'portfolio.archived'
  | 'portfolio.restored'
  | 'strategic_link.created'
  | 'strategic_link.deleted';

export interface CreateActivityEventInput {
  workspaceId: Types.ObjectId;
  actorId: Types.ObjectId;
  event: ActivityEventName;
  metadata?: Record<string, unknown>;
}

export type ActivityEvent = InferSchemaType<typeof activityEventSchema>;
export type ActivityEventDocument = HydratedDocument<ActivityEvent>;
export const ActivityEventModel = model<ActivityEvent>('ActivityEvent', activityEventSchema);
