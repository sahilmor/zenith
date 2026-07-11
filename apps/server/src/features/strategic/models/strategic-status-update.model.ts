import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { strategicEntityTypes } from './strategic-link.model.js';
import { strategicHealthValues, strategicStatuses } from './goal.model.js';

const strategicStatusUpdateSchema = new Schema({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  entityType: { type: String, enum: strategicEntityTypes, required: true, index: true },
  entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  summary: { type: String, required: true, trim: true, minlength: 2, maxlength: 4000 },
  status: { type: String, enum: strategicStatuses, required: true },
  health: { type: String, enum: strategicHealthValues, required: true },
  progressSnapshot: { type: Number, required: true, min: 0, max: 100 },
  risks: { type: String, default: null, trim: true, maxlength: 2000 },
  blockers: { type: String, default: null, trim: true, maxlength: 2000 },
  nextSteps: { type: String, default: null, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now, index: true },
});

strategicStatusUpdateSchema.index({ workspaceId: 1, entityType: 1, entityId: 1, createdAt: -1 });

export type StrategicStatusUpdate = InferSchemaType<typeof strategicStatusUpdateSchema>;
export type StrategicStatusUpdateDocument = HydratedDocument<StrategicStatusUpdate>;
export const StrategicStatusUpdateModel = model<StrategicStatusUpdate>(
  'StrategicStatusUpdate',
  strategicStatusUpdateSchema,
);
