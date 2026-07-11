import type {
  BillingInterval,
  BillingInvoiceSummary,
  WorkspaceBillingSummary,
  WorkspacePlan,
} from '@pm/types';
import type { Types } from 'mongoose';
import { env } from '../../../config/env.js';
import { ForbiddenError, NotFoundError } from '../../../utils/app-error.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import { WorkspaceRepository } from '../../workspaces/repositories/workspace.repository.js';
import { InvoiceRepository, SubscriptionRepository } from '../repositories/billing.repository.js';
import { BillingProviderRegistry } from '../providers/provider-registry.js';
import { entitlementService } from './entitlement.service.js';
import { pricingService } from './pricing.service.js';
import { subscriptionService } from './subscription.service.js';

const billingRoles = new Set(['owner', 'admin'] as const);

export class BillingService {
  public constructor(
    private readonly workspaces = new WorkspaceRepository(),
    private readonly subscriptions = new SubscriptionRepository(),
    private readonly invoices = new InvoiceRepository(),
    private readonly providers = new BillingProviderRegistry(),
  ) {}

  public listPlans() {
    return pricingService.listPlans();
  }

  public async getBilling(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<WorkspaceBillingSummary> {
    await this.requireBillingReadAccess(workspaceId, userId);
    const subscription = await this.subscriptions.ensureFree(workspaceId);
    const entitlements = await entitlementService.getWorkspaceEntitlements(workspaceId);
    return {
      workspaceId: workspaceId.toString(),
      plan: pricingService.getPlan(subscription.planCode as WorkspacePlan),
      subscription: subscriptionService.toSubscriptionSummary(subscription),
      entitlements,
      billingEnabled: env.BILLING_ENABLED,
    };
  }

  public async getUsage(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    await this.requireBillingReadAccess(workspaceId, userId);
    return entitlementService.getWorkspaceEntitlements(workspaceId);
  }

  public async listInvoices(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<BillingInvoiceSummary[]> {
    await this.requireBillingReadAccess(workspaceId, userId);
    return (await this.invoices.listByWorkspace(workspaceId)).map((invoice) => ({
      id: invoice.id,
      providerInvoiceId: invoice.providerInvoiceId ?? null,
      date: invoice.date.toISOString(),
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      hostedInvoiceUrl: invoice.hostedInvoiceUrl ?? null,
      invoicePdfUrl: invoice.invoicePdfUrl ?? null,
    }));
  }

  public async createCheckout(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    customerEmail: string;
    planCode: WorkspacePlan;
    billingInterval: BillingInterval;
  }) {
    await this.requireBillingWriteAccess(input.workspaceId, input.userId);
    const workspace = await this.workspaces.findWorkspaceById(input.workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found');
    const plan = pricingService.getPlan(input.planCode);
    if (plan.code === 'free' || plan.code === 'enterprise') {
      throw new ForbiddenError('This plan cannot be purchased through checkout');
    }
    const subscription = await this.subscriptions.ensureFree(input.workspaceId);
    const provider = this.providers.getProvider();
    const session = await provider.createCheckoutSession({
      workspaceId: input.workspaceId.toString(),
      planCode: input.planCode,
      billingInterval: input.billingInterval,
      customerEmail: input.customerEmail,
      providerCustomerId: subscription.providerCustomerId ?? null,
      successUrl:
        env.BILLING_SUCCESS_URL ??
        `${env.APP_URL.replace(/\/$/, '')}/dashboard/workspace/billing?checkout=success`,
      cancelUrl:
        env.BILLING_CANCEL_URL ??
        `${env.APP_URL.replace(/\/$/, '')}/dashboard/workspace/billing?checkout=cancelled`,
    });
    await auditLogService.record({
      actorId: input.userId,
      workspaceId: input.workspaceId,
      targetType: 'subscription',
      action: 'billing.checkout_initiated',
      metadata: { planCode: input.planCode, billingInterval: input.billingInterval },
    });
    if (provider.id === 'local') {
      await subscriptionService.syncSubscription({
        workspaceId: input.workspaceId,
        provider: 'local',
        providerCustomerId: session.providerCustomerId,
        providerSubscriptionId: session.providerSubscriptionId,
        providerPriceId: session.providerPriceId,
        planCode: input.planCode,
        billingInterval: input.billingInterval,
        currency: plan.currency,
        status: plan.trialDays > 0 ? 'trialing' : 'active',
        trialStart: plan.trialDays > 0 ? new Date() : null,
        trialEnd: plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 86400000) : null,
      });
    }
    return session;
  }

  public async createPortal(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    await this.requireBillingWriteAccess(workspaceId, userId);
    const subscription = await this.subscriptions.ensureFree(workspaceId);
    if (!subscription.providerCustomerId) {
      return { url: `${env.APP_URL.replace(/\/$/, '')}/dashboard/workspace/billing` };
    }
    return this.providers.getProvider().createPortalSession({
      providerCustomerId: subscription.providerCustomerId,
      returnUrl: `${env.APP_URL.replace(/\/$/, '')}/dashboard/workspace/billing`,
    });
  }

  public async cancel(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    await this.requireBillingWriteAccess(workspaceId, userId);
    const current = await this.subscriptions.ensureFree(workspaceId);
    const providerResult = current.providerSubscriptionId
      ? await this.providers
          .getProvider(current.provider)
          .cancelSubscription(current.providerSubscriptionId)
      : null;
    const result = providerResult
      ? await subscriptionService.syncSubscription({
          ...providerResult,
          workspaceId,
          provider: current.provider,
        })
      : await subscriptionService.scheduleCancellation(workspaceId);
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'subscription',
      targetId: result.id,
      action: 'billing.cancellation_scheduled',
    });
    return result;
  }

  public async reactivate(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    await this.requireBillingWriteAccess(workspaceId, userId);
    const current = await this.subscriptions.ensureFree(workspaceId);
    const providerResult = current.providerSubscriptionId
      ? await this.providers
          .getProvider(current.provider)
          .reactivateSubscription(current.providerSubscriptionId)
      : null;
    const result = providerResult
      ? await subscriptionService.syncSubscription({
          ...providerResult,
          workspaceId,
          provider: current.provider,
        })
      : await subscriptionService.reactivate(workspaceId);
    await auditLogService.record({
      actorId: userId,
      workspaceId,
      targetType: 'subscription',
      targetId: result.id,
      action: 'billing.cancellation_reversed',
    });
    return result;
  }

  private async requireBillingReadAccess(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    const membership = await this.workspaces.findMembership(workspaceId, userId);
    if (!membership || membership.status !== 'active')
      throw new ForbiddenError('Billing access denied');
  }

  private async requireBillingWriteAccess(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    const membership = await this.workspaces.findMembership(workspaceId, userId);
    if (
      !membership ||
      membership.status !== 'active' ||
      !billingRoles.has(membership.role as 'owner' | 'admin')
    ) {
      throw new ForbiddenError('Billing changes require workspace owner or admin access');
    }
  }
}

export const billingService = new BillingService();
