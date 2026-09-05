'use client';

import {
  Activity,
  Building2,
  CircleDollarSign,
  HeartPulse,
  ListChecks,
  Target,
  UserRoundPlus,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  type CreateCrmAccountInput,
  type CreateCrmContactInput,
  type CreateCrmDealInput,
  type CreateCrmLeadInput,
  useConvertCrmLead,
  useCreateCrmAccount,
  useCreateCrmActivity,
  useCreateCrmContact,
  useCreateCrmDeal,
  useCreateCrmLead,
  useCrmAccounts,
  useCrmContacts,
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
type DealStage = NonNullable<CreateCrmDealInput['stage']>;
type ActivityType = 'note' | 'email' | 'call' | 'meeting' | 'task' | 'follow_up';

const dealStages: DealStage[] = [
  'qualification',
  'discovery',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
];

const activityTypes: ActivityType[] = ['note', 'email', 'call', 'meeting', 'task', 'follow_up'];

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
  const contacts = useCrmContacts(workspaceId);
  const leads = useCrmLeads(workspaceId);
  const deals = useCrmDeals(workspaceId);
  const createAccount = useCreateCrmAccount(workspaceId);
  const createContact = useCreateCrmContact(workspaceId);
  const createLead = useCreateCrmLead(workspaceId);
  const createDeal = useCreateCrmDeal(workspaceId);
  const createActivity = useCreateCrmActivity(workspaceId);
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
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    accountId: '',
  });
  const [dealForm, setDealForm] = useState({
    accountId: '',
    contactId: '',
    name: '',
    stage: 'qualification' as DealStage,
    value: '',
  });
  const [activityForm, setActivityForm] = useState({
    type: 'note' as ActivityType,
    title: '',
    body: '',
    accountId: '',
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

  const handleCreateContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstName = contactForm.firstName.trim();
    const email = contactForm.email.trim();
    if (!firstName || !email || createContact.isPending) return;

    const input: CreateCrmContactInput = {
      firstName,
      email,
      lastName: contactForm.lastName.trim() || null,
      phone: contactForm.phone.trim() || null,
      title: contactForm.title.trim() || null,
      accountId: contactForm.accountId || null,
    };

    createContact.mutate(input, {
      onSuccess: () =>
        setContactForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          title: '',
          accountId: '',
        }),
    });
  };

  const handleCreateDeal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = dealForm.name.trim();
    if (!name || !dealForm.accountId || createDeal.isPending) return;
    const value = toOptionalNumber(dealForm.value);

    const input: CreateCrmDealInput = {
      accountId: dealForm.accountId,
      contactId: dealForm.contactId || null,
      name,
      stage: dealForm.stage,
      ...(value === undefined ? {} : { value }),
    };

    createDeal.mutate(input, {
      onSuccess: () =>
        setDealForm({ accountId: '', contactId: '', name: '', stage: 'qualification', value: '' }),
    });
  };

  const handleLogActivity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = activityForm.title.trim();
    if (!title || !activityForm.accountId || createActivity.isPending) return;

    createActivity.mutate(
      {
        type: activityForm.type,
        title,
        body: activityForm.body.trim() || null,
        accountId: activityForm.accountId,
      },
      {
        onSuccess: () => setActivityForm({ type: 'note', title: '', body: '', accountId: '' }),
      },
    );
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

  if (dashboard.isError) {
    return (
      <ErrorState title="Unable to load CRM data" description="Please refresh and try again." />
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

      <section className="grid gap-4 lg:grid-cols-3">
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
            {accounts.isLoading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : accounts.isError ? (
              <ErrorState
                title="Unable to load accounts"
                description="Please refresh and try again."
              />
            ) : (
              <>
                {(accounts.data ?? []).slice(0, 6).map((account) => (
                  <div
                    key={account.id}
                    className="rounded-md border border-[var(--app-border)] p-3"
                  >
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
              </>
            )}
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
            {leads.isLoading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : leads.isError ? (
              <ErrorState
                title="Unable to load leads"
                description="Please refresh and try again."
              />
            ) : (
              <>
                {(leads.data ?? []).slice(0, 6).map((lead) => (
                  <div key={lead.id} className="rounded-md border border-[var(--app-border)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--app-text)]">
                          {lead.companyName}
                        </p>
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
              </>
            )}
          </div>
        </Card>

        <Card className="rounded-lg p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--app-text)]">Contacts</h2>
              <p className="mt-1 text-xs text-[var(--app-muted)]">People at your accounts.</p>
            </div>
          </div>
          <form
            onSubmit={handleCreateContact}
            className="mb-4 grid gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-3 sm:grid-cols-2"
          >
            <Input
              label="First name"
              value={contactForm.firstName}
              onChange={(event) =>
                setContactForm((form) => ({ ...form, firstName: event.target.value }))
              }
              placeholder="Jane"
              required
            />
            <Input
              label="Last name"
              value={contactForm.lastName}
              onChange={(event) =>
                setContactForm((form) => ({ ...form, lastName: event.target.value }))
              }
              placeholder="Cooper"
            />
            <Input
              label="Email"
              type="email"
              value={contactForm.email}
              onChange={(event) =>
                setContactForm((form) => ({ ...form, email: event.target.value }))
              }
              placeholder="jane@acme.com"
              required
            />
            <Input
              label="Title"
              value={contactForm.title}
              onChange={(event) =>
                setContactForm((form) => ({ ...form, title: event.target.value }))
              }
              placeholder="VP Engineering"
            />
            <label className="block min-w-0 space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-[var(--app-text)]">Account</span>
              <select
                value={contactForm.accountId}
                onChange={(event) =>
                  setContactForm((form) => ({ ...form, accountId: event.target.value }))
                }
                className="h-11 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              >
                <option value="">No account</option>
                {(accounts.data ?? []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="submit"
              size="sm"
              className="sm:col-span-2"
              loading={createContact.isPending}
              disabled={
                !contactForm.firstName.trim() ||
                !contactForm.email.trim() ||
                createContact.isPending
              }
            >
              Add contact
            </Button>
          </form>
          <div className="space-y-3">
            {contacts.isLoading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : contacts.isError ? (
              <ErrorState
                title="Unable to load contacts"
                description="Please refresh and try again."
              />
            ) : (
              <>
                {(contacts.data ?? []).slice(0, 6).map((contact) => (
                  <div
                    key={contact.id}
                    className="rounded-md border border-[var(--app-border)] p-3"
                  >
                    <p className="truncate text-sm font-medium text-[var(--app-text)]">
                      {contact.firstName} {contact.lastName ?? ''}
                    </p>
                    <p className="truncate text-xs text-[var(--app-muted)]">
                      {contact.title ? `${contact.title} · ` : ''}
                      {contact.email}
                    </p>
                  </div>
                ))}
                {contacts.data?.length === 0 ? (
                  <p className="text-sm text-[var(--app-muted)]">No contacts yet.</p>
                ) : null}
              </>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-lg p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--app-text)]">Pipeline</h2>
          <form
            onSubmit={handleCreateDeal}
            className="mb-4 grid gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-3 sm:grid-cols-2"
          >
            <label className="block min-w-0 space-y-2">
              <span className="text-sm font-medium text-[var(--app-text)]">Account</span>
              <select
                value={dealForm.accountId}
                onChange={(event) =>
                  setDealForm((form) => ({ ...form, accountId: event.target.value }))
                }
                className="h-11 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
                required
              >
                <option value="">Select account</option>
                {(accounts.data ?? []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Deal name"
              value={dealForm.name}
              onChange={(event) => setDealForm((form) => ({ ...form, name: event.target.value }))}
              placeholder="Acme renewal"
              required
            />
            <label className="block min-w-0 space-y-2">
              <span className="text-sm font-medium text-[var(--app-text)]">Stage</span>
              <select
                value={dealForm.stage}
                onChange={(event) =>
                  setDealForm((form) => ({ ...form, stage: event.target.value as DealStage }))
                }
                className="h-11 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              >
                {dealStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Value"
              type="number"
              min={0}
              value={dealForm.value}
              onChange={(event) => setDealForm((form) => ({ ...form, value: event.target.value }))}
              placeholder="25000"
            />
            <Button
              type="submit"
              size="sm"
              className="sm:col-span-2"
              loading={createDeal.isPending}
              disabled={!dealForm.name.trim() || !dealForm.accountId || createDeal.isPending}
            >
              Add deal
            </Button>
          </form>
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
            {deals.isLoading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : deals.isError ? (
              <ErrorState
                title="Unable to load deals"
                description="Please refresh and try again."
              />
            ) : (
              (deals.data ?? []).slice(0, 5).map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between rounded-md border border-[var(--app-border)] p-3 text-sm"
                >
                  <span className="font-medium text-[var(--app-text)]">{deal.name}</span>
                  <span className="text-[var(--app-muted)]">{money(deal.value)}</span>
                </div>
              ))
            )}
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

      <Card className="rounded-lg p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
          <Activity className="size-4 text-emerald-300" />
          Activity
        </div>
        <form
          onSubmit={handleLogActivity}
          className="mb-4 grid gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-3 sm:grid-cols-2"
        >
          <label className="block min-w-0 space-y-2">
            <span className="text-sm font-medium text-[var(--app-text)]">Type</span>
            <select
              value={activityForm.type}
              onChange={(event) =>
                setActivityForm((form) => ({ ...form, type: event.target.value as ActivityType }))
              }
              className="h-11 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            >
              {activityTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0 space-y-2">
            <span className="text-sm font-medium text-[var(--app-text)]">Related account</span>
            <select
              value={activityForm.accountId}
              onChange={(event) =>
                setActivityForm((form) => ({ ...form, accountId: event.target.value }))
              }
              className="h-11 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              required
            >
              <option value="">Select account</option>
              {(accounts.data ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Title"
            value={activityForm.title}
            onChange={(event) =>
              setActivityForm((form) => ({ ...form, title: event.target.value }))
            }
            placeholder="Discovery call with Acme"
            required
          />
          <Input
            label="Notes"
            value={activityForm.body}
            onChange={(event) => setActivityForm((form) => ({ ...form, body: event.target.value }))}
            placeholder="Optional details"
          />
          <Button
            type="submit"
            size="sm"
            className="sm:col-span-2"
            loading={createActivity.isPending}
            disabled={
              !activityForm.title.trim() || !activityForm.accountId || createActivity.isPending
            }
          >
            Log activity
          </Button>
        </form>
        <div className="space-y-3">
          {(data?.recentActivities ?? []).map((item) => (
            <div key={item.id} className="rounded-md border border-[var(--app-border)] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[var(--app-text)]">{item.title}</p>
                <span className="text-xs capitalize text-[var(--app-muted)]">
                  {item.type.replace('_', ' ')}
                </span>
              </div>
              {item.body ? (
                <p className="mt-1 text-xs text-[var(--app-muted)]">{item.body}</p>
              ) : null}
              <p className="mt-2 text-xs text-[var(--app-subtle)]">
                {new Date(item.occurredAt).toLocaleString()}
              </p>
            </div>
          ))}
          {(data?.recentActivities ?? []).length === 0 ? (
            <p className="text-sm text-[var(--app-muted)]">No activity logged yet.</p>
          ) : null}
        </div>
      </Card>
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
