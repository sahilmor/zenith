'use client';

import type {
  AnalyticsReportFormat,
  AnalyticsReportScope,
  TaskPriority,
  TaskStatus,
} from '@pm/types';
import { Download, FileSpreadsheet, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useExportReport, useReportPreview } from '@/features/analytics/api/analytics-hooks';
import { useAnalyticsDashboardStore } from '@/stores/analytics-dashboard-store';
import { useWorkspaceStore } from '@/stores/workspace-store';

const scopes: AnalyticsReportScope[] = [
  'workspace',
  'project',
  'board',
  'user',
  'labels',
  'dueDates',
  'completion',
];
const formats: AnalyticsReportFormat[] = ['csv', 'xlsx', 'pdf'];
const statuses: (TaskStatus | '')[] = ['', 'open', 'in_progress', 'done', 'archived'];
const priorities: (TaskPriority | '')[] = ['', 'low', 'medium', 'high', 'urgent'];

export default function ReportsPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const dateRange = useAnalyticsDashboardStore((state) => state.dateRange);
  const favoriteReports = useAnalyticsDashboardStore((state) => state.favoriteReports);
  const toggleFavoriteReport = useAnalyticsDashboardStore((state) => state.toggleFavoriteReport);
  const [scope, setScope] = useState<AnalyticsReportScope>('workspace');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [search, setSearch] = useState('');
  const reportId = `report-${scope}`;
  const filters = useMemo(
    () => ({
      scope,
      format: 'json' as const,
      workspaceId,
      from: dateRange.from,
      to: dateRange.to,
      status: status || null,
      priority: priority || null,
      search: search || null,
    }),
    [dateRange.from, dateRange.to, priority, scope, search, status, workspaceId],
  );
  const preview = useReportPreview(filters);
  const exportReport = useExportReport();

  const runExport = (format: AnalyticsReportFormat) => {
    exportReport.mutate({ ...filters, format });
  };

  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Reports"
          title="Reporting center"
          description="Generate filtered workspace reports and export them as CSV, Excel, or PDF."
          actions={
            <Button variant="secondary" onClick={() => toggleFavoriteReport(reportId)}>
              <Star className="size-4" />
              {favoriteReports.includes(reportId) ? 'Favorited' : 'Favorite'}
            </Button>
          }
        />
        <Card className="rounded-lg p-5">
          <div className="grid gap-4 md:grid-cols-5">
            <Field label="Scope">
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value as AnalyticsReportScope)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              >
                {scopes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus | '')}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              >
                {statuses.map((item) => (
                  <option key={item || 'all'} value={item}>
                    {item || 'all'}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority | '')}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              >
                {priorities.map((item) => (
                  <option key={item || 'all'} value={item}>
                    {item || 'all'}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Search">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Task title"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Export">
              <div className="flex gap-2">
                {formats.map((format) => (
                  <Button
                    key={format}
                    type="button"
                    variant="secondary"
                    onClick={() => runExport(format)}
                  >
                    <Download className="size-4" />
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </Field>
          </div>
        </Card>
        {preview.isLoading ? (
          <Card className="rounded-lg p-5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-4 h-44 w-full" />
          </Card>
        ) : preview.data ? (
          <Card className="overflow-hidden rounded-lg">
            <div className="border-b border-white/10 p-5">
              <h2 className="text-base font-semibold text-white">Report preview</h2>
              <p className="mt-1 text-sm text-slate-500">
                {preview.data.rows.length} rows, {preview.data.totals.completionRate}% complete
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Task</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.data.rows.slice(0, 25).map((row) => (
                    <tr key={row.id} className="border-t border-white/10">
                      <td className="max-w-sm truncate px-4 py-3 text-white">{row.title}</td>
                      <td className="px-4 py-3 capitalize text-slate-300">
                        {row.status.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-300">{row.priority}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(row.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={<FileSpreadsheet className="mx-auto size-8 text-emerald-300" />}
            title="No report data"
            description="Create workspace tasks or adjust filters to preview report rows."
          />
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-400">
      <span>{label}</span>
      {children}
    </label>
  );
}
