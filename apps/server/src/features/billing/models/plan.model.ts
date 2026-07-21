import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const planSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true, index: true },
    recommended: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0, index: true },
    prices: {
      type: Map,
      of: Number,
      default: {},
    },
    currency: { type: String, default: 'usd', lowercase: true },
    trialDays: { type: Number, default: 14, min: 0 },
    metadata: { type: Map, of: String, default: {} },
  },
  { timestamps: true },
);

export type Plan = InferSchemaType<typeof planSchema>;
export type PlanDocument = HydratedDocument<Plan>;
export const PlanModel = model<Plan>('BillingPlan', planSchema);

const featureDefinitionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    kind: { type: String, enum: ['boolean', 'limit'], required: true },
    unit: { type: String, default: null },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const FeatureDefinitionModel = model('BillingFeatureDefinition', featureDefinitionSchema);

const planEntitlementSchema = new Schema(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'BillingPlan', required: true, index: true },
    featureKey: { type: String, required: true, index: true },
    enabled: { type: Boolean, default: false },
    limit: { type: Number, default: null, min: 0 },
    softLimitPercentages: { type: [Number], default: [80, 90, 100] },
    metadata: { type: Map, of: String, default: {} },
  },
  { timestamps: true },
);
planEntitlementSchema.index({ planId: 1, featureKey: 1 }, { unique: true });

export const PlanEntitlementModel = model('PlanEntitlement', planEntitlementSchema);
