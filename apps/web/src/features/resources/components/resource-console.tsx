'use client';

import { Clock3, Timer, TrendingUp, UserRoundCheck, UsersRound } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useResourceForecast,
  useResourceProfiles,
  useResourceSummary,
  useRunningTimer,
  useStartTimer,
  useStopTimer,
  useTimesheet,
} from '../api/resource-hooks';

const hours = (minutes: number): string => `${Math.round((minutes / 60) * 10) / 10}h`;

export function ResourceConsole({ workspaceId }: { readonly workspaceId: string | null }) {
  const summary = useResourceSummary(workspaceId);
  const forecast = useResourceForecast(workspaceId);
  const profiles = useResourceProfiles(workspaceId);
  const timer = useRunningTimer(workspaceId);
  const timesheet = useTimesheet(workspaceId);
  const startTimer = useStartTimer(workspaceId);
  const stopTimer = useStopTimer(workspaceId);

  if (!workspaceId) {
    return (
      <EmptyState
        icon={<UsersRound className="mx-auto size-8 text-emerald-300" />}
        title="Select a workspace"
        description="Resource planning appears after a workspace is selected."
      />
    );
  }

  if (summary.isLoading) {
    return (
      <section className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="rounded-lg p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-4 h-28 w-full" />
          </Card>
        ))}
      </section>
    );
  }

  const data = summary.data;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Capacity" value={hours(data?.totalCapacityMinutes ?? 0)} />
        <MetricCard label="Allocated" value={hours(data?.totalAllocatedMinutes ?? 0)} />
        <MetricCard label="Logged" value={hours(data?.totalLoggedMinutes ?? 0)} />
        <MetricCard label="Utilization" value={`${data?.utilizationPercent ?? 0}%`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--app-text)]">Time intelligence</h2>
              <p className="mt-1 text-xs text-[var(--app-muted)]">
                Running timer and current timesheet totals.
              </p>
            </div>
            {timer.data ? (
              <Button
                type="button"
                onClick={() => stopTimer.mutate({})}
                disabled={stopTimer.isPending}
              >
                Stop timer
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => startTimer.mutate({ description: 'Resource planning work' })}
                disabled={startTimer.isPending}
              >
                Start timer
              </Button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <SmallStat
              icon={<Timer className="size-4" />}
              label="Timer"
              value={timer.data ? `${timer.data.elapsedMinutes}m running` : 'Not running'}
            />
            <SmallStat
              icon={<Clock3 className="size-4" />}
              label="Timesheet"
              value={hours(timesheet.data?.totalMinutes ?? 0)}
            />
            <SmallStat
              icon={<UserRoundCheck className="size-4" />}
              label="Billable"
              value={hours(timesheet.data?.billableMinutes ?? 0)}
            />
          </div>
        </Card>

        <Card className="rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--app-text)]">Forecast</h2>
          <p className="mt-2 text-3xl font-semibold text-[var(--app-text)]">
            {forecast.data?.deliveryRisk ?? 'low'} risk
          </p>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            {hours(forecast.data?.remainingCapacityMinutes ?? 0)} available capacity remains.
          </p>
          <div className="mt-4 space-y-2">
            {(forecast.data?.insights ?? []).map((insight) => (
              <p
                key={insight}
                className="rounded-md border border-[var(--app-border)] px-3 py-2 text-xs"
              >
                {insight}
              </p>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-lg p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--app-text)]">Workload</h2>
          {data?.workload.length ? (
            <div className="space-y-3">
              {data.workload.map((item) => (
                <div key={item.userId} className="rounded-md border border-[var(--app-border)] p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-[var(--app-text)]">
                      {item.profile.title ?? item.userId}
                    </span>
                    <span className="text-xs capitalize text-[var(--app-muted)]">
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${Math.min(100, item.allocationPercent)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--app-muted)]">
                    {item.allocationPercent}% allocated · {hours(item.loggedMinutes)} logged
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<UsersRound className="mx-auto size-8 text-emerald-300" />}
              title="No resource profiles"
              description="Managers can create profiles to unlock capacity planning."
            />
          )}
        </Card>

        <Card className="rounded-lg p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--app-text)]">Capacity heatmap</h2>
          <div className="grid grid-cols-7 gap-2">
            {(data?.heatmap ?? []).slice(0, 14).map((day) => (
              <div
                key={day.date}
                className="rounded-md border border-[var(--app-border)] p-2 text-center text-xs"
                title={`${day.date}: ${day.utilizationPercent}%`}
              >
                <div
                  className="mx-auto mb-2 size-8 rounded"
                  style={{
                    backgroundColor:
                      day.utilizationPercent > 100
                        ? '#f87171'
                        : day.utilizationPercent > 70
                          ? '#facc15'
                          : '#34d399',
                    opacity: 0.85,
                  }}
                />
                <span className="text-[var(--app-muted)]">{day.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="rounded-lg p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
          <TrendingUp className="size-4 text-emerald-300" />
          Staffing recommendations
        </div>
        {forecast.data?.recommendedAssignees.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {forecast.data.recommendedAssignees.map((recommendation) => (
              <div
                key={recommendation.userId}
                className="rounded-md border border-[var(--app-border)] p-3"
              >
                <p className="text-sm font-medium text-[var(--app-text)]">
                  {recommendation.userId}
                </p>
                <p className="mt-1 text-xs text-[var(--app-muted)]">{recommendation.reason}</p>
                <p className="mt-2 text-xs text-emerald-300">
                  {hours(recommendation.availableMinutes)} available
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--app-muted)]">
            Recommendations appear after resource profiles and allocations exist.
          </p>
        )}
        <p className="mt-4 text-xs text-[var(--app-muted)]">
          {profiles.data?.length ?? 0} active profiles included in this planning model.
        </p>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <Card className="rounded-lg p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--app-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--app-text)]">{value}</p>
    </Card>
  );
}

function SmallStat({
  icon,
  label,
  value,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-md border border-[var(--app-border)] p-3">
      <div className="flex items-center gap-2 text-xs text-emerald-300">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-[var(--app-text)]">{value}</p>
    </div>
  );
}
