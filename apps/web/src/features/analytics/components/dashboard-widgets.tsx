'use client';

import type { AnalyticsDashboardSummary } from '@pm/types';
import { ArrowDown, ArrowUp, Maximize2, Minimize2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type {
  DashboardWidgetPreference,
  DashboardWidgetType,
} from '@/stores/analytics-dashboard-store';
import { useAnalyticsDashboardStore } from '@/stores/analytics-dashboard-store';
import { BarChart, DonutChart, LineChart } from './analytics-charts';

interface WidgetGridProps {
  readonly analytics: AnalyticsDashboardSummary;
}

const widgetLabels: Record<DashboardWidgetType, string> = {
  kpis: 'KPI Metrics',
  status: 'Tasks by Status',
  priority: 'Tasks by Priority',
  assignee: 'Tasks by Assignee',
  labels: 'Tasks by Label',
  completed: 'Tasks Completed',
  overdue: 'Overdue Tasks',
  upcoming: 'Upcoming Tasks',
  recent: 'Recently Updated',
  activity: 'Workspace Activity',
  projectProgress: 'Project Progress',
  boardProgress: 'Board Progress',
  workload: 'Workload',
};

export function WidgetLibrary() {
  const addWidget = useAnalyticsDashboardStore((state) => state.addWidget);
  const available = Object.entries(widgetLabels) as [DashboardWidgetType, string][];
  return (
    <Card className="rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Widget library</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {available.map(([type, label]) => (
          <Button key={type} type="button" variant="secondary" onClick={() => addWidget(type)}>
            <Plus className="size-4" />
            {label}
          </Button>
        ))}
      </div>
    </Card>
  );
}

export function DashboardWidgetGrid({ analytics }: WidgetGridProps) {
  const widgets = useAnalyticsDashboardStore((state) => state.widgets);
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {widgets.map((widget) => (
        <DashboardWidget key={widget.id} widget={widget} analytics={analytics} />
      ))}
    </section>
  );
}

function DashboardWidget({
  widget,
  analytics,
}: {
  readonly widget: DashboardWidgetPreference;
  readonly analytics: AnalyticsDashboardSummary;
}) {
  const removeWidget = useAnalyticsDashboardStore((state) => state.removeWidget);
  const resizeWidget = useAnalyticsDashboardStore((state) => state.resizeWidget);
  const moveWidget = useAnalyticsDashboardStore((state) => state.moveWidget);
  const large = widget.size === 'lg';
  return (
    <Card className={large ? 'rounded-lg p-5 lg:col-span-2' : 'rounded-lg p-5'}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">{widgetLabels[widget.type]}</h2>
          <p className="mt-1 text-xs text-slate-500">
            Updated {new Date(analytics.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label="Move up" onClick={() => moveWidget(widget.id, 'up')}>
            <ArrowUp className="size-3.5" />
          </IconButton>
          <IconButton label="Move down" onClick={() => moveWidget(widget.id, 'down')}>
            <ArrowDown className="size-3.5" />
          </IconButton>
          <IconButton
            label={large ? 'Shrink widget' : 'Expand widget'}
            onClick={() => resizeWidget(widget.id, large ? 'md' : 'lg')}
          >
            {large ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </IconButton>
          <IconButton label="Remove widget" onClick={() => removeWidget(widget.id)}>
            <Trash2 className="size-3.5" />
          </IconButton>
        </div>
      </div>
      <WidgetBody type={widget.type} analytics={analytics} />
    </Card>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

function WidgetBody({
  type,
  analytics,
}: {
  readonly type: DashboardWidgetType;
  readonly analytics: AnalyticsDashboardSummary;
}) {
  if (type === 'kpis') return <KpiGrid analytics={analytics} />;
  if (type === 'status') return <DonutChart data={analytics.tasksByStatus} />;
  if (type === 'priority') return <BarChart data={analytics.tasksByPriority} />;
  if (type === 'assignee') return <BarChart data={analytics.tasksByAssignee} />;
  if (type === 'labels') return <BarChart data={analytics.tasksByLabel} />;
  if (type === 'completed') return <LineChart data={analytics.completedTrend} />;
  if (type === 'projectProgress') return <BarChart data={analytics.projectProgress} />;
  if (type === 'boardProgress') return <BarChart data={analytics.boardProgress} />;
  if (type === 'workload') return <Workload analytics={analytics} />;
  if (type === 'recent') return <TaskList analytics={analytics} />;
  if (type === 'activity') return <ActivityList analytics={analytics} />;
  if (type === 'overdue')
    return <Metric value={analytics.kpis.overdueTasks} label="Tasks past due" />;
  return <Metric value={analytics.kpis.upcomingTasks} label="Due in the next 7 days" />;
}

export function KpiGrid({ analytics }: WidgetGridProps) {
  const metrics = [
    ['Completion Rate', `${analytics.kpis.completionRate}%`],
    ['Open Tasks', analytics.kpis.openTasks],
    ['Completed Tasks', analytics.kpis.completedTasks],
    ['Average Cycle Time', `${analytics.kpis.averageCycleHours}h`],
    ['Overdue', `${analytics.kpis.overduePercentage}%`],
    ['Productivity Score', analytics.kpis.productivityScore],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

function Workload({ analytics }: WidgetGridProps) {
  if (analytics.workload.length === 0) return <Metric value="0" label="No assigned workload yet" />;
  return (
    <div className="space-y-3">
      {analytics.workload.slice(0, 8).map((item) => (
        <div key={item.userId}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-300">{item.userId.slice(-8)}</span>
            <span className="capitalize text-slate-500">{item.state}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${Math.min(100, item.utilization)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskList({ analytics }: WidgetGridProps) {
  if (analytics.recentlyUpdated.length === 0)
    return <Metric value="0" label="No recent task updates" />;
  return (
    <div className="space-y-3">
      {analytics.recentlyUpdated.map((task) => (
        <div
          key={task.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{task.title}</p>
            <p className="mt-1 text-xs capitalize text-slate-500">
              {task.status.replace('_', ' ')}
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-1 text-xs capitalize text-slate-300">
            {task.priority}
          </span>
        </div>
      ))}
    </div>
  );
}

function ActivityList({ analytics }: WidgetGridProps) {
  if (analytics.teamActivity.length === 0)
    return <Metric value="0" label="No activity in this period" />;
  return (
    <div className="space-y-3">
      {analytics.teamActivity.slice(0, 8).map((item) => (
        <div key={item.id} className="rounded-lg border border-white/10 p-3">
          <p className="text-sm text-white">{item.event.replace(/\./g, ' ')}</p>
          <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

function Metric({ value, label }: { readonly value: React.ReactNode; readonly label: string }) {
  return (
    <div className="grid h-40 place-items-center rounded-lg border border-white/10 bg-black/20 text-center">
      <div>
        <p className="text-4xl font-semibold text-white">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}
