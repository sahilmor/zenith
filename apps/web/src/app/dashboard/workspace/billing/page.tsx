'use client';

import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Card } from '@/components/ui/card';
import {
  useBillingPlans,
  useInvoices,
  useWorkspaceBilling,
} from '@/features/billing/api/billing-hooks';
import {
  CurrentBillingCard,
  PlanCards,
  UsageOverview,
} from '@/features/billing/components/billing-panel';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function WorkspaceBillingPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const billing = useWorkspaceBilling(workspaceId);
  const plans = useBillingPlans();
  const invoices = useInvoices(workspaceId);

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Workspace"
          title="Billing"
          description="Manage workspace subscription, usage limits, invoices, and plan access."
        />
        {billing.isLoading ? (
          <Card className="rounded-lg p-5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-4 h-32 w-full" />
          </Card>
        ) : billing.isError ? (
          <ErrorState title="Unable to load billing" description="Please refresh and try again." />
        ) : billing.data ? (
          <>
            <CurrentBillingCard billing={billing.data} />
            <UsageOverview billing={billing.data} />
            {plans.data ? (
              <PlanCards
                plans={plans.data}
                workspaceId={workspaceId}
                currentPlan={billing.data.subscription.planCode}
              />
            ) : null}
            <Card className="rounded-lg p-5">
              <h2 className="text-base font-semibold text-white">Invoices</h2>
              {invoices.isLoading ? (
                <Skeleton className="mt-4 h-24 w-full" />
              ) : invoices.data && invoices.data.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-2">Date</th>
                        <th className="py-2">Amount</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.data.map((invoice) => (
                        <tr key={invoice.id} className="border-t border-white/10">
                          <td className="py-3">{new Date(invoice.date).toLocaleDateString()}</td>
                          <td className="py-3">
                            {(invoice.amount / 100).toLocaleString(undefined, {
                              style: 'currency',
                              currency: invoice.currency.toUpperCase(),
                            })}
                          </td>
                          <td className="py-3 capitalize text-slate-300">{invoice.status}</td>
                          <td className="py-3">
                            {invoice.hostedInvoiceUrl ? (
                              <a
                                className="text-emerald-300 hover:text-emerald-200"
                                href={invoice.hostedInvoiceUrl}
                              >
                                Open
                              </a>
                            ) : (
                              <span className="text-slate-500">Unavailable</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={<FileText className="mx-auto size-8 text-emerald-300" />}
                  title="No invoices yet"
                  description="Invoices will appear after a paid billing cycle is processed."
                />
              )}
            </Card>
          </>
        ) : null}
      </div>
    </main>
  );
}
