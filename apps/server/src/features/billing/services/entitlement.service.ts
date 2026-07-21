import type {
  BillingFeature,
  BillingLimitKey,
  BillingUsage,
  WorkspaceEntitlementSummary,
  WorkspacePlan,
} from '@pm/types';
import type { Types } from 'mongoose';
import { AppError } from '../../../utils/app-error.js';
import { SubscriptionRepository } from '../repositories/billing.repository.js';
import { pricingService } from './pricing.service.js';
import { usageService } from './usage.service.js';
import { subscriptionService } from './subscription.service.js';

export class BillingLimitError extends AppError {
  public constructor(input: {
    feature: BillingLimitKey | BillingFeature;
    currentUsage?: number;
    limit?: number | null;
    plan: WorkspacePlan;
  }) {
    const label = String(input.feature)
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase();
    super(
      `Plan limit reached: You have reached the maximum number of ${label} allowed on your current plan.`,
      403,
      [
        {
          code: 'PLAN_LIMIT_REACHED',
          feature: input.feature,
          currentUsage: input.currentUsage ?? null,
          limit: input.limit ?? null,
          plan: input.plan,
          upgradeRequired: true,
        },
      ],
    );
  }
}

export class EntitlementService {
  public constructor(private readonly subscriptions = new SubscriptionRepository()) {}

  public async getWorkspaceEntitlements(
    workspaceId: Types.ObjectId,
  ): Promise<WorkspaceEntitlementSummary> {
    const subscription = await this.subscriptions.ensureFree(workspaceId);
    const plan = await pricingService.getPlan(subscription.planCode as WorkspacePlan);
    const usage = await usageService.getWorkspaceUsage(workspaceId);
    const features = Object.fromEntries(
      plan.features.map((feature) => [feature, true]),
    ) as WorkspaceEntitlementSummary['features'];
    const exceededLimits = Object.entries(plan.limits)
      .filter(([key, limit]) => typeof limit === 'number' && usage[key as BillingLimitKey] > limit)
      .map(([key]) => key as BillingLimitKey);
    return {
      plan,
      subscription: subscriptionService.toSubscriptionSummary(subscription),
      features,
      limits: plan.limits,
      usage,
      exceededLimits,
    };
  }

  public async hasFeature(workspaceId: Types.ObjectId, feature: BillingFeature): Promise<boolean> {
    const subscription = await this.subscriptions.ensureFree(workspaceId);
    return pricingService.hasFeature(subscription.planCode as WorkspacePlan, feature);
  }

  public async requireFeature(workspaceId: Types.ObjectId, feature: BillingFeature): Promise<void> {
    const subscription = await this.subscriptions.ensureFree(workspaceId);
    if (!(await pricingService.hasFeature(subscription.planCode as WorkspacePlan, feature))) {
      throw new BillingLimitError({ feature, plan: subscription.planCode as WorkspacePlan });
    }
  }

  public async requireWithinLimit(
    workspaceId: Types.ObjectId,
    key: BillingLimitKey,
    increment = 1,
  ): Promise<void> {
    const subscription = await this.subscriptions.ensureFree(workspaceId);
    const plan = await pricingService.getPlan(subscription.planCode as WorkspacePlan);
    const limit = plan.limits[key];
    if (limit === null) return;
    const usage: BillingUsage = await usageService.getWorkspaceUsage(workspaceId);
    const nextUsage = usage[key] + increment;
    if (nextUsage > limit) {
      throw new BillingLimitError({
        feature: key,
        currentUsage: usage[key],
        limit,
        plan: plan.code,
      });
    }
  }
}

export const entitlementService = new EntitlementService();
