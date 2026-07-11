import { Types } from 'mongoose';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import {
  BillingWebhookEventRepository,
  InvoiceRepository,
} from '../repositories/billing.repository.js';
import { BillingProviderRegistry } from '../providers/provider-registry.js';
import { subscriptionService } from './subscription.service.js';

export class BillingWebhookService {
  public constructor(
    private readonly events = new BillingWebhookEventRepository(),
    private readonly invoices = new InvoiceRepository(),
    private readonly providers = new BillingProviderRegistry(),
  ) {}

  public async handle(providerId: 'local' | 'stripe', body: unknown, signature?: string) {
    const provider = this.providers.getProvider(providerId);
    const payload = provider.verifyWebhook(body, signature);
    const workspaceId = payload.subscription?.workspaceId
      ? new Types.ObjectId(payload.subscription.workspaceId)
      : payload.invoice?.workspaceId
        ? new Types.ObjectId(payload.invoice.workspaceId)
        : null;
    const event = await this.events.createReceived({
      provider: providerId,
      providerEventId: payload.providerEventId,
      eventType: payload.eventType,
      workspaceId,
      providerSubscriptionId: payload.subscription?.providerSubscriptionId ?? null,
    });
    if (!event || event.status === 'duplicate') {
      return { status: 'duplicate' };
    }
    try {
      if (payload.subscription && workspaceId) {
        const subscription = await subscriptionService.syncSubscription({
          workspaceId,
          provider: providerId,
          providerCustomerId: payload.subscription.providerCustomerId,
          providerSubscriptionId: payload.subscription.providerSubscriptionId,
          providerPriceId: payload.subscription.providerPriceId,
          planCode: payload.subscription.planCode,
          billingInterval: payload.subscription.billingInterval,
          currency: payload.subscription.currency,
          status: payload.subscription.status,
          trialStart: payload.subscription.trialStart,
          trialEnd: payload.subscription.trialEnd,
          currentPeriodStart: payload.subscription.currentPeriodStart,
          currentPeriodEnd: payload.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: payload.subscription.cancelAtPeriodEnd,
          canceledAt: payload.subscription.canceledAt,
          endedAt: payload.subscription.endedAt,
          gracePeriodEndsAt: payload.subscription.gracePeriodEndsAt,
          metadata: payload.subscription.metadata,
        });
        await auditLogService.record({
          workspaceId,
          targetType: 'subscription',
          targetId: subscription.id,
          action: `billing.${payload.eventType}`,
          metadata: { planCode: subscription.planCode, status: subscription.status },
        });
      }
      if (payload.invoice && workspaceId) {
        await this.invoices.upsertProviderInvoice({
          workspaceId,
          provider: providerId,
          providerInvoiceId: payload.invoice.providerInvoiceId,
          date: payload.invoice.date,
          amount: payload.invoice.amount,
          currency: payload.invoice.currency,
          status: payload.invoice.status,
          hostedInvoiceUrl: payload.invoice.hostedInvoiceUrl,
          invoicePdfUrl: payload.invoice.invoicePdfUrl,
        });
      }
      await this.events.markProcessed(event._id);
      return { status: 'processed' };
    } catch (error) {
      await this.events.markFailed(event._id, error instanceof Error ? error.message : 'Failed');
      throw error;
    }
  }
}

export const billingWebhookService = new BillingWebhookService();
