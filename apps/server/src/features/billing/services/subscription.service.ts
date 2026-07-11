import type { BillingInterval, WorkspacePlan, WorkspaceSubscriptionSummary } from '@pm/types';
import type { Types } from 'mongoose';
import { env } from '../../../config/env.js';
import type { SubscriptionDocument } from '../models/subscription.model.js';
import { SubscriptionRepository } from '../repositories/billing.repository.js';

export class SubscriptionService {
  public constructor(private readonly subscriptions = new SubscriptionRepository()) {}

  public ensureWorkspaceSubscription(workspaceId: Types.ObjectId): Promise<SubscriptionDocument> {
    return this.subscriptions.ensureFree(workspaceId);
  }

  public async syncSubscription(input: {
    workspaceId: Types.ObjectId;
    provider: 'local' | 'stripe';
    providerCustomerId?: string | null;
    providerSubscriptionId?: string | null;
    providerPriceId?: string | null;
    planCode: WorkspacePlan;
    billingInterval: BillingInterval;
    currency: string;
    status: WorkspaceSubscriptionSummary['status'];
    trialStart?: Date | null;
    trialEnd?: Date | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: Date | null;
    endedAt?: Date | null;
    gracePeriodEndsAt?: Date | null;
    metadata?: Record<string, string>;
  }): Promise<WorkspaceSubscriptionSummary> {
    const subscription = await this.subscriptions.upsertByWorkspace(input.workspaceId, {
      provider: input.provider,
      providerCustomerId: input.providerCustomerId ?? null,
      providerSubscriptionId: input.providerSubscriptionId ?? null,
      providerPriceId: input.providerPriceId ?? null,
      planCode: input.planCode,
      billingInterval: input.billingInterval,
      currency: input.currency,
      status: input.status,
      trialStart: input.trialStart ?? null,
      trialEnd: input.trialEnd ?? null,
      currentPeriodStart: input.currentPeriodStart ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      canceledAt: input.canceledAt ?? null,
      endedAt: input.endedAt ?? null,
      gracePeriodEndsAt: input.gracePeriodEndsAt ?? null,
      metadata: new Map(Object.entries(input.metadata ?? {})),
    });
    return this.toSubscriptionSummary(subscription);
  }

  public async scheduleCancellation(
    workspaceId: Types.ObjectId,
  ): Promise<WorkspaceSubscriptionSummary> {
    const existing = await this.subscriptions.ensureFree(workspaceId);
    const updated = await this.subscriptions.update(existing._id, {
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
    });
    return this.toSubscriptionSummary(updated ?? existing);
  }

  public async reactivate(workspaceId: Types.ObjectId): Promise<WorkspaceSubscriptionSummary> {
    const existing = await this.subscriptions.ensureFree(workspaceId);
    const updated = await this.subscriptions.update(existing._id, {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      status: existing.status === 'canceled' ? 'active' : existing.status,
    });
    return this.toSubscriptionSummary(updated ?? existing);
  }

  public toSubscriptionSummary(subscription: SubscriptionDocument): WorkspaceSubscriptionSummary {
    return {
      id: subscription.id,
      workspaceId: subscription.workspaceId.toString(),
      provider: subscription.provider as 'local' | 'stripe',
      providerCustomerId: subscription.providerCustomerId ?? null,
      providerSubscriptionId: subscription.providerSubscriptionId ?? null,
      providerPriceId: subscription.providerPriceId ?? null,
      planCode: subscription.planCode as WorkspacePlan,
      billingInterval: subscription.billingInterval as BillingInterval,
      currency: subscription.currency,
      status: subscription.status as WorkspaceSubscriptionSummary['status'],
      trialStart: subscription.trialStart?.toISOString() ?? null,
      trialEnd: subscription.trialEnd?.toISOString() ?? null,
      currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt?.toISOString() ?? null,
      endedAt: subscription.endedAt?.toISOString() ?? null,
      gracePeriodEndsAt: subscription.gracePeriodEndsAt?.toISOString() ?? null,
      metadata: Object.fromEntries(subscription.metadata ?? new Map<string, string>()),
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }

  public billingEnabled(): boolean {
    return env.BILLING_ENABLED;
  }
}

export const subscriptionService = new SubscriptionService();
