import type { Types } from 'mongoose';
import { BillingWebhookEventModel } from '../models/billing-webhook-event.model.js';
import { InvoiceModel } from '../models/invoice.model.js';
import { SubscriptionModel, type SubscriptionDocument } from '../models/subscription.model.js';

export class SubscriptionRepository {
  public findByWorkspace(workspaceId: Types.ObjectId): Promise<SubscriptionDocument | null> {
    return SubscriptionModel.findOne({ workspaceId }).exec();
  }

  public findByProviderSubscriptionId(providerSubscriptionId: string) {
    return SubscriptionModel.findOne({ providerSubscriptionId }).exec();
  }

  public async ensureFree(workspaceId: Types.ObjectId): Promise<SubscriptionDocument> {
    const existing = await this.findByWorkspace(workspaceId);
    if (existing) return existing;
    return SubscriptionModel.create({
      workspaceId,
      provider: 'local',
      planCode: 'free',
      billingInterval: 'monthly',
      currency: 'usd',
      status: 'active',
    });
  }

  public upsertByWorkspace(
    workspaceId: Types.ObjectId,
    update: Partial<SubscriptionDocument>,
  ): Promise<SubscriptionDocument> {
    return SubscriptionModel.findOneAndUpdate({ workspaceId }, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }).exec();
  }

  public update(
    subscriptionId: Types.ObjectId,
    update: Partial<SubscriptionDocument>,
  ): Promise<SubscriptionDocument | null> {
    return SubscriptionModel.findByIdAndUpdate(subscriptionId, update, { new: true }).exec();
  }
}

export class InvoiceRepository {
  public listByWorkspace(workspaceId: Types.ObjectId) {
    return InvoiceModel.find({ workspaceId }).sort({ date: -1 }).limit(100).exec();
  }

  public upsertProviderInvoice(input: {
    workspaceId: Types.ObjectId;
    subscriptionId?: Types.ObjectId | null;
    provider: string;
    providerInvoiceId: string;
    date: Date;
    amount: number;
    currency: string;
    status: string;
    hostedInvoiceUrl?: string | null;
    invoicePdfUrl?: string | null;
  }) {
    return InvoiceModel.findOneAndUpdate(
      { provider: input.provider, providerInvoiceId: input.providerInvoiceId },
      input,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
  }
}

export class BillingWebhookEventRepository {
  public async createReceived(input: {
    provider: string;
    providerEventId: string;
    eventType: string;
    workspaceId?: Types.ObjectId | null;
    providerSubscriptionId?: string | null;
  }) {
    const existing = await BillingWebhookEventModel.findOne({
      provider: input.provider,
      providerEventId: input.providerEventId,
    }).exec();
    if (existing) {
      await BillingWebhookEventModel.updateOne(
        { _id: existing._id },
        { $inc: { attempts: 1 } },
      ).exec();
      existing.status = 'duplicate';
      return existing;
    }
    try {
      return await BillingWebhookEventModel.create({
        ...input,
        receivedAt: new Date(),
        status: 'received',
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        const existingEvent = await BillingWebhookEventModel.findOneAndUpdate(
          { provider: input.provider, providerEventId: input.providerEventId },
          { $inc: { attempts: 1 } },
          { new: true },
        ).exec();
        if (existingEvent) existingEvent.status = 'duplicate';
        return existingEvent;
      }
      throw error;
    }
  }

  public markProcessed(eventId: Types.ObjectId) {
    return BillingWebhookEventModel.findByIdAndUpdate(eventId, {
      status: 'processed',
      processedAt: new Date(),
      $inc: { attempts: 1 },
    }).exec();
  }

  public markFailed(eventId: Types.ObjectId, errorSummary: string) {
    return BillingWebhookEventModel.findByIdAndUpdate(eventId, {
      status: 'failed',
      errorSummary,
      $inc: { attempts: 1 },
    }).exec();
  }
}
