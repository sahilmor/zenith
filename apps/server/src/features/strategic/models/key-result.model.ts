import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { strategicHealthValues, strategicStatuses } from './goal.model.js';

export const keyResultMeasurementTypes = [
  'number',
  'percentage',
  'currency',
  'boolean',
  'task_completion',
  'project_progress',
  'milestone_progress',
  'custom',
];

const keyResultSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    goalId: { type: Schema.Types.ObjectId, ref: 'Goal', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
    description: { type: String, default: null, trim: true, maxlength: 4000 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contributorIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    measurementType: { type: String, enum: keyResultMeasurementTypes, default: 'number' },
    unit: { type: String, default: null, trim: true, maxlength: 24 },
    startValue: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
    targetValue: { type: Number, default: 100 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, enum: strategicStatuses, default: 'active', index: true },
    health: { type: String, enum: strategicHealthValues, default: 'no_status', index: true },
    confidence: { type: Number, default: 50, min: 0, max: 100 },
    startDate: { type: Date, default: null },
    targetDate: { type: Date, default: null, index: true },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

keyResultSchema.index({ workspaceId: 1, goalId: 1, archived: 1 });

export type KeyResult = InferSchemaType<typeof keyResultSchema>;
export type KeyResultDocument = HydratedDocument<KeyResult>;
export const KeyResultModel = model<KeyResult>('KeyResult', keyResultSchema);
