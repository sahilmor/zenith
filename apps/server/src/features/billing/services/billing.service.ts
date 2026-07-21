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
import {
  BillingRoleModel,
  PlanChangeModel,
  SubscriptionHistoryModel,
  TrialModel,
} from '../models/billing-foundation.model.js';

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
      plan: await pricingService.getPlan(subscription.planCode as WorkspacePlan),
      subscription: subscriptionService.toSubscriptionSummary(subscription),
      entitlements,
      billingEnabled: env.BILLING_ENABLED,
    };
  }

  public async getUsage(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    await this.requireBillingReadAccess(workspaceId, userId);
    return entitlementService.getWorkspaceEntitlements(workspaceId);
  }

  public async getHistory(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    await this.requireBillingReadAccess(workspaceId, userId);
    return SubscriptionHistoryModel.find({ workspaceId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
  }

  public async getTrial(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    await this.requireBillingReadAccess(workspaceId, userId);
    return TrialModel.findOne({ workspaceId }).lean().exec();
  }

  public async requestPlanChange(input: {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    planCode: WorkspacePlan;
    billingInterval: BillingInterval;
    type: 'upgrade' | 'downgrade';
  }) {
    await this.requireBillingWriteAccess(input.workspaceId, input.userId);
    const subscription = await this.subscriptions.ensureFree(input.workspaceId);
    const target = await pricingService.getPlan(input.planCode);
    if (target.code === subscription.planCode)
      throw new ForbiddenError('Workspace is already on this plan');
    const effectiveAt =
      input.type === 'downgrade' ? (subscription.currentPeriodEnd ?? new Date()) : new Date();
    const change = await PlanChangeModel.create({
      workspaceId: input.workspaceId,
      subscriptionId: subscription._id,
      fromPlanCode: subscription.planCode,
      toPlanCode: target.code,
      type: input.type,
      effectiveAt,
      requestedBy: input.userId,
    });
    await auditLogService.record({
      actorId: input.userId,
      workspaceId: input.workspaceId,
      targetType: 'plan_change',
      targetId: change.id,
      action: `billing.${input.type}_requested`,
      metadata: { fromPlan: subscription.planCode, toPlan: target.code, effectiveAt },
    });
    return {
      id: change.id,
      type: input.type,
      fromPlanCode: subscription.planCode,
      toPlanCode: target.code,
      billingInterval: input.billingInterval,
      effectiveAt: effectiveAt.toISOString(),
      amount: input.billingInterval === 'monthly' ? target.monthlyPrice : target.annualPrice,
      currency: target.currency,
      checkoutRequired: input.type === 'upgrade' && (target.monthlyPrice ?? 0) > 0,
    };
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
    const plan = await pricingService.getPlan(input.planCode);
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
          .getProvider(current.provider as 'local' | 'stripe')
          .cancelSubscription(current.providerSubscriptionId)
      : null;
    const result = providerResult
      ? await subscriptionService.syncSubscription({
          ...providerResult,
          workspaceId,
          provider: current.provider as 'local' | 'stripe',
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
          .getProvider(current.provider as 'local' | 'stripe')
          .reactivateSubscription(current.providerSubscriptionId)
      : null;
    const result = providerResult
      ? await subscriptionService.syncSubscription({
          ...providerResult,
          workspaceId,
          provider: current.provider as 'local' | 'stripe',
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
    const billingRole = await BillingRoleModel.findOne({ workspaceId, userId }).lean().exec();
    if ((!membership || membership.status !== 'active') && !billingRole)
      throw new ForbiddenError('Billing access denied');
  }

  private async requireBillingWriteAccess(
    workspaceId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    const membership = await this.workspaces.findMembership(workspaceId, userId);
    const billingRole = await BillingRoleModel.findOne({ workspaceId, userId }).lean().exec();
    if (
      !membership ||
      membership.status !== 'active' ||
      !(membership.role === 'owner' || billingRole?.role === 'billing_admin')
    ) {
      throw new ForbiddenError(
        'Billing changes require workspace owner or billing administrator access',
      );
    }
  }
}

export const billingService = new BillingService();
