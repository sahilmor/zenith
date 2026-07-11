import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const featureFlagSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: null, trim: true },
    enabled: { type: Boolean, default: false, index: true },
    rolloutPercentage: { type: Number, default: 100, min: 0, max: 100 },
    workspaceIds: [{ type: Schema.Types.ObjectId, ref: 'Workspace' }],
    userIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export type FeatureFlag = InferSchemaType<typeof featureFlagSchema>;
export type FeatureFlagDocument = HydratedDocument<FeatureFlag>;
export const FeatureFlagModel = model<FeatureFlag>('FeatureFlag', featureFlagSchema);
