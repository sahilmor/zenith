'use client';

import Link from 'next/link';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBillingPlans } from '@/features/billing/api/billing-hooks';
import { PlanCards } from '@/features/billing/components/billing-panel';

export default function PricingPage() {
  const plans = useBillingPlans();
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pricing</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Plans that scale with work
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Choose a workspace plan. Paid checkout is completed through the configured billing
              provider and confirmed through server-side webhooks.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/dashboard/workspace/billing">Workspace billing</Link>
          </Button>
        </div>
        {plans.isLoading ? (
          <Card className="rounded-lg p-5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-4 h-40 w-full" />
          </Card>
        ) : plans.isError ? (
          <ErrorState title="Unable to load plans" description="Please refresh and try again." />
        ) : plans.data ? (
          <PlanCards plans={plans.data} />
        ) : null}
      </div>
    </main>
  );
}
