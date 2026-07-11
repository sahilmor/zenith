'use client';

import type {
  GoalSummary,
  InitiativeSummary,
  KeyResultSummary,
  PortfolioSummary,
  StrategicCheckInSummary,
  StrategicDashboardSummary,
  StrategicHealth,
  StrategicStatus,
} from '@pm/types';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Flag, Target } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useArchiveGoal,
  useCreateCheckIn,
  useCreateGoal,
  useCreateInitiative,
  useCreateKeyResult,
  useCreatePortfolio,
  useRestoreGoal,
} from '@/features/strategic/api/strategic-hooks';
import { cn } from '@/lib/utils';

interface ResourceQuery<TData> {
  readonly data?: TData | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
}

const healthLabels: Record<StrategicHealth, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  off_track: 'Off track',
  no_status: 'No status',
};

const statusLabels: Record<StrategicStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  at_risk: 'At risk',
  achieved: 'Achieved',
  missed: 'Missed',
  canceled: 'Canceled',
};

function toDateLabel(value: string | null) {
  if (!value) {
    return 'No target date';
  }
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value),
  );
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function ProgressBar({ value }: { readonly value: number }) {
  const progress = clampProgress(value);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function HealthBadge({ health }: { readonly health: StrategicHealth }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        health === 'on_track' && 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
        health === 'at_risk' && 'border-amber-400/30 bg-amber-400/10 text-amber-200',
        health === 'off_track' && 'border-red-400/30 bg-red-400/10 text-red-200',
        health === 'no_status' && 'border-slate-400/20 bg-white/[0.04] text-slate-300',
      )}
    >
      {healthLabels[health]}
    </span>
  );
}

export function StatusBadge({ status }: { readonly status: StrategicStatus }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-300">
      {statusLabels[status]}
    </span>
  );
}

function parseNumber(value: FormDataEntryValue | null, fallback: number) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function DescriptionField({
  name,
  label,
  placeholder,
}: {
  readonly name: string;
  readonly label: string;
  readonly placeholder: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <textarea
        name={name}
        rows={3}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30 focus:ring-2 focus:ring-white/10"
      />
    </label>
  );
}

export function StrategicDashboardCards({
  dashboard,
}: {
  readonly dashboard: ResourceQuery<StrategicDashboardSummary>;
}) {
  if (dashboard.isLoading) {
    return (
      <section className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="rounded-lg p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-16" />
          </Card>
        ))}
      </section>
    );
  }
  if (!dashboard.data) {
    return null;
  }
  const cards = [
    { label: 'Goal progress', value: `${clampProgress(dashboard.data.averageGoalProgress)}%` },
    {
      label: 'Key result progress',
      value: `${clampProgress(dashboard.data.keyResultAverageProgress)}%`,
    },
    { label: 'At-risk goals', value: String(dashboard.data.atRiskGoals.length) },
    { label: 'Strategic risks', value: String(dashboard.data.strategicRisks.length) },
  ];
  return (
    <section className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="rounded-lg p-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            {card.label}
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
        </Card>
      ))}
    </section>
  );
}

export function CreateGoalPanel({ workspaceId }: { readonly workspaceId: string | null }) {
  const createGoal = useCreateGoal(workspaceId);
  const [title, setTitle] = useState('');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createGoal.mutate(
      {
        title: title.trim(),
        description: String(form.get('description') ?? '').trim() || null,
        type: 'objective',
        health: 'no_status',
        status: 'active',
        progressMode: 'automatic',
        confidence: parseNumber(form.get('confidence'), 70),
      },
      {
        onSuccess: () => {
          setTitle('');
          event.currentTarget.reset();
        },
      },
    );
  }

  return (
    <Card className="rounded-lg p-5">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <h2 className="font-semibold text-white">Create goal</h2>
          <p className="mt-1 text-sm text-slate-400">
            Define the outcome, then connect key results and supporting work.
          </p>
        </div>
        <Input
          name="title"
          label="Goal title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Increase activation for enterprise teams"
          required
        />
        <DescriptionField
          name="description"
          label="Description"
          placeholder="Add context, scope, or strategic intent."
        />
        <Input
          name="confidence"
          label="Confidence"
          type="number"
          min={0}
          max={100}
          defaultValue={70}
        />
        <Button type="submit" disabled={!workspaceId || title.trim().length === 0}>
          <Target className="size-4" />
          Create goal
        </Button>
      </form>
    </Card>
  );
}

export function GoalsList({ goals }: { readonly goals: ResourceQuery<GoalSummary[]> }) {
  if (goals.isLoading) {
    return (
      <section className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="rounded-lg p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-6 h-2 w-full rounded-full" />
          </Card>
        ))}
      </section>
    );
  }
  if (goals.isError) {
    return <ErrorState title="Unable to load goals" description="Please refresh and try again." />;
  }
  const items = goals.data ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Target className="mx-auto size-8 text-emerald-300" />}
        title="No goals yet"
        description="Create a goal to start connecting strategy to execution."
      />
    );
  }
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {items.map((goal) => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </section>
  );
}

function GoalCard({ goal }: { readonly goal: GoalSummary }) {
  return (
    <Card className="rounded-lg p-5 transition hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={goal.status} />
            <HealthBadge health={goal.health} />
          </div>
          <Link href={`/dashboard/goals/${goal.id}`} className="mt-4 block">
            <h2 className="line-clamp-2 text-lg font-semibold text-white">{goal.title}</h2>
          </Link>
        </div>
        <ArrowRight className="mt-1 size-4 shrink-0 text-slate-500" />
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-400">
        {goal.description ?? 'No description yet.'}
      </p>
      <div className="mt-5">
        <ProgressBar value={goal.calculatedProgress} />
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
        <span>{toDateLabel(goal.targetDate)}</span>
        <span>{goal.confidence}% confidence</span>
      </div>
    </Card>
  );
}

export function GoalDetailsPanel({
  goal,
  keyResults,
  checkIns,
}: {
  readonly goal: GoalSummary;
  readonly keyResults: ResourceQuery<KeyResultSummary[]>;
  readonly checkIns: ResourceQuery<StrategicCheckInSummary[]>;
}) {
  const archiveGoal = useArchiveGoal();
  const restoreGoal = useRestoreGoal();
  return (
    <div className="space-y-6">
      <Card className="rounded-lg p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={goal.status} />
              <HealthBadge health={goal.health} />
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-400">
              {goal.description ?? 'No description has been added.'}
            </p>
          </div>
          {goal.archived ? (
            <Button variant="secondary" onClick={() => restoreGoal.mutate(goal)}>
              Restore
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => archiveGoal.mutate(goal)}>
              Archive
            </Button>
          )}
        </div>
        <div className="mt-6">
          <ProgressBar value={goal.calculatedProgress} />
        </div>
      </Card>
      <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <CreateKeyResultPanel goalId={goal.id} />
          <KeyResultList keyResults={keyResults} />
        </div>
        <div className="space-y-4">
          <CreateCheckInPanel goalId={goal.id} />
          <CheckInList checkIns={checkIns} />
        </div>
      </section>
    </div>
  );
}

function CreateKeyResultPanel({ goalId }: { readonly goalId: string }) {
  const createKeyResult = useCreateKeyResult(goalId);
  const [title, setTitle] = useState('');
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createKeyResult.mutate(
      {
        title: title.trim(),
        measurementType: 'percentage',
        startValue: parseNumber(form.get('startValue'), 0),
        currentValue: parseNumber(form.get('currentValue'), 0),
        targetValue: parseNumber(form.get('targetValue'), 100),
      },
      {
        onSuccess: () => {
          setTitle('');
          event.currentTarget.reset();
        },
      },
    );
  }
  return (
    <Card className="rounded-lg p-5">
      <form className="space-y-4" onSubmit={onSubmit}>
        <h2 className="font-semibold text-white">Add key result</h2>
        <Input
          name="title"
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Improve activation from 36% to 52%"
          required
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input name="startValue" label="Start" type="number" defaultValue={0} />
          <Input name="currentValue" label="Current" type="number" defaultValue={0} />
          <Input name="targetValue" label="Target" type="number" defaultValue={100} />
        </div>
        <Button type="submit" disabled={title.trim().length === 0}>
          Add key result
        </Button>
      </form>
    </Card>
  );
}

function KeyResultList({ keyResults }: { readonly keyResults: ResourceQuery<KeyResultSummary[]> }) {
  if (keyResults.isLoading) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }
  if (keyResults.isError) {
    return <ErrorState title="Unable to load key results" description="Please refresh." />;
  }
  const items = keyResults.data ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="mx-auto size-8 text-emerald-300" />}
        title="No key results"
        description="Add measurable outcomes for this goal."
      />
    );
  }
  return (
    <div className="space-y-3">
      {items.map((keyResult) => (
        <Card key={keyResult.id} className="rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-medium text-white">{keyResult.title}</h3>
            <HealthBadge health={keyResult.health} />
          </div>
          <div className="mt-4">
            <ProgressBar value={keyResult.progress} />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {keyResult.currentValue} of {keyResult.targetValue}
          </p>
        </Card>
      ))}
    </div>
  );
}

function CreateCheckInPanel({ goalId }: { readonly goalId: string }) {
  const createCheckIn = useCreateCheckIn(goalId);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createCheckIn.mutate(
      {
        progress: parseNumber(form.get('progress'), 0),
        health: String(form.get('health') ?? 'no_status') as StrategicHealth,
        confidence: parseNumber(form.get('confidence'), 70),
        summary: String(form.get('summary') ?? '').trim(),
        blockers: String(form.get('blockers') ?? '').trim() || null,
        nextSteps: String(form.get('nextSteps') ?? '').trim() || null,
      },
      { onSuccess: () => event.currentTarget.reset() },
    );
  }
  return (
    <Card className="rounded-lg p-5">
      <form className="space-y-4" onSubmit={onSubmit}>
        <h2 className="font-semibold text-white">Post check-in</h2>
        <DescriptionField name="summary" label="Summary" placeholder="What changed this week?" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="progress" label="Progress" type="number" min={0} max={100} required />
          <Input name="confidence" label="Confidence" type="number" min={0} max={100} required />
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Health</span>
          <select
            name="health"
            defaultValue="no_status"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
          >
            <option value="no_status">No status</option>
            <option value="on_track">On track</option>
            <option value="at_risk">At risk</option>
            <option value="off_track">Off track</option>
          </select>
        </label>
        <DescriptionField name="blockers" label="Blockers" placeholder="Risks or blockers." />
        <DescriptionField name="nextSteps" label="Next steps" placeholder="What happens next?" />
        <Button type="submit">Post check-in</Button>
      </form>
    </Card>
  );
}

function CheckInList({
  checkIns,
}: {
  readonly checkIns: ResourceQuery<StrategicCheckInSummary[]>;
}) {
  if (checkIns.isLoading) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }
  const items = checkIns.data ?? [];
  return (
    <Card className="rounded-lg p-5">
      <h2 className="font-semibold text-white">Check-ins</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No check-ins have been posted yet.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((checkIn) => (
            <article key={checkIn.id} className="border-t border-white/10 pt-4 first:border-t-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <HealthBadge health={checkIn.health} />
                <span className="text-xs text-slate-500">{toDateLabel(checkIn.createdAt)}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{checkIn.summary}</p>
              {checkIn.blockers ? (
                <p className="mt-2 text-xs text-amber-200">Blockers: {checkIn.blockers}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}

export function CreateInitiativePanel({ workspaceId }: { readonly workspaceId: string | null }) {
  const createInitiative = useCreateInitiative(workspaceId);
  return (
    <StrategicCreatePanel
      title="Create initiative"
      description="Group projects and goals into a coordinated strategic bet."
      nameLabel="Initiative name"
      placeholder="Enterprise onboarding redesign"
      submitLabel="Create initiative"
      disabled={!workspaceId}
      onSubmit={(name, description) =>
        createInitiative.mutate({ name, description, health: 'no_status', status: 'active' })
      }
    />
  );
}

export function CreatePortfolioPanel({ workspaceId }: { readonly workspaceId: string | null }) {
  const createPortfolio = useCreatePortfolio(workspaceId);
  return (
    <StrategicCreatePanel
      title="Create portfolio"
      description="Track a collection of initiatives and projects across teams."
      nameLabel="Portfolio name"
      placeholder="FY26 Growth"
      submitLabel="Create portfolio"
      disabled={!workspaceId}
      onSubmit={(name, description) =>
        createPortfolio.mutate({ name, description, health: 'no_status', status: 'active' })
      }
    />
  );
}

function StrategicCreatePanel({
  title,
  description,
  nameLabel,
  placeholder,
  submitLabel,
  disabled,
  onSubmit,
}: {
  readonly title: string;
  readonly description: string;
  readonly nameLabel: string;
  readonly placeholder: string;
  readonly submitLabel: string;
  readonly disabled: boolean;
  readonly onSubmit: (name: string, description: string | null) => void;
}) {
  const [name, setName] = useState('');
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit(name.trim(), String(form.get('description') ?? '').trim() || null);
    setName('');
    event.currentTarget.reset();
  }
  return (
    <Card className="rounded-lg p-5">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <Input
          name="name"
          label={nameLabel}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={placeholder}
          required
        />
        <DescriptionField
          name="description"
          label="Description"
          placeholder="Add the context this strategy needs."
        />
        <Button type="submit" disabled={disabled || name.trim().length === 0}>
          <Flag className="size-4" />
          {submitLabel}
        </Button>
      </form>
    </Card>
  );
}

export function InitiativeList({
  initiatives,
}: {
  readonly initiatives: ResourceQuery<InitiativeSummary[]>;
}) {
  if (initiatives.isLoading) {
    return <Skeleton className="h-56 w-full rounded-lg" />;
  }
  if (initiatives.isError) {
    return <ErrorState title="Unable to load initiatives" description="Please refresh." />;
  }
  const items = initiatives.data ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="mx-auto size-8 text-emerald-300" />}
        title="No initiatives yet"
        description="Create an initiative to connect execution across teams."
      />
    );
  }
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {items.map((initiative) => (
        <StrategyCard
          key={initiative.id}
          title={initiative.name}
          description={initiative.description}
          health={initiative.health}
          status={initiative.status}
          progress={initiative.progress}
          meta={`${initiative.priority} priority`}
        />
      ))}
    </section>
  );
}

export function PortfolioList({
  portfolios,
}: {
  readonly portfolios: ResourceQuery<PortfolioSummary[]>;
}) {
  if (portfolios.isLoading) {
    return <Skeleton className="h-56 w-full rounded-lg" />;
  }
  if (portfolios.isError) {
    return <ErrorState title="Unable to load portfolios" description="Please refresh." />;
  }
  const items = portfolios.data ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Flag className="mx-auto size-8 text-emerald-300" />}
        title="No portfolios yet"
        description="Create a portfolio for cross-project planning."
      />
    );
  }
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {items.map((portfolio) => (
        <StrategyCard
          key={portfolio.id}
          title={portfolio.name}
          description={portfolio.description}
          health={portfolio.health}
          status={portfolio.status}
          progress={portfolio.progress}
          meta="Portfolio"
        />
      ))}
    </section>
  );
}

function StrategyCard({
  title,
  description,
  health,
  status,
  progress,
  meta,
}: {
  readonly title: string;
  readonly description: string | null;
  readonly health: StrategicHealth;
  readonly status: StrategicStatus;
  readonly progress: number;
  readonly meta: string;
}) {
  return (
    <Card className="rounded-lg p-5">
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={status} />
        <HealthBadge health={health} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-400">
        {description ?? 'No description yet.'}
      </p>
      <div className="mt-5">
        <ProgressBar value={progress} />
      </div>
      <p className="mt-4 text-xs capitalize text-slate-500">{meta}</p>
    </Card>
  );
}

export function RoadmapPanel({
  goals,
  initiatives,
  portfolios,
}: {
  readonly goals: ResourceQuery<GoalSummary[]>;
  readonly initiatives: ResourceQuery<InitiativeSummary[]>;
  readonly portfolios: ResourceQuery<PortfolioSummary[]>;
}) {
  const items = useMemo(() => {
    const goalItems =
      goals.data?.map((goal) => ({
        id: goal.id,
        type: 'Goal',
        title: goal.title,
        progress: goal.calculatedProgress,
        health: goal.health,
        targetDate: goal.targetDate,
      })) ?? [];
    const initiativeItems =
      initiatives.data?.map((initiative) => ({
        id: initiative.id,
        type: 'Initiative',
        title: initiative.name,
        progress: initiative.progress,
        health: initiative.health,
        targetDate: initiative.targetDate,
      })) ?? [];
    const portfolioItems =
      portfolios.data?.map((portfolio) => ({
        id: portfolio.id,
        type: 'Portfolio',
        title: portfolio.name,
        progress: portfolio.progress,
        health: portfolio.health,
        targetDate: null,
      })) ?? [];
    return [...goalItems, ...initiativeItems, ...portfolioItems].sort((a, b) =>
      toDateLabel(a.targetDate).localeCompare(toDateLabel(b.targetDate)),
    );
  }, [goals.data, initiatives.data, portfolios.data]);

  if (goals.isLoading || initiatives.isLoading || portfolios.isLoading) {
    return <Skeleton className="h-96 w-full rounded-lg" />;
  }
  if (goals.isError || initiatives.isError || portfolios.isError) {
    return (
      <ErrorState title="Unable to load roadmap" description="Please refresh and try again." />
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle className="mx-auto size-8 text-emerald-300" />}
        title="No roadmap items"
        description="Create goals, initiatives, or portfolios to build a strategic roadmap."
      />
    );
  }
  return (
    <Card className="rounded-lg p-5">
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="grid gap-4 border-t border-white/10 pt-4 first:border-t-0 sm:grid-cols-[7rem_1fr_10rem] sm:items-center"
          >
            <div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
                {item.type}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-medium text-white">{item.title}</h2>
              <p className="mt-1 text-xs text-slate-500">{toDateLabel(item.targetDate)}</p>
            </div>
            <div>
              <HealthBadge health={item.health} />
              <div className="mt-3">
                <ProgressBar value={item.progress} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
