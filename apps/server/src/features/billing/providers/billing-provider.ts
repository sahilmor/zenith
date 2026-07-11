import type {
  BillingInterval,
  BillingProvider as BillingProviderId,
  SubscriptionStatus,
  WorkspacePlan,
} from '@pm/types';

export interface CheckoutSessionInput {
  readonly workspaceId: string;
  readonly planCode: WorkspacePlan;
  readonly billingInterval: BillingInterval;
  readonly customerEmail: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly providerCustomerId?: string | null;
}

export interface CheckoutSessionResult {
  readonly provider: BillingProviderId;
  readonly providerCustomerId: string | null;
  readonly providerSubscriptionId: string | null;
  readonly providerPriceId: string | null;
  readonly checkoutUrl: string;
}

export interface PortalSessionInput {
  readonly providerCustomerId: string;
  readonly returnUrl: string;
}

export interface ProviderSubscriptionState {
  readonly workspaceId: string;
  readonly providerCustomerId: string | null;
  readonly providerSubscriptionId: string | null;
  readonly providerPriceId: string | null;
  readonly planCode: WorkspacePlan;
  readonly billingInterval: BillingInterval;
  readonly currency: string;
  readonly status: SubscriptionStatus;
  readonly trialStart: Date | null;
  readonly trialEnd: Date | null;
  readonly currentPeriodStart: Date | null;
  readonly currentPeriodEnd: Date | null;
  readonly cancelAtPeriodEnd: boolean;
  readonly canceledAt: Date | null;
  readonly endedAt: Date | null;
  readonly gracePeriodEndsAt: Date | null;
  readonly metadata: Record<string, string>;
}

export interface BillingWebhookPayload {
  readonly providerEventId: string;
  readonly eventType: string;
  readonly subscription?: ProviderSubscriptionState;
  readonly invoice?: {
    readonly workspaceId: string;
    readonly providerInvoiceId: string;
    readonly amount: number;
    readonly currency: string;
    readonly status: string;
    readonly date: Date;
    readonly hostedInvoiceUrl: string | null;
    readonly invoicePdfUrl: string | null;
  };
}

export interface BillingProvider {
  readonly id: BillingProviderId;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  createPortalSession(input: PortalSessionInput): Promise<{ readonly url: string }>;
  cancelSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionState | null>;
  reactivateSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionState | null>;
  verifyWebhook(body: unknown, signature: string | undefined): BillingWebhookPayload;
}
