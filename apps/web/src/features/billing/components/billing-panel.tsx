'use client';

import type { BillingPlanSummary, WorkspaceBillingSummary, WorkspacePlan } from '@pm/types';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useBillingPortal,
  useCancelSubscription,
  useCreateCheckout,
  useReactivateSubscription,
} from '../api/billing-hooks';

const currency = (amount: number | null, code: string): string =>
  amount === null
    ? 'Custom'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: code.toUpperCase() }).format(
        amount / 100,
      );

export function PlanCards({
  plans,
  workspaceId,
  currentPlan,
}: Readonly<{
  plans: BillingPlanSummary[];
  workspaceId?: string | null;
  currentPlan?: WorkspacePlan;
}>) {
  const checkout = useCreateCheckout(workspaceId ?? null);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((plan) => {
        const paidPlan = plan.code === 'pro' || plan.code === 'business';
        const checkoutPlan = paidPlan ? plan.code : null;
        return (
          <Card key={plan.code} className="flex rounded-lg p-5">
            <div className="flex min-h-full flex-1 flex-col">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
                  {currentPlan === plan.code ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                      Current
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{plan.description}</p>
                <p className="mt-4 text-2xl font-semibold text-white">
                  {currency(plan.monthlyPrice, plan.currency)}
                </p>
                <p className="text-xs text-slate-500">per workspace / month</p>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-300">
                {plan.features.slice(0, 6).map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 text-emerald-300" />
                    {feature.replace(/_/g, ' ')}
                  </li>
                ))}
              </ul>
              {checkoutPlan && workspaceId ? (
                <Button
                  className="mt-5 w-full"
                  variant={currentPlan === plan.code ? 'secondary' : 'primary'}
                  loading={checkout.isPending}
                  onClick={() =>
                    checkout.mutate({ planCode: checkoutPlan, billingInterval: 'monthly' })
                  }
                >
                  <CreditCard className="size-4" />
                  {currentPlan === plan.code ? 'Manage plan' : 'Upgrade'}
                </Button>
              ) : (
                <Button className="mt-5 w-full" variant="secondary" disabled>
                  {plan.code === 'enterprise' ? 'Contact sales' : 'Included'}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function CurrentBillingCard({ billing }: Readonly<{ billing: WorkspaceBillingSummary }>) {
  const portal = useBillingPortal(billing.workspaceId);
  const cancel = useCancelSubscription(billing.workspaceId);
  const reactivate = useReactivateSubscription(billing.workspaceId);
  const subscription = billing.subscription;
  const warning = subscription.status === 'past_due' || subscription.status === 'unpaid';
  return (
    <Card className="rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Current plan</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">{billing.plan.name}</h2>
          <p className="mt-2 text-sm text-slate-400">
            {subscription.status.replace('_', ' ')} · {subscription.billingInterval}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" loading={portal.isPending} onClick={() => portal.mutate()}>
            <ExternalLink className="size-4" />
            Billing portal
          </Button>
          {subscription.cancelAtPeriodEnd ? (
            <Button
              variant="secondary"
              loading={reactivate.isPending}
              onClick={() => reactivate.mutate()}
            >
              <RotateCcw className="size-4" />
              Reactivate
            </Button>
          ) : (
            <Button
              variant="destructive"
              loading={cancel.isPending}
              onClick={() => cancel.mutate()}
              disabled={billing.plan.code === 'free'}
            >
              <XCircle className="size-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>
      {warning ? (
        <div className="mt-5 flex gap-3 rounded-lg border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="size-4 shrink-0" />
          Payment needs attention. Premium writes may be restricted after the grace period.
        </div>
      ) : null}
    </Card>
  );
}

export function UsageOverview({ billing }: Readonly<{ billing: WorkspaceBillingSummary }>) {
  const usage = billing.entitlements.usage;
  const limits = billing.entitlements.limits;
  return (
    <Card className="rounded-lg p-5">
      <h2 className="text-base font-semibold text-white">Usage</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {Object.entries(limits).map(([key, limit]) => {
          const current = usage[key as keyof typeof usage] ?? 0;
          const percent = limit ? Math.min(100, Math.round((current / limit) * 100)) : 0;
          return (
            <div key={key}>
              <div className="flex justify-between text-sm">
                <span className="capitalize text-slate-300">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="text-slate-500">
                  {current.toLocaleString()} /{' '}
                  {limit === null ? 'Unlimited' : limit.toLocaleString()}
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
                aria-label={`${key} usage ${percent}%`}
              >
                <div
                  className="h-full rounded-full bg-emerald-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
