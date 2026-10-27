import type { BillingFeature, BillingLimitKey, BillingPlanSummary, WorkspacePlan } from '@pm/types';
import {
  FeatureDefinitionModel,
  PlanEntitlementModel,
  PlanModel,
  type PlanDocument,
} from '../models/plan.model.js';

const now = new Date(0).toISOString();
const supportedFeatures = new Set<BillingFeature>([
  'kanban',
  'calendar',
  'table',
  'timeline',
  'advanced_search',
  'saved_views',
  'automations',
  'advanced_analytics',
  'audit_logs',
  'public_api',
  'webhooks',
  'pdf_export',
  'billing_portal',
  'documents',
]);

const allLimitKeys = [
  'members',
  'projects',
  'boards',
  'tasks',
  'storageBytes',
  'automations',
  'apiKeys',
  'webhooks',
  'reportExports',
  'documentSpaces',
  'documentPages',
] satisfies BillingLimitKey[];

const limits = (values: Partial<Record<BillingLimitKey, number | null>>) =>
  Object.fromEntries(allLimitKeys.map((key) => [key, values[key] ?? null])) as Record<
    BillingLimitKey,
    number | null
  >;

const freePlan: BillingPlanSummary = {
  id: 'plan_free',
  code: 'free',
  name: 'Free',
  description: 'For individuals and small teams validating their workflow.',
  active: true,
  displayOrder: 1,
  monthlyPrice: 0,
  annualPrice: 0,
  currency: 'usd',
  trialDays: 0,
  features: ['kanban', 'advanced_search'],
  limits: limits({
    members: 5,
    projects: 3,
    boards: 10,
    tasks: 500,
    storageBytes: 250 * 1024 * 1024,
    automations: 0,
    apiKeys: 0,
    webhooks: 0,
    reportExports: 5,
    documentSpaces: 1,
    documentPages: 25,
  }),
  metadata: {},
  createdAt: now,
  updatedAt: now,
};

const defaultPlanCatalog: BillingPlanSummary[] = [
  freePlan,
  {
    id: 'plan_pro',
    code: 'pro',
    name: 'Pro',
    description: 'For growing teams that need advanced task views and automations.',
    active: true,
    displayOrder: 2,
    monthlyPrice: 1200,
    annualPrice: 12000,
    currency: 'usd',
    trialDays: 14,
    features: [
      'kanban',
      'calendar',
      'table',
      'timeline',
      'advanced_search',
      'saved_views',
      'automations',
      'pdf_export',
      'documents',
    ],
    limits: limits({
      members: 25,
      projects: 25,
      boards: 100,
      tasks: 10000,
      storageBytes: 10 * 1024 * 1024 * 1024,
      automations: 25,
      apiKeys: 0,
      webhooks: 0,
      reportExports: 100,
      documentSpaces: 10,
      documentPages: 1000,
    }),
    metadata: {},
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'plan_business',
    code: 'business',
    name: 'Business',
    description: 'For organizations that need reporting, public API access, and governance.',
    active: true,
    displayOrder: 3,
    monthlyPrice: 2900,
    annualPrice: 29000,
    currency: 'usd',
    trialDays: 14,
    features: [
      'kanban',
      'calendar',
      'table',
      'timeline',
      'advanced_search',
      'saved_views',
      'automations',
      'advanced_analytics',
      'audit_logs',
      'public_api',
      'webhooks',
      'pdf_export',
      'billing_portal',
      'documents',
    ],
    limits: limits({
      members: 100,
      projects: 250,
      boards: 1000,
      tasks: 100000,
      storageBytes: 100 * 1024 * 1024 * 1024,
      automations: 250,
      apiKeys: 25,
      webhooks: 25,
      reportExports: 1000,
      documentSpaces: 100,
      documentPages: 10000,
    }),
    metadata: {},
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'plan_enterprise',
    code: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations that need custom limits and procurement support.',
    active: true,
    displayOrder: 4,
    monthlyPrice: null,
    annualPrice: null,
    currency: 'usd',
    trialDays: 0,
    features: [
      'kanban',
      'calendar',
      'table',
      'timeline',
      'advanced_search',
      'saved_views',
      'automations',
      'advanced_analytics',
      'audit_logs',
      'public_api',
      'webhooks',
      'pdf_export',
      'billing_portal',
      'documents',
    ],
    limits: limits({}),
    metadata: { contactSales: 'true' },
    createdAt: now,
    updatedAt: now,
  },
];

export class PricingService {
  private async ensureCatalog(): Promise<void> {
    if (await PlanModel.exists({})) return;
    await this.seedCatalog();
  }

  private async seedCatalog(): Promise<void> {
    for (const plan of defaultPlanCatalog) {
      const document = await PlanModel.findOneAndUpdate(
        { code: plan.code },
        {
          name: plan.name,
          description: plan.description,
          active: plan.active,
          recommended: plan.code === 'pro',
          displayOrder: plan.displayOrder,
          prices: new Map(
            [
              ['monthly', plan.monthlyPrice],
              ['annual', plan.annualPrice],
            ].filter((entry): entry is [string, number] => entry[1] !== null),
          ),
          currency: plan.currency,
          trialDays: plan.trialDays,
          metadata: new Map(Object.entries(plan.metadata)),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      for (const [key, limit] of Object.entries(plan.limits)) {
        await FeatureDefinitionModel.updateOne(
          { key },
          { $setOnInsert: { key, name: key, kind: 'limit' } },
          { upsert: true },
        );
        await PlanEntitlementModel.updateOne(
          { planId: document._id, featureKey: key },
          { $setOnInsert: { enabled: true, limit } },
          { upsert: true },
        );
      }
      for (const key of plan.features) {
        await FeatureDefinitionModel.updateOne(
          { key },
          { $setOnInsert: { key, name: key, kind: 'boolean' } },
          { upsert: true },
        );
        await PlanEntitlementModel.updateOne(
          { planId: document._id, featureKey: key },
          { $set: { enabled: true, 'metadata.feature': 'true' }, $setOnInsert: { limit: null } },
          { upsert: true },
        );
      }
    }
  }

  public async listPlans(): Promise<BillingPlanSummary[]> {
    await this.ensureCatalog();
    const plans = await PlanModel.find({ active: true }).sort({ displayOrder: 1 }).exec();
    return Promise.all(plans.map((plan) => this.toSummary(plan)));
  }

  public async getPlan(planCode: WorkspacePlan): Promise<BillingPlanSummary> {
    await this.ensureCatalog();
    const plan =
      (await PlanModel.findOne({ code: planCode, active: true }).exec()) ??
      (await PlanModel.findOne({ code: 'free', active: true }).exec());
    if (!plan) throw new Error('The billing catalog has no active free plan');
    return this.toSummary(plan);
  }

  public async hasFeature(planCode: WorkspacePlan, feature: BillingFeature): Promise<boolean> {
    const plan = await this.getPlan(planCode);
    return plan.features.includes(feature);
  }

  private async toSummary(plan: PlanDocument): Promise<BillingPlanSummary> {
    const entitlements = await PlanEntitlementModel.find({ planId: plan._id }).lean().exec();
    const planLimits = limits({});
    const features: BillingFeature[] = [];
    for (const item of entitlements) {
      if (
        item.limit !== null &&
        item.limit !== undefined &&
        Object.prototype.hasOwnProperty.call(planLimits, item.featureKey)
      ) {
        planLimits[item.featureKey as BillingLimitKey] = item.limit;
      }
      const metadata = item.metadata as Map<string, string> | Record<string, string> | undefined;
      const isFeature =
        metadata instanceof Map ? metadata.get('feature') === 'true' : metadata?.feature === 'true';
      if (item.enabled && isFeature && supportedFeatures.has(item.featureKey as BillingFeature)) {
        features.push(item.featureKey as BillingFeature);
      }
    }
    return {
      id: plan.id,
      code: plan.code as WorkspacePlan,
      name: plan.name,
      description: plan.description,
      active: plan.active,
      displayOrder: plan.displayOrder,
      monthlyPrice: plan.prices?.get('monthly') ?? null,
      annualPrice: plan.prices?.get('annual') ?? null,
      currency: plan.currency,
      trialDays: plan.trialDays,
      features,
      limits: planLimits,
      metadata: Object.fromEntries(plan.metadata ?? new Map()),
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }
}

export const pricingService = new PricingService();
