'use client';

import {
  Building2,
  CircleDollarSign,
  HeartPulse,
  ListChecks,
  Target,
  UserRoundPlus,
} from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useConvertCrmLead,
  useCreateCrmAccount,
  useCreateCrmLead,
  useCrmAccounts,
  useCrmDashboard,
  useCrmDeals,
  useCrmLeads,
} from '../api/crm-hooks';

const money = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

export function CrmConsole({ workspaceId }: { readonly workspaceId: string | null }) {
  const dashboard = useCrmDashboard(workspaceId);
  const accounts = useCrmAccounts(workspaceId);
  const leads = useCrmLeads(workspaceId);
  const deals = useCrmDeals(workspaceId);
  const createAccount = useCreateCrmAccount(workspaceId);
  const createLead = useCreateCrmLead(workspaceId);
  const convertLead = useConvertCrmLead(workspaceId);

  if (!workspaceId) {
    return (
      <EmptyState
        icon={<Building2 className="mx-auto size-8 text-emerald-300" />}
        title="Select a workspace"
        description="CRM data appears after a workspace is selected."
      />
    );
  }

  if (dashboard.isLoading) {
    return (
      <section className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="rounded-lg p-5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-4 h-28 w-full" />
          </Card>
        ))}
      </section>
    );
  }

  const data = dashboard.data;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Accounts" value={String(data?.accountCount ?? 0)} icon={<Building2 />} />
        <MetricCard label="Leads" value={String(data?.leadCount ?? 0)} icon={<UserRoundPlus />} />
        <MetricCard label="Open deals" value={String(data?.openDealCount ?? 0)} icon={<Target />} />
        <MetricCard
          label="Pipeline"
          value={money(data?.pipelineValue ?? 0)}
          icon={<CircleDollarSign />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-lg p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--app-text)]">Accounts</h2>
              <p className="mt-1 text-xs text-[var(--app-muted)]">
                Organizations and customer health.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              loading={createAccount.isPending}
              onClick={() =>
                createAccount.mutate({
                  name: `Account ${new Date().toLocaleTimeString()}`,
                  status: 'prospect',
                  healthScore: 75,
                  lifecycleStage: 'sales',
                })
              }
            >
              Add account
            </Button>
          </div>
          <div className="space-y-3">
            {(accounts.data ?? []).slice(0, 6).map((account) => (
              <div key={account.id} className="rounded-md border border-[var(--app-border)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--app-text)]">{account.name}</p>
                  <span className="text-xs capitalize text-[var(--app-muted)]">
                    {account.healthStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${account.healthScore}%` }}
                  />
                </div>
              </div>
            ))}
            {accounts.data?.length === 0 ? (
              <p className="text-sm text-[var(--app-muted)]">No accounts yet.</p>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-lg p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--app-text)]">Leads</h2>
              <p className="mt-1 text-xs text-[var(--app-muted)]">
                Qualification queue and conversion.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              loading={createLead.isPending}
              onClick={() =>
                createLead.mutate({
                  companyName: `Lead ${new Date().toLocaleTimeString()}`,
                  contactName: 'New Buyer',
                  email: `lead-${Date.now()}@example.com`,
                  score: 70,
                  estimatedValue: 12000,
                })
              }
            >
              Add lead
            </Button>
          </div>
          <div className="space-y-3">
            {(leads.data ?? []).slice(0, 6).map((lead) => (
              <div key={lead.id} className="rounded-md border border-[var(--app-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--app-text)]">{lead.companyName}</p>
                    <p className="text-xs text-[var(--app-muted)]">
                      {lead.contactName} · score {lead.score}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={lead.status === 'converted'}
                    loading={convertLead.isPending}
                    onClick={() => convertLead.mutate(lead.id)}
                  >
                    Convert
                  </Button>
                </div>
              </div>
            ))}
            {leads.data?.length === 0 ? (
              <p className="text-sm text-[var(--app-muted)]">No leads yet.</p>
            ) : null}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-lg p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--app-text)]">Pipeline</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {(data?.dealsByStage ?? []).map((stage) => (
              <div key={stage.stage} className="rounded-md border border-[var(--app-border)] p-3">
                <p className="text-xs capitalize text-[var(--app-muted)]">
                  {stage.stage.replace('_', ' ')}
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--app-text)]">{stage.count}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {(deals.data ?? []).slice(0, 5).map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between rounded-md border border-[var(--app-border)] p-3 text-sm"
              >
                <span className="font-medium text-[var(--app-text)]">{deal.name}</span>
                <span className="text-[var(--app-muted)]">{money(deal.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-lg p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
            <ListChecks className="size-4 text-emerald-300" />
            Next actions
          </div>
          <div className="space-y-3">
            {(data?.nextActions ?? []).map((action) => (
              <div key={action.id} className="rounded-md border border-[var(--app-border)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--app-text)]">{action.title}</p>
                  <span className="text-xs capitalize text-emerald-300">{action.priority}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--app-muted)]">{action.reason}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-2 text-xs text-[var(--app-muted)]">
            <HeartPulse className="size-4 text-emerald-300" />
            {data?.atRiskAccountCount ?? 0} account health risks
          </div>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  readonly label: string;
  readonly value: string;
  readonly icon: React.ReactElement;
}) {
  return (
    <Card className="rounded-lg p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-[var(--app-muted)]">{label}</p>
        <span className="text-emerald-300 [&>svg]:size-4">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-[var(--app-text)]">{value}</p>
    </Card>
  );
}
