import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { strategicHealthValues } from './goal.model.js';

const strategicCheckInSchema = new Schema({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  goalId: { type: Schema.Types.ObjectId, ref: 'Goal', required: true, index: true },
  keyResultId: { type: Schema.Types.ObjectId, ref: 'KeyResult', default: null, index: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  progress: { type: Number, required: true, min: 0, max: 100 },
  health: { type: String, enum: strategicHealthValues, required: true },
  confidence: { type: Number, required: true, min: 0, max: 100 },
  summary: { type: String, required: true, trim: true, minlength: 2, maxlength: 4000 },
  blockers: { type: String, default: null, trim: true, maxlength: 2000 },
  nextSteps: { type: String, default: null, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now, index: true },
});

strategicCheckInSchema.index({ workspaceId: 1, goalId: 1, createdAt: -1 });

export type StrategicCheckIn = InferSchemaType<typeof strategicCheckInSchema>;
export type StrategicCheckInDocument = HydratedDocument<StrategicCheckIn>;
export const StrategicCheckInModel = model<StrategicCheckIn>(
  'StrategicCheckIn',
  strategicCheckInSchema,
);
