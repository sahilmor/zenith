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
        'resource.profile.updated',
        'resource.allocation.created',
        'resource.availability.created',
        'time.timer.started',
        'time.entry.created',
        'crm.account.created',
        'crm.account.updated',
        'crm.contact.created',
        'crm.lead.created',
        'crm.lead.updated',
        'crm.lead.converted',
        'crm.deal.created',
        'crm.deal.updated',
        'crm.activity.created',
        'devops.repository.connected',
        'devops.repository.archived',
        'devops.commit.ingested',
        'devops.pull_request.updated',
        'devops.deployment.updated',
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
  | 'strategic_link.deleted'
  | 'document.space.created'
  | 'document.folder.created'
  | 'document.page.created'
  | 'document.page.updated'
  | 'document.blocks.saved'
  | 'document.page.published'
  | 'document.page.archived'
  | 'document.page.restored'
  | 'document.page.deleted'
  | 'document.comment.created'
  | 'document.imported'
  | 'document.exported'
  | 'document.bulk.updated'
  | 'document.media.uploaded'
  | 'document.media.updated'
  | 'resource.profile.updated'
  | 'resource.allocation.created'
  | 'resource.availability.created'
  | 'time.timer.started'
  | 'time.entry.created'
  | 'crm.account.created'
  | 'crm.account.updated'
  | 'crm.contact.created'
  | 'crm.lead.created'
  | 'crm.lead.updated'
  | 'crm.lead.converted'
  | 'crm.deal.created'
  | 'crm.deal.updated'
  | 'crm.activity.created'
  | 'devops.repository.connected'
  | 'devops.repository.archived'
  | 'devops.commit.ingested'
  | 'devops.pull_request.updated'
  | 'devops.deployment.updated';

export interface CreateActivityEventInput {
  workspaceId: Types.ObjectId;
  actorId: Types.ObjectId;
  event: ActivityEventName;
  metadata?: Record<string, unknown>;
}

export type ActivityEvent = InferSchemaType<typeof activityEventSchema>;
export type ActivityEventDocument = HydratedDocument<ActivityEvent>;
export const ActivityEventModel = model<ActivityEvent>('ActivityEvent', activityEventSchema);
