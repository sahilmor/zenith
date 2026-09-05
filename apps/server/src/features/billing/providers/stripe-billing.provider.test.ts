import crypto from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { env } from '../../../config/env.js';
import { StripeBillingProvider } from './stripe-billing.provider.js';

const webhookSecret = 'whsec_test_secret_for_signature_verification';

const stripeEventBody = (workspaceId: string): Record<string, unknown> => ({
  id: 'evt_test123',
  type: 'customer.subscription.updated',
  data: {
    object: {
      id: 'sub_test123',
      customer: 'cus_test123',
      subscription: 'sub_test123',
      currency: 'usd',
      status: 'active',
      metadata: { workspaceId, planCode: 'pro', billingInterval: 'monthly' },
    },
  },
});

const signStripePayload = (rawBody: Buffer, timestampSeconds: number, secret: string): string => {
  const signedPayload = `${timestampSeconds}.${rawBody.toString('utf8')}`;
  const hmac = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestampSeconds},v1=${hmac}`;
};

describe('StripeBillingProvider.verifyWebhook', () => {
  const originalSecret = env.STRIPE_WEBHOOK_SECRET;

  afterEach(() => {
    env.STRIPE_WEBHOOK_SECRET = originalSecret;
  });

  it('accepts a correctly signed Stripe webhook using the real t=,v1= scheme', () => {
    env.STRIPE_WEBHOOK_SECRET = webhookSecret;
    const provider = new StripeBillingProvider();
    const body = stripeEventBody('6a9c00000000000000000001');
    const rawBody = Buffer.from(JSON.stringify(body), 'utf8');
    const signature = signStripePayload(rawBody, Math.floor(Date.now() / 1000), webhookSecret);

    const payload = provider.verifyWebhook(body, signature, rawBody);

    expect(payload.eventType).toBe('customer.subscription.updated');
    expect(payload.subscription?.workspaceId).toBe('6a9c00000000000000000001');
  });

  it('rejects the old GitHub-style sha256= signature format', () => {
    env.STRIPE_WEBHOOK_SECRET = webhookSecret;
    const provider = new StripeBillingProvider();
    const body = stripeEventBody('6a9c00000000000000000001');
    const rawBody = Buffer.from(JSON.stringify(body), 'utf8');
    const bogusSignature = `sha256=${crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(body)).digest('hex')}`;

    expect(() => provider.verifyWebhook(body, bogusSignature, rawBody)).toThrow(
      'Invalid billing signature',
    );
  });

  it('rejects a signature computed with the wrong secret', () => {
    env.STRIPE_WEBHOOK_SECRET = webhookSecret;
    const provider = new StripeBillingProvider();
    const body = stripeEventBody('6a9c00000000000000000001');
    const rawBody = Buffer.from(JSON.stringify(body), 'utf8');
    const signature = signStripePayload(rawBody, Math.floor(Date.now() / 1000), 'wrong_secret');

    expect(() => provider.verifyWebhook(body, signature, rawBody)).toThrow(
      'Invalid billing signature',
    );
  });

  it('rejects a timestamp outside the replay-protection tolerance', () => {
    env.STRIPE_WEBHOOK_SECRET = webhookSecret;
    const provider = new StripeBillingProvider();
    const body = stripeEventBody('6a9c00000000000000000001');
    const rawBody = Buffer.from(JSON.stringify(body), 'utf8');
    const staleTimestamp = Math.floor(Date.now() / 1000) - 3600;
    const signature = signStripePayload(rawBody, staleTimestamp, webhookSecret);

    expect(() => provider.verifyWebhook(body, signature, rawBody)).toThrow(
      'Billing webhook timestamp is outside the allowed tolerance',
    );
  });

  it('rejects when the raw request body was not captured', () => {
    env.STRIPE_WEBHOOK_SECRET = webhookSecret;
    const provider = new StripeBillingProvider();
    const body = stripeEventBody('6a9c00000000000000000001');
    const signature = signStripePayload(
      Buffer.from(JSON.stringify(body)),
      Math.floor(Date.now() / 1000),
      webhookSecret,
    );

    expect(() => provider.verifyWebhook(body, signature, undefined)).toThrow(
      'Stripe webhook requires the raw request body',
    );
  });
});
