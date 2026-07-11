import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const subscriptionStatuses = [
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'paused',
] as const;

export const billingIntervals = ['monthly', 'annual'] as const;
export const billingProviders = ['local', 'stripe'] as const;
export const billingPlanCodes = ['free', 'pro', 'business', 'enterprise'] as const;

const subscriptionSchema = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      unique: true,
      index: true,
    },
    provider: { type: String, enum: billingProviders, default: 'local', index: true },
    providerCustomerId: { type: String, default: null, trim: true, index: true },
    providerSubscriptionId: { type: String, default: null, trim: true, index: true },
    providerPriceId: { type: String, default: null, trim: true },
    planCode: { type: String, enum: billingPlanCodes, default: 'free', index: true },
    billingInterval: { type: String, enum: billingIntervals, default: 'monthly' },
    currency: { type: String, default: 'usd', lowercase: true, trim: true },
    status: { type: String, enum: subscriptionStatuses, default: 'active', index: true },
    trialStart: { type: Date, default: null },
    trialEnd: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    gracePeriodEndsAt: { type: Date, default: null },
    metadata: { type: Map, of: String, default: {} },
  },
  { timestamps: true },
);

export type Subscription = InferSchemaType<typeof subscriptionSchema>;
export type SubscriptionDocument = HydratedDocument<Subscription>;
export const SubscriptionModel = model<Subscription>('Subscription', subscriptionSchema);
