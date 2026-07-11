'use client';

import { Activity, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Card } from '@/components/ui/card';
import { useWorkspaceAnalytics } from '@/features/analytics/api/analytics-hooks';
import { BarChart, DonutChart, LineChart } from '@/features/analytics/components/analytics-charts';
import { KpiGrid } from '@/features/analytics/components/dashboard-widgets';
import { useAnalyticsDashboardStore } from '@/stores/analytics-dashboard-store';
import { useWorkspaceStore } from '@/stores/workspace-store';

export default function AnalyticsPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const dateRange = useAnalyticsDashboardStore((state) => state.dateRange);
  const analytics = useWorkspaceAnalytics(workspaceId, {
    from: dateRange.from,
    to: dateRange.to,
  });

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Analytics"
          title="Workspace analytics"
          description="Understand progress, flow, completion velocity, workload, and overdue risk."
        />
        {analytics.isLoading ? (
          <section className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <Card key={item} className="rounded-lg p-5">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-4 h-40 w-full" />
              </Card>
            ))}
          </section>
        ) : analytics.data ? (
          <>
            <KpiGrid analytics={analytics.data} />
            <section className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Open vs closed tasks" icon={<CheckCircle2 className="size-4" />}>
                <DonutChart data={analytics.data.tasksByStatus} />
              </ChartCard>
              <ChartCard title="Priority distribution" icon={<AlertTriangle className="size-4" />}>
                <BarChart data={analytics.data.tasksByPriority} />
              </ChartCard>
              <ChartCard title="Completion velocity" icon={<Activity className="size-4" />}>
                <LineChart data={analytics.data.completedTrend} />
              </ChartCard>
              <ChartCard title="Cycle flow by column" icon={<Clock3 className="size-4" />}>
                <BarChart data={analytics.data.tasksPerColumn} />
              </ChartCard>
              <ChartCard title="Project progress" icon={<CheckCircle2 className="size-4" />}>
                <BarChart data={analytics.data.projectProgress} />
              </ChartCard>
              <ChartCard title="Board progress" icon={<CheckCircle2 className="size-4" />}>
                <BarChart data={analytics.data.boardProgress} />
              </ChartCard>
            </section>
          </>
        ) : (
          <EmptyState
            icon={<Activity className="mx-auto size-8 text-emerald-300" />}
            title="No analytics available"
            description="Analytics appear after workspace tasks and activity exist."
          />
        )}
      </div>
    </main>
  );
}

function ChartCard({
  title,
  icon,
  children,
}: {
  readonly title: string;
  readonly icon: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
        <span className="text-emerald-300">{icon}</span>
        {title}
      </div>
      {children}
    </Card>
  );
}
