import type {
  BillingInterval,
  BillingProvider as BillingProviderId,
  SubscriptionStatus,
  WorkspacePlan,
} from '@pm/types';

export interface BillingCustomerInput {
  readonly email: string;
  readonly name?: string;
  readonly workspaceId?: string;
  readonly metadata?: Record<string, string>;
}

export interface BillingCustomerResult {
  readonly provider: BillingProviderId;
  readonly providerCustomerId: string;
  readonly email: string | null;
  readonly name: string | null;
}

export interface BillingOrderInput {
  readonly amount: number;
  readonly currency: string;
  readonly providerCustomerId?: string | null;
  readonly workspaceId?: string;
  readonly description?: string;
  readonly metadata?: Record<string, string>;
  readonly captureMethod?: 'automatic' | 'manual';
}

export interface BillingOrderResult {
  readonly provider: BillingProviderId;
  readonly providerOrderId: string;
  readonly providerPaymentId: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly clientSecret: string | null;
  readonly checkoutUrl: string | null;
}

export interface BillingPaymentVerificationInput {
  readonly providerPaymentId: string;
}

export interface BillingPaymentVerificationResult {
  readonly provider: BillingProviderId;
  readonly providerPaymentId: string;
  readonly providerOrderId: string | null;
  readonly amount: number | null;
  readonly currency: string | null;
  readonly status: string;
  readonly verified: boolean;
  readonly captured: boolean;
}

export interface BillingPaymentActionInput {
  readonly providerPaymentId: string;
  readonly amount?: number;
}

export interface BillingPaymentActionResult {
  readonly provider: BillingProviderId;
  readonly providerPaymentId: string;
  readonly amount: number | null;
  readonly currency: string | null;
  readonly status: string;
}

export interface BillingRefundInput {
  readonly providerPaymentId: string;
  readonly amount?: number;
  readonly reason?: string;
  readonly metadata?: Record<string, string>;
}

export interface BillingRefundResult {
  readonly provider: BillingProviderId;
  readonly providerRefundId: string;
  readonly providerPaymentId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
}

export interface BillingSubscriptionInput {
  readonly providerCustomerId: string;
  readonly workspaceId: string;
  readonly planCode: WorkspacePlan;
  readonly billingInterval: BillingInterval;
  readonly providerPriceId?: string | null;
  readonly trialDays?: number;
  readonly metadata?: Record<string, string>;
}

export interface BillingPaymentDetailsResult {
  readonly provider: BillingProviderId;
  readonly providerPaymentId: string;
  readonly providerCustomerId: string | null;
  readonly providerOrderId: string | null;
  readonly amount: number | null;
  readonly amountCapturable: number | null;
  readonly amountReceived: number | null;
  readonly currency: string | null;
  readonly status: string;
  readonly captured: boolean;
  readonly metadata: Record<string, string>;
}

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
  createCustomer(input: BillingCustomerInput): Promise<BillingCustomerResult>;
  createOrder(input: BillingOrderInput): Promise<BillingOrderResult>;
  verifyPayment(input: BillingPaymentVerificationInput): Promise<BillingPaymentVerificationResult>;
  capturePayment(input: BillingPaymentActionInput): Promise<BillingPaymentActionResult>;
  cancelPayment(input: BillingPaymentActionInput): Promise<BillingPaymentActionResult>;
  refundPayment(input: BillingRefundInput): Promise<BillingRefundResult>;
  createSubscription(input: BillingSubscriptionInput): Promise<ProviderSubscriptionState>;
  cancelSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionState | null>;
  resumeSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionState | null>;
  reactivateSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionState | null>;
  retrievePaymentDetails(providerPaymentId: string): Promise<BillingPaymentDetailsResult>;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  createPortalSession(input: PortalSessionInput): Promise<{ readonly url: string }>;
  verifyWebhook(body: unknown, signature: string | undefined): BillingWebhookPayload;
}
