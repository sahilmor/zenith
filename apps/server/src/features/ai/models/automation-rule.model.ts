import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const automationConditionSchema = new Schema(
  {
    field: { type: String, required: true, trim: true, maxlength: 80 },
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'contains', 'exists'],
      required: true,
    },
    value: { type: String, required: true, trim: true, maxlength: 240 },
  },
  { _id: false },
);

const automationActionSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        'assign_user',
        'move_task',
        'change_status',
        'change_priority',
        'create_task',
        'create_comment',
        'send_notification',
        'call_ai',
        'webhook',
        'email',
      ],
      required: true,
    },
    params: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const automationRuleSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, default: null, trim: true, maxlength: 1000 },
    enabled: { type: Boolean, default: true, index: true },
    trigger: {
      type: String,
      enum: [
        'task_created',
        'task_updated',
        'task_moved',
        'task_assigned',
        'task_completed',
        'due_date_reached',
        'comment_added',
        'attachment_uploaded',
        'workspace_invitation_accepted',
      ],
      required: true,
      index: true,
    },
    conditions: { type: [automationConditionSchema], default: [] },
    actions: { type: [automationActionSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true },
);

automationRuleSchema.index({ workspaceId: 1, trigger: 1, enabled: 1 });

export type AutomationRule = InferSchemaType<typeof automationRuleSchema>;
export type AutomationRuleDocument = HydratedDocument<AutomationRule>;
export const AutomationRuleModel = model<AutomationRule>('AutomationRule', automationRuleSchema);
