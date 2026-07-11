import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const strategicStatuses = ['draft', 'active', 'at_risk', 'achieved', 'missed', 'canceled'];
export const strategicHealthValues = ['on_track', 'at_risk', 'off_track', 'no_status'];
export const strategicProgressModes = ['manual', 'automatic'];

const goalSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
    description: { type: String, default: null, trim: true, maxlength: 4000 },
    type: {
      type: String,
      enum: ['objective', 'goal', 'company_goal', 'team_goal', 'personal_goal'],
      default: 'goal',
      index: true,
    },
    status: { type: String, enum: strategicStatuses, default: 'draft', index: true },
    health: { type: String, enum: strategicHealthValues, default: 'no_status', index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contributorIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    parentGoalId: { type: Schema.Types.ObjectId, ref: 'Goal', default: null, index: true },
    startDate: { type: Date, default: null },
    targetDate: { type: Date, default: null, index: true },
    progressMode: { type: String, enum: strategicProgressModes, default: 'manual' },
    manualProgress: { type: Number, default: 0, min: 0, max: 100 },
    calculatedProgress: { type: Number, default: 0, min: 0, max: 100 },
    confidence: { type: Number, default: 50, min: 0, max: 100 },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

goalSchema.index({ workspaceId: 1, archived: 1, status: 1 });
goalSchema.index({ workspaceId: 1, parentGoalId: 1 });

export type Goal = InferSchemaType<typeof goalSchema>;
export type GoalDocument = HydratedDocument<Goal>;
export const GoalModel = model<Goal>('Goal', goalSchema);
