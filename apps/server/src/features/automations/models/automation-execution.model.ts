import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const automationExecutionSchema = new Schema(
  {
    ruleId: { type: Schema.Types.ObjectId, ref: 'AutomationRule', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['success', 'skipped', 'failed'], required: true, index: true },
    message: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

automationExecutionSchema.index({ workspaceId: 1, createdAt: -1 });

export type AutomationExecution = InferSchemaType<typeof automationExecutionSchema>;
export type AutomationExecutionDocument = HydratedDocument<AutomationExecution>;
export const AutomationExecutionModel = model<AutomationExecution>(
  'AutomationExecution',
  automationExecutionSchema,
);
