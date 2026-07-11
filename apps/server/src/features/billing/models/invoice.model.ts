import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const invoiceSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
      index: true,
    },
    provider: { type: String, required: true, trim: true, index: true },
    providerInvoiceId: { type: String, default: null, trim: true, index: true },
    date: { type: Date, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, lowercase: true, trim: true },
    status: { type: String, required: true, trim: true },
    hostedInvoiceUrl: { type: String, default: null, trim: true },
    invoicePdfUrl: { type: String, default: null, trim: true },
    metadata: { type: Map, of: String, default: {} },
  },
  { timestamps: true },
);

invoiceSchema.index({ workspaceId: 1, date: -1 });

export type Invoice = InferSchemaType<typeof invoiceSchema>;
export type InvoiceDocument = HydratedDocument<Invoice>;
export const InvoiceModel = model<Invoice>('Invoice', invoiceSchema);
