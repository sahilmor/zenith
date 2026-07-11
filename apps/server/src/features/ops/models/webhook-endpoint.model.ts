import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const webhookEndpointSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    url: { type: String, required: true, trim: true },
    events: [{ type: String, required: true, trim: true }],
    enabled: { type: Boolean, default: true, index: true },
    secret: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    failureCount: { type: Number, default: 0, min: 0 },
    lastDeliveredAt: { type: Date, default: null },
    lastFailureAt: { type: Date, default: null },
  },
  { timestamps: true },
);

webhookEndpointSchema.index({ workspaceId: 1, enabled: 1 });

export type WebhookEndpoint = InferSchemaType<typeof webhookEndpointSchema>;
export type WebhookEndpointDocument = HydratedDocument<WebhookEndpoint>;
export const WebhookEndpointModel = model<WebhookEndpoint>(
  'WebhookEndpoint',
  webhookEndpointSchema,
);
