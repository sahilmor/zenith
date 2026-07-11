'use client';

import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDashboardAnalytics } from '@/features/analytics/api/analytics-hooks';
import {
  DashboardWidgetGrid,
  WidgetLibrary,
} from '@/features/analytics/components/dashboard-widgets';
import { useAnalyticsDashboardStore } from '@/stores/analytics-dashboard-store';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function InsightsPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const dateRange = useAnalyticsDashboardStore((state) => state.dateRange);
  const setDateRange = useAnalyticsDashboardStore((state) => state.setDateRange);
  const analytics = useDashboardAnalytics({
    workspaceId,
    from: dateRange.from,
    to: dateRange.to,
  });

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Insights"
          title="Executive dashboard"
          description="Track work health, progress, workload, and recent activity across the selected workspace."
          actions={
            <Button variant="secondary" onClick={() => analytics.refetch()}>
              Refresh
            </Button>
          }
        />
        <Card className="rounded-lg p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            <div>
              <p className="text-sm font-medium text-white">Date range</p>
              <p className="mt-1 text-xs text-slate-500">Filter widgets by task creation date.</p>
            </div>
            <input
              aria-label="Report from date"
              type="date"
              value={dateRange.from ?? ''}
              onChange={(event) => setDateRange({ ...dateRange, from: event.target.value || null })}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
            <input
              aria-label="Report to date"
              type="date"
              value={dateRange.to ?? ''}
              onChange={(event) => setDateRange({ ...dateRange, to: event.target.value || null })}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </div>
        </Card>
        {analytics.isLoading ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <Card key={item} className="rounded-lg p-5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-4 h-40 w-full" />
              </Card>
            ))}
          </section>
        ) : analytics.data ? (
          <>
            <WidgetLibrary />
            <DashboardWidgetGrid analytics={analytics.data} />
          </>
        ) : (
          <EmptyState
            icon={<BarChart3 className="mx-auto size-8 text-emerald-300" />}
            title="No analytics yet"
            description="Create tasks in this workspace to start filling the executive dashboard."
          />
        )}
      </div>
    </main>
  );
}
