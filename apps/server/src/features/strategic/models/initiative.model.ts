import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { strategicHealthValues, strategicProgressModes, strategicStatuses } from './goal.model.js';

const initiativeSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
    description: { type: String, default: null, trim: true, maxlength: 4000 },
    status: { type: String, enum: strategicStatuses, default: 'draft', index: true },
    health: { type: String, enum: strategicHealthValues, default: 'no_status', index: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contributorIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    startDate: { type: Date, default: null },
    targetDate: { type: Date, default: null, index: true },
    progressMode: { type: String, enum: strategicProgressModes, default: 'manual' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

initiativeSchema.index({ workspaceId: 1, archived: 1, status: 1 });

export type Initiative = InferSchemaType<typeof initiativeSchema>;
export type InitiativeDocument = HydratedDocument<Initiative>;
export const InitiativeModel = model<Initiative>('Initiative', initiativeSchema);
