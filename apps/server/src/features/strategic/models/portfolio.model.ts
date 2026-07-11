import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { strategicHealthValues, strategicStatuses } from './goal.model.js';

const portfolioSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
    description: { type: String, default: null, trim: true, maxlength: 4000 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contributorIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: strategicStatuses, default: 'active', index: true },
    health: { type: String, enum: strategicHealthValues, default: 'no_status', index: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    archived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

portfolioSchema.index({ workspaceId: 1, archived: 1, status: 1 });

export type Portfolio = InferSchemaType<typeof portfolioSchema>;
export type PortfolioDocument = HydratedDocument<Portfolio>;
export const PortfolioModel = model<Portfolio>('Portfolio', portfolioSchema);
