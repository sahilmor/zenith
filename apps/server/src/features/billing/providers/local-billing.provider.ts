import crypto from 'node:crypto';
import { env } from '../../../config/env.js';
import { BadRequestError, ForbiddenError } from '../../../utils/app-error.js';
import type {
  BillingProvider,
  BillingWebhookPayload,
  CheckoutSessionInput,
  CheckoutSessionResult,
  PortalSessionInput,
  ProviderSubscriptionState,
} from './billing-provider.js';

export class LocalBillingProvider implements BillingProvider {
  public readonly id = 'local' as const;

  public async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const subscriptionId = `local_sub_${crypto.randomBytes(12).toString('hex')}`;
    const params = new URLSearchParams({
      workspaceId: input.workspaceId,
      plan: input.planCode,
      interval: input.billingInterval,
      providerSubscriptionId: subscriptionId,
    });
    return {
      provider: this.id,
      providerCustomerId: input.providerCustomerId ?? `local_cus_${input.workspaceId}`,
      providerSubscriptionId: subscriptionId,
      providerPriceId: `local_${input.planCode}_${input.billingInterval}`,
      checkoutUrl: `${input.successUrl}${input.successUrl.includes('?') ? '&' : '?'}${params.toString()}`,
    };
  }

  public async createPortalSession(input: PortalSessionInput): Promise<{ readonly url: string }> {
    return { url: input.returnUrl };
  }

  public async cancelSubscription(): Promise<ProviderSubscriptionState | null> {
    return null;
  }

  public async reactivateSubscription(): Promise<ProviderSubscriptionState | null> {
    return null;
  }

  public verifyWebhook(body: unknown, signature: string | undefined): BillingWebhookPayload {
    if (!env.STRIPE_WEBHOOK_SECRET && !signature) {
      return this.parseWebhook(body);
    }
    const expected = crypto
      .createHmac('sha256', env.STRIPE_WEBHOOK_SECRET ?? 'local-billing-secret')
      .update(JSON.stringify(body))
      .digest('hex');
    if (signature !== `sha256=${expected}`) throw new ForbiddenError('Invalid billing signature');
    return this.parseWebhook(body);
  }

  private parseWebhook(body: unknown): BillingWebhookPayload {
    if (!body || typeof body !== 'object') throw new BadRequestError('Invalid billing webhook');
    const payload = body as Record<string, unknown>;
    const providerEventId =
      typeof payload.id === 'string' ? payload.id : `local_evt_${crypto.randomUUID()}`;
    const eventType = typeof payload.type === 'string' ? payload.type : 'subscription.updated';
    const data = typeof payload.data === 'object' && payload.data ? payload.data : payload;
    const record = data as Record<string, unknown>;
    const workspaceId = String(record.workspaceId ?? record.workspace_id ?? '');
    const planCode = String(record.planCode ?? record.plan ?? 'free');
    if (!workspaceId) throw new BadRequestError('Billing webhook workspaceId is required');
    return {
      providerEventId,
      eventType,
      subscription: {
        workspaceId,
        providerCustomerId:
          typeof record.providerCustomerId === 'string' ? record.providerCustomerId : null,
        providerSubscriptionId:
          typeof record.providerSubscriptionId === 'string' ? record.providerSubscriptionId : null,
        providerPriceId: typeof record.providerPriceId === 'string' ? record.providerPriceId : null,
        planCode: planCode === 'business' || planCode === 'pro' ? planCode : 'free',
        billingInterval: record.billingInterval === 'annual' ? 'annual' : 'monthly',
        currency: typeof record.currency === 'string' ? record.currency : 'usd',
        status: record.status === 'past_due' ? 'past_due' : 'active',
        trialStart: null,
        trialEnd: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
        cancelAtPeriodEnd: Boolean(record.cancelAtPeriodEnd),
        canceledAt: null,
        endedAt: null,
        gracePeriodEndsAt:
          record.status === 'past_due' ? new Date(Date.now() + 7 * 86400000) : null,
        metadata: {},
      },
    };
  }
}
