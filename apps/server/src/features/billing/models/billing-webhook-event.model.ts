import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const billingWebhookEventSchema = new Schema(
  {
    provider: { type: String, required: true, trim: true, index: true },
    providerEventId: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true, index: true },
    receivedAt: { type: Date, required: true, default: Date.now },
    processedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['received', 'processed', 'failed', 'duplicate'],
      default: 'received',
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    errorSummary: { type: String, default: null, trim: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
    providerSubscriptionId: { type: String, default: null, trim: true, index: true },
  },
  { timestamps: true },
);

billingWebhookEventSchema.index({ provider: 1, providerEventId: 1 }, { unique: true });

export type BillingWebhookEvent = InferSchemaType<typeof billingWebhookEventSchema>;
export type BillingWebhookEventDocument = HydratedDocument<BillingWebhookEvent>;
export const BillingWebhookEventModel = model<BillingWebhookEvent>(
  'BillingWebhookEvent',
  billingWebhookEventSchema,
);
