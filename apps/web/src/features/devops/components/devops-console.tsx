'use client';

import { Activity, GitBranch, GitPullRequest, Rocket, ShieldCheck, Workflow } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  type CreateRepositoryInput,
  useCreateDevOpsRepository,
  useDevOpsRepositories,
  useDevOpsSummary,
} from '../api/devops-hooks';

const formatPercent = (value: number): string => `${Math.round(value)}%`;
const formatHours = (value: number): string => `${Math.round(value * 10) / 10}h`;

export function DevOpsConsole({ workspaceId }: { readonly workspaceId: string | null }) {
  const summary = useDevOpsSummary(workspaceId);
  const repositories = useDevOpsRepositories(workspaceId);
  const createRepository = useCreateDevOpsRepository(workspaceId);
  const [repositoryForm, setRepositoryForm] = useState({
    provider: 'manual' as CreateRepositoryInput['provider'],
    providerRepositoryId: '',
    name: '',
    fullName: '',
    url: '',
    defaultBranch: 'main',
    visibility: 'private' as NonNullable<CreateRepositoryInput['visibility']>,
    language: '',
    topics: '',
  });

  const handleCreateRepository = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createRepository.isPending) return;
    const providerRepositoryId = repositoryForm.providerRepositoryId.trim();
    const name = repositoryForm.name.trim();
    const fullName = repositoryForm.fullName.trim();
    const url = repositoryForm.url.trim();
    if (!providerRepositoryId || !name || !fullName || !url) return;

    createRepository.mutate(
      {
        provider: repositoryForm.provider,
        providerRepositoryId,
        name,
        fullName,
        url,
        defaultBranch: repositoryForm.defaultBranch.trim() || 'main',
        visibility: repositoryForm.visibility,
        language: repositoryForm.language.trim() || null,
        topics: repositoryForm.topics
          .split(',')
          .map((topic) => topic.trim())
          .filter(Boolean),
      },
      {
        onSuccess: () =>
          setRepositoryForm({
            provider: 'manual',
            providerRepositoryId: '',
            name: '',
            fullName: '',
            url: '',
            defaultBranch: 'main',
            visibility: 'private',
            language: '',
            topics: '',
          }),
      },
    );
  };

  if (!workspaceId) {
    return (
      <EmptyState
        icon={<Workflow className="mx-auto size-8 text-[var(--app-accent)]" />}
        title="Select a workspace"
        description="Engineering delivery data appears after a workspace is selected."
      />
    );
  }

  if (summary.isLoading) {
    return (
      <section className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="p-5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-4 h-24 w-full" />
          </Card>
        ))}
      </section>
    );
  }

  const metrics = summary.data?.metrics;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Repositories"
          value={String(metrics?.repositoryCount ?? 0)}
          icon={<GitBranch />}
        />
        <MetricCard
          label="Open PRs"
          value={String(metrics?.openPullRequestCount ?? 0)}
          icon={<GitPullRequest />}
        />
        <MetricCard
          label="Deployments"
          value={String(metrics?.deploymentFrequency ?? 0)}
          icon={<Rocket />}
        />
        <MetricCard
          label="Build success"
          value={formatPercent(metrics?.buildSuccessRate ?? 0)}
          icon={<ShieldCheck />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--app-text)]">Repositories</h2>
              <p className="mt-1 text-xs text-[var(--app-muted)]">
                Provider-neutral source connections.
              </p>
            </div>
          </div>
          <form
            onSubmit={handleCreateRepository}
            className="mb-4 grid gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-3 sm:grid-cols-2"
          >
            <label className="block min-w-0 space-y-2">
              <span className="text-sm font-medium text-[var(--app-text)]">Provider</span>
              <select
                value={repositoryForm.provider}
                onChange={(event) =>
                  setRepositoryForm((form) => ({
                    ...form,
                    provider: event.target.value as CreateRepositoryInput['provider'],
                  }))
                }
                className="h-11 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              >
                {(
                  [
                    'manual',
                    'github',
                    'gitlab',
                    'bitbucket',
                    'azure_devops',
                  ] satisfies CreateRepositoryInput['provider'][]
                ).map((provider) => (
                  <option key={provider} value={provider}>
                    {provider.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Provider repository ID"
              value={repositoryForm.providerRepositoryId}
              onChange={(event) =>
                setRepositoryForm((form) => ({
                  ...form,
                  providerRepositoryId: event.target.value,
                }))
              }
              placeholder="repo_123 or provider ID"
              required
            />
            <Input
              label="Name"
              value={repositoryForm.name}
              onChange={(event) =>
                setRepositoryForm((form) => ({ ...form, name: event.target.value }))
              }
              placeholder="platform"
              required
            />
            <Input
              label="Full name"
              value={repositoryForm.fullName}
              onChange={(event) =>
                setRepositoryForm((form) => ({ ...form, fullName: event.target.value }))
              }
              placeholder="zenith/platform"
              required
            />
            <Input
              label="Repository URL"
              type="url"
              value={repositoryForm.url}
              onChange={(event) =>
                setRepositoryForm((form) => ({ ...form, url: event.target.value }))
              }
              placeholder="https://github.com/org/repo"
              required
            />
            <Input
              label="Default branch"
              value={repositoryForm.defaultBranch}
              onChange={(event) =>
                setRepositoryForm((form) => ({ ...form, defaultBranch: event.target.value }))
              }
              placeholder="main"
            />
            <label className="block min-w-0 space-y-2">
              <span className="text-sm font-medium text-[var(--app-text)]">Visibility</span>
              <select
                value={repositoryForm.visibility}
                onChange={(event) =>
                  setRepositoryForm((form) => ({
                    ...form,
                    visibility: event.target.value as NonNullable<
                      CreateRepositoryInput['visibility']
                    >,
                  }))
                }
                className="h-11 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              >
                {(
                  ['private', 'public', 'internal'] satisfies NonNullable<
                    CreateRepositoryInput['visibility']
                  >[]
                ).map((visibility) => (
                  <option key={visibility} value={visibility}>
                    {visibility}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Language"
              value={repositoryForm.language}
              onChange={(event) =>
                setRepositoryForm((form) => ({ ...form, language: event.target.value }))
              }
              placeholder="TypeScript"
            />
            <Input
              label="Topics"
              value={repositoryForm.topics}
              onChange={(event) =>
                setRepositoryForm((form) => ({ ...form, topics: event.target.value }))
              }
              placeholder="delivery, platform"
            />
            <Button
              type="submit"
              size="sm"
              className="sm:col-span-2"
              loading={createRepository.isPending}
              disabled={
                !repositoryForm.providerRepositoryId.trim() ||
                !repositoryForm.name.trim() ||
                !repositoryForm.fullName.trim() ||
                !repositoryForm.url.trim() ||
                createRepository.isPending
              }
            >
              Connect repository
            </Button>
          </form>
          <div className="space-y-3">
            {(repositories.data ?? []).slice(0, 8).map((repository) => (
              <div key={repository.id} className="rounded-md border border-[var(--app-border)] p-3">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--app-text)]">
                      {repository.fullName}
                    </p>
                    <p className="text-xs capitalize text-[var(--app-muted)]">
                      {repository.provider.replace('_', ' ')} · {repository.defaultBranch}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--app-accent)]">
                    {repository.language ?? 'code'}
                  </span>
                </div>
              </div>
            ))}
            {repositories.data?.length === 0 ? (
              <p className="text-sm text-[var(--app-muted)]">No repositories connected yet.</p>
            ) : null}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--app-text)]">DORA metrics</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile label="Lead time" value={formatHours(metrics?.leadTimeHours ?? 0)} />
            <MetricTile label="MTTR" value={formatHours(metrics?.mttrHours ?? 0)} />
            <MetricTile
              label="Failure rate"
              value={formatPercent(metrics?.changeFailureRate ?? 0)}
            />
            <MetricTile
              label="Review latency"
              value={formatHours(metrics?.averageReviewLatencyHours ?? 0)}
            />
          </div>
          <div className="mt-4 rounded-md border border-[var(--app-border)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--app-muted)]">Release risk</p>
            <p className="mt-2 text-lg font-semibold capitalize text-[var(--app-text)]">
              {metrics?.releaseRisk ?? 'low'}
            </p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ActivityList
          title="Pull requests"
          items={(summary.data?.recentPullRequests ?? []).map((item) => ({
            id: item.id,
            title: `#${item.number} ${item.title}`,
            meta: `${item.status} · ${item.reviewStatus.replace('_', ' ')}`,
          }))}
        />
        <ActivityList
          title="Pipelines"
          items={(summary.data?.recentPipelineRuns ?? []).map((item) => ({
            id: item.id,
            title: item.name,
            meta: `${item.status} · ${item.durationSeconds ?? 0}s`,
          }))}
        />
        <ActivityList
          title="Deployments"
          items={(summary.data?.recentDeployments ?? []).map((item) => ({
            id: item.id,
            title: item.environment,
            meta: `${item.status} · ${item.environmentType}`,
          }))}
        />
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
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-[var(--app-muted)]">{label}</p>
        <span className="text-[var(--app-accent)] [&>svg]:size-4">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-[var(--app-text)]">{value}</p>
    </Card>
  );
}

function MetricTile({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-md border border-[var(--app-border)] p-3">
      <p className="text-xs text-[var(--app-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function ActivityList({
  title,
  items,
}: {
  readonly title: string;
  readonly items: readonly { readonly id: string; readonly title: string; readonly meta: string }[];
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
        <Activity className="size-4 text-[var(--app-accent)]" />
        {title}
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-md border border-[var(--app-border)] p-3">
            <p className="line-clamp-2 text-sm font-medium text-[var(--app-text)]">{item.title}</p>
            <p className="mt-1 text-xs capitalize text-[var(--app-muted)]">{item.meta}</p>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-[var(--app-muted)]">No recent activity yet.</p>
        ) : null}
      </div>
    </Card>
  );
}
