'use client';

import {
  Building2,
  CircleDollarSign,
  HeartPulse,
  ListChecks,
  Target,
  UserRoundPlus,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  type CreateCrmAccountInput,
  type CreateCrmLeadInput,
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

type AccountStatus = NonNullable<CreateCrmAccountInput['status']>;

const toOptionalNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const toTags = (value: string): string[] =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

const healthBarClass = (score: number): string => {
  if (score >= 80) return 'bg-emerald-400';
  if (score >= 60) return 'bg-amber-400';
  if (score >= 35) return 'bg-orange-400';
  return 'bg-red-400';
};

export function CrmConsole({ workspaceId }: { readonly workspaceId: string | null }) {
  const dashboard = useCrmDashboard(workspaceId);
  const accounts = useCrmAccounts(workspaceId);
  const leads = useCrmLeads(workspaceId);
  const deals = useCrmDeals(workspaceId);
  const createAccount = useCreateCrmAccount(workspaceId);
  const createLead = useCreateCrmLead(workspaceId);
  const convertLead = useConvertCrmLead(workspaceId);
  const [accountForm, setAccountForm] = useState({
    name: '',
    status: 'prospect' as AccountStatus,
    healthScore: '',
    lifecycleStage: '',
    domain: '',
    tags: '',
  });
  const [leadForm, setLeadForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    score: '',
    estimatedValue: '',
    source: '',
    tags: '',
  });

  const handleCreateAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = accountForm.name.trim();
    if (!name || createAccount.isPending) return;
    const healthScore = toOptionalNumber(accountForm.healthScore);

    createAccount.mutate(
      {
        name,
        status: accountForm.status,
        domain: accountForm.domain.trim() || null,
        lifecycleStage: accountForm.lifecycleStage.trim() || 'sales',
        tags: toTags(accountForm.tags),
        ...(healthScore === undefined ? {} : { healthScore }),
      },
      {
        onSuccess: () =>
          setAccountForm({
            name: '',
            status: 'prospect',
            healthScore: '',
            lifecycleStage: '',
            domain: '',
            tags: '',
          }),
      },
    );
  };

  const handleCreateLead = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const companyName = leadForm.companyName.trim();
    const contactName = leadForm.contactName.trim();
    const email = leadForm.email.trim();
    if (!companyName || !contactName || !email || createLead.isPending) return;
    const score = toOptionalNumber(leadForm.score);
    const estimatedValue = toOptionalNumber(leadForm.estimatedValue);

    const input: CreateCrmLeadInput = {
      companyName,
      contactName,
      email,
      source: leadForm.source.trim() || null,
      tags: toTags(leadForm.tags),
      ...(score === undefined ? {} : { score }),
      ...(estimatedValue === undefined ? {} : { estimatedValue }),
    };

    createLead.mutate(input, {
      onSuccess: () =>
        setLeadForm({
          companyName: '',
          contactName: '',
          email: '',
          score: '',
          estimatedValue: '',
          source: '',
          tags: '',
        }),
    });
  };

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
          </div>
          <form
            onSubmit={handleCreateAccount}
            className="mb-4 grid gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-3 sm:grid-cols-2"
          >
            <Input
              label="Account name"
              value={accountForm.name}
              onChange={(event) =>
                setAccountForm((form) => ({ ...form, name: event.target.value }))
              }
              placeholder="Acme Inc."
              required
            />
            <label className="block min-w-0 space-y-2">
              <span className="text-sm font-medium text-[var(--app-text)]">Status</span>
              <select
                value={accountForm.status}
                onChange={(event) =>
                  setAccountForm((form) => ({
                    ...form,
                    status: event.target.value as AccountStatus,
                  }))
                }
                className="h-11 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              >
                {(['prospect', 'customer', 'partner', 'former'] satisfies AccountStatus[]).map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ),
                )}
              </select>
            </label>
            <Input
              label="Health score"
              type="number"
              min={0}
              max={100}
              value={accountForm.healthScore}
              onChange={(event) =>
                setAccountForm((form) => ({ ...form, healthScore: event.target.value }))
              }
              placeholder="0-100"
            />
            <Input
              label="Lifecycle"
              value={accountForm.lifecycleStage}
              onChange={(event) =>
                setAccountForm((form) => ({ ...form, lifecycleStage: event.target.value }))
              }
              placeholder="sales, onboarding, renewal"
            />
            <Input
              label="Domain"
              value={accountForm.domain}
              onChange={(event) =>
                setAccountForm((form) => ({ ...form, domain: event.target.value }))
              }
              placeholder="acme.com"
            />
            <Input
              label="Tags"
              value={accountForm.tags}
              onChange={(event) =>
                setAccountForm((form) => ({ ...form, tags: event.target.value }))
              }
              placeholder="enterprise, priority"
            />
            <Button
              type="submit"
              size="sm"
              className="sm:col-span-2"
              loading={createAccount.isPending}
              disabled={!accountForm.name.trim() || createAccount.isPending}
            >
              Add account
            </Button>
          </form>
          <div className="space-y-3">
            {(accounts.data ?? []).slice(0, 6).map((account) => (
              <div key={account.id} className="rounded-md border border-[var(--app-border)] p-3">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-[var(--app-text)]">
                    {account.name}
                  </p>
                  <span className="text-xs capitalize text-[var(--app-muted)]">
                    {account.healthStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-panel-soft)]">
                  <div
                    className={`h-full rounded-full ${healthBarClass(account.healthScore)}`}
                    style={{ width: `${Math.max(0, Math.min(100, account.healthScore))}%` }}
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
          </div>
          <form
            onSubmit={handleCreateLead}
            className="mb-4 grid gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-3 sm:grid-cols-2"
          >
            <Input
              label="Company"
              value={leadForm.companyName}
              onChange={(event) =>
                setLeadForm((form) => ({ ...form, companyName: event.target.value }))
              }
              placeholder="Acme Inc."
              required
            />
            <Input
              label="Contact"
              value={leadForm.contactName}
              onChange={(event) =>
                setLeadForm((form) => ({ ...form, contactName: event.target.value }))
              }
              placeholder="Jane Cooper"
              required
            />
            <Input
              label="Email"
              type="email"
              value={leadForm.email}
              onChange={(event) => setLeadForm((form) => ({ ...form, email: event.target.value }))}
              placeholder="jane@acme.com"
              required
            />
            <Input
              label="Source"
              value={leadForm.source}
              onChange={(event) => setLeadForm((form) => ({ ...form, source: event.target.value }))}
              placeholder="Website, referral"
            />
            <Input
              label="Score"
              type="number"
              min={0}
              max={100}
              value={leadForm.score}
              onChange={(event) => setLeadForm((form) => ({ ...form, score: event.target.value }))}
              placeholder="0-100"
            />
            <Input
              label="Estimated value"
              type="number"
              min={0}
              value={leadForm.estimatedValue}
              onChange={(event) =>
                setLeadForm((form) => ({ ...form, estimatedValue: event.target.value }))
              }
              placeholder="12000"
            />
            <Input
              label="Tags"
              value={leadForm.tags}
              onChange={(event) => setLeadForm((form) => ({ ...form, tags: event.target.value }))}
              placeholder="inbound, smb"
            />
            <Button
              type="submit"
              size="sm"
              className="sm:self-end"
              loading={createLead.isPending}
              disabled={
                !leadForm.companyName.trim() ||
                !leadForm.contactName.trim() ||
                !leadForm.email.trim() ||
                createLead.isPending
              }
            >
              Add lead
            </Button>
          </form>
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
                    disabled={lead.status === 'converted' || convertLead.isPending}
                    loading={convertLead.isPending}
                    onClick={() => {
                      if (!convertLead.isPending) convertLead.mutate(lead.id);
                    }}
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
