import crypto from 'node:crypto';
import type { BillingInterval, SubscriptionStatus, WorkspacePlan } from '@pm/types';
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

const priceIdFor = (planCode: WorkspacePlan, interval: BillingInterval): string | undefined => {
  if (planCode === 'pro' && interval === 'monthly') return env.STRIPE_PRO_MONTHLY_PRICE_ID;
  if (planCode === 'pro' && interval === 'annual') return env.STRIPE_PRO_ANNUAL_PRICE_ID;
  if (planCode === 'business' && interval === 'monthly')
    return env.STRIPE_BUSINESS_MONTHLY_PRICE_ID;
  if (planCode === 'business' && interval === 'annual') return env.STRIPE_BUSINESS_ANNUAL_PRICE_ID;
  return undefined;
};

export class StripeBillingProvider implements BillingProvider {
  public readonly id = 'stripe' as const;

  public async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    if (!env.STRIPE_SECRET_KEY) throw new BadRequestError('Stripe is not configured');
    const priceId = priceIdFor(input.planCode, input.billingInterval);
    if (!priceId) throw new BadRequestError('Billing price is not configured');

    const body = new URLSearchParams({
      mode: 'subscription',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'metadata[workspaceId]': input.workspaceId,
      'metadata[planCode]': input.planCode,
      'metadata[billingInterval]': input.billingInterval,
      client_reference_id: input.workspaceId,
    });
    if (input.providerCustomerId) body.set('customer', input.providerCustomerId);
    else body.set('customer_email', input.customerEmail);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `checkout_${input.workspaceId}_${input.planCode}_${input.billingInterval}`,
      },
      body,
    });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) throw new BadRequestError('Unable to create checkout session');
    return {
      provider: this.id,
      providerCustomerId: typeof payload.customer === 'string' ? payload.customer : null,
      providerSubscriptionId:
        typeof payload.subscription === 'string' ? payload.subscription : null,
      providerPriceId: priceId,
      checkoutUrl: typeof payload.url === 'string' ? payload.url : input.cancelUrl,
    };
  }

  public async createPortalSession(input: PortalSessionInput): Promise<{ readonly url: string }> {
    if (!env.STRIPE_SECRET_KEY) throw new BadRequestError('Stripe is not configured');
    const body = new URLSearchParams({
      customer: input.providerCustomerId,
      return_url: input.returnUrl,
    });
    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok || typeof payload.url !== 'string')
      throw new BadRequestError('Unable to create billing portal session');
    return { url: payload.url };
  }

  public async cancelSubscription(
    providerSubscriptionId: string,
  ): Promise<ProviderSubscriptionState | null> {
    return this.updateSubscription(providerSubscriptionId, { cancel_at_period_end: 'true' });
  }

  public async reactivateSubscription(
    providerSubscriptionId: string,
  ): Promise<ProviderSubscriptionState | null> {
    return this.updateSubscription(providerSubscriptionId, { cancel_at_period_end: 'false' });
  }

  public verifyWebhook(body: unknown, signature: string | undefined): BillingWebhookPayload {
    if (!env.STRIPE_WEBHOOK_SECRET) throw new BadRequestError('Stripe webhook is not configured');
    const expected = crypto
      .createHmac('sha256', env.STRIPE_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');
    if (signature !== `sha256=${expected}`) throw new ForbiddenError('Invalid billing signature');
    return this.parseStripeWebhook(body);
  }

  private parseStripeWebhook(body: unknown): BillingWebhookPayload {
    if (!body || typeof body !== 'object') throw new BadRequestError('Invalid billing webhook');
    const event = body as Record<string, unknown>;
    const eventType = String(event.type ?? 'unknown');
    const data = event.data as { object?: Record<string, unknown> } | undefined;
    const object = data?.object ?? {};
    const metadata = (object.metadata ?? {}) as Record<string, unknown>;
    const workspaceId = String(metadata.workspaceId ?? object.client_reference_id ?? '');
    if (!workspaceId) throw new BadRequestError('Billing webhook workspaceId is required');
    return {
      providerEventId: String(event.id ?? crypto.randomUUID()),
      eventType,
      subscription: {
        workspaceId,
        providerCustomerId: typeof object.customer === 'string' ? object.customer : null,
        providerSubscriptionId:
          typeof object.subscription === 'string' ? object.subscription : null,
        providerPriceId: null,
        planCode:
          metadata.planCode === 'business'
            ? 'business'
            : metadata.planCode === 'pro'
              ? 'pro'
              : 'free',
        billingInterval: metadata.billingInterval === 'annual' ? 'annual' : 'monthly',
        currency: typeof object.currency === 'string' ? object.currency : 'usd',
        status: eventType.includes('payment_failed') ? 'past_due' : 'active',
        trialStart: null,
        trialEnd: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        endedAt: null,
        gracePeriodEndsAt: eventType.includes('payment_failed')
          ? new Date(Date.now() + 7 * 86400000)
          : null,
        metadata: {},
      },
    };
  }

  private async updateSubscription(
    providerSubscriptionId: string,
    fields: Record<string, string>,
  ): Promise<ProviderSubscriptionState | null> {
    if (!env.STRIPE_SECRET_KEY) throw new BadRequestError('Stripe is not configured');
    const body = new URLSearchParams(fields);
    const response = await fetch(
      `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(providerSubscriptionId)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': `subscription_${providerSubscriptionId}_${fields.cancel_at_period_end}`,
        },
        body,
      },
    );
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) throw new BadRequestError('Unable to update Stripe subscription');
    return this.subscriptionStateFromStripeObject(payload);
  }

  private subscriptionStateFromStripeObject(
    object: Record<string, unknown>,
  ): ProviderSubscriptionState {
    const metadata = asRecord(object.metadata);
    const workspaceId = asString(metadata.workspaceId);
    if (!workspaceId) throw new BadRequestError('Stripe subscription workspaceId is required');
    return {
      workspaceId,
      providerCustomerId: asString(object.customer),
      providerSubscriptionId: asString(object.id),
      providerPriceId: firstSubscriptionPriceId(object),
      planCode: normalizePlanCode(asString(metadata.planCode)),
      billingInterval: asString(metadata.billingInterval) === 'annual' ? 'annual' : 'monthly',
      currency: asString(object.currency) ?? 'usd',
      status: normalizeStripeStatus(asString(object.status)),
      trialStart: unixDate(object.trial_start),
      trialEnd: unixDate(object.trial_end),
      currentPeriodStart: unixDate(object.current_period_start),
      currentPeriodEnd: unixDate(object.current_period_end),
      cancelAtPeriodEnd: object.cancel_at_period_end === true,
      canceledAt: unixDate(object.canceled_at),
      endedAt: unixDate(object.ended_at),
      gracePeriodEndsAt:
        asString(object.status) === 'past_due' ? new Date(Date.now() + 7 * 86400000) : null,
      metadata: Object.fromEntries(
        Object.entries(metadata).map(([key, value]) => [key, String(value)]),
      ),
    };
  }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const unixDate = (value: unknown): Date | null =>
  typeof value === 'number' ? new Date(value * 1000) : null;

const normalizePlanCode = (value: string | null): WorkspacePlan => {
  if (value === 'business' || value === 'pro' || value === 'enterprise') return value;
  return 'free';
};

const normalizeStripeStatus = (value: string | null): SubscriptionStatus => {
  if (
    value === 'trialing' ||
    value === 'active' ||
    value === 'past_due' ||
    value === 'unpaid' ||
    value === 'canceled' ||
    value === 'incomplete' ||
    value === 'incomplete_expired' ||
    value === 'paused'
  ) {
    return value;
  }
  return 'active';
};

const firstSubscriptionPriceId = (subscription: Record<string, unknown>): string | null => {
  const items = asRecord(subscription.items);
  const data = Array.isArray(items.data) ? items.data : [];
  const firstItem = asRecord(data[0]);
  const price = asRecord(firstItem.price);
  return asString(price.id);
};
