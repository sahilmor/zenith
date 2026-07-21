import { Schema, model } from 'mongoose';

const subscriptionHistorySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
      index: true,
    },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, required: true },
    fromPlanCode: { type: String, default: null },
    toPlanCode: { type: String, required: true },
    reason: { type: String, default: null },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    effectiveAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
subscriptionHistorySchema.index({ workspaceId: 1, createdAt: -1 });
export const SubscriptionHistoryModel = model('SubscriptionHistory', subscriptionHistorySchema);

const usageCounterSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    metric: { type: String, required: true },
    period: { type: String, required: true, default: 'lifetime' },
    value: { type: Number, required: true, default: 0, min: 0 },
    lastResetAt: { type: Date, default: null },
  },
  { timestamps: true },
);
usageCounterSchema.index({ workspaceId: 1, metric: 1, period: 1 }, { unique: true });
export const UsageCounterModel = model('BillingUsageCounter', usageCounterSchema);

const usageSnapshotSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    capturedAt: { type: Date, required: true, default: Date.now },
    period: { type: String, required: true },
    metrics: { type: Map, of: Number, required: true },
  },
  { timestamps: true },
);
usageSnapshotSchema.index({ workspaceId: 1, capturedAt: -1 });
export const UsageSnapshotModel = model('BillingUsageSnapshot', usageSnapshotSchema);

const billingRoleSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['billing_admin', 'finance_viewer'], required: true },
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);
billingRoleSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
export const BillingRoleModel = model('BillingRole', billingRoleSchema);

const planChangeSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
    fromPlanCode: { type: String, required: true },
    toPlanCode: { type: String, required: true },
    type: { type: String, enum: ['upgrade', 'downgrade'], required: true },
    status: { type: String, enum: ['pending', 'applied', 'cancelled'], default: 'pending' },
    effectiveAt: { type: Date, required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);
export const PlanChangeModel = model('BillingPlanChange', planChangeSchema);

const trialSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, unique: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
    planCode: { type: String, required: true },
    startedAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: { type: String, enum: ['active', 'converted', 'expired'], default: 'active' },
    convertedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export const TrialModel = model('BillingTrial', trialSchema);
