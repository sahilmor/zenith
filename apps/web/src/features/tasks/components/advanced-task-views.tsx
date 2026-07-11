'use client';

import {
  Archive,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Filter,
  ListChecks,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { useTaskViewStore, type CalendarMode } from '@/stores/task-view-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useBulkUpdateTasks, useTaskList, useUpdateTask } from '../api/task-hooks';
import type { Task, TaskFilters, TaskPriority, TaskStatus } from '../types';

const priorities = ['low', 'medium', 'high', 'urgent'] satisfies TaskPriority[];
const statuses = ['open', 'in_progress', 'done', 'archived'] satisfies TaskStatus[];

const formatDateInput = (date: string | null): string => (date ? date.slice(0, 10) : '');
const toIsoDay = (date: Date): string => {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return next.toISOString();
};
const dayKey = (date: Date): string => date.toISOString().slice(0, 10);
const isOverdue = (task: Task): boolean =>
  Boolean(
    task.dueDate && task.status !== 'done' && !task.archived && new Date(task.dueDate) < new Date(),
  );

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

function useAdvancedTasks(extraFilters: TaskFilters = {}) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const filters = useTaskViewStore((state) => state.filters);
  const mergedFilters: TaskFilters = {
    limit: 100,
    workspaceId: workspaceId ?? undefined,
    ...filters,
    ...extraFilters,
  };
  return { query: useTaskList(mergedFilters, Boolean(workspaceId)), filters: mergedFilters };
}

export function TaskFilterBar() {
  const filters = useTaskViewStore((state) => state.filters);
  const setFilters = useTaskViewStore((state) => state.setFilters);
  const resetFilters = useTaskViewStore((state) => state.resetFilters);
  return (
    <Card className="grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_repeat(4,auto)]">
      <Input
        aria-label="Search tasks"
        placeholder="Search tasks"
        value={filters.search ?? ''}
        onChange={(event) => setFilters({ search: event.target.value || undefined })}
      />
      <select
        aria-label="Filter priority"
        value={filters.priority ?? ''}
        onChange={(event) =>
          setFilters({ priority: (event.target.value || undefined) as TaskPriority | undefined })
        }
        className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
      >
        <option value="">Priority</option>
        {priorities.map((priority) => (
          <option key={priority} value={priority}>
            {priority}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter status"
        value={filters.status ?? ''}
        onChange={(event) =>
          setFilters({ status: (event.target.value || undefined) as TaskStatus | undefined })
        }
        className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
      >
        <option value="">Status</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status.replace('_', ' ')}
          </option>
        ))}
      </select>
      <select
        aria-label="Sort tasks"
        value={filters.sort ?? 'updatedAt'}
        onChange={(event) => setFilters({ sort: event.target.value as TaskFilters['sort'] })}
        className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
      >
        <option value="updatedAt">Updated</option>
        <option value="createdAt">Created</option>
        <option value="dueDate">Due date</option>
        <option value="priority">Priority</option>
        <option value="title">Alphabetical</option>
        <option value="manual">Manual</option>
      </select>
      <Button type="button" variant="secondary" onClick={resetFilters}>
        <Filter className="size-4" />
        Reset
      </Button>
    </Card>
  );
}

export function TaskViewShell({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <main className="px-4 py-6 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Advanced views</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        </div>
        <TaskFilterBar />
        {children}
      </div>
    </main>
  );
}

function TaskState({
  isLoading,
  isError,
  tasks,
}: Readonly<{ isLoading: boolean; isError: boolean; tasks: Task[] }>) {
  if (isLoading)
    return (
      <Card className="rounded-lg p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-28 w-full" />
      </Card>
    );
  if (isError)
    return <ErrorState title="Unable to load tasks" description="Please refresh and try again." />;
  if (tasks.length === 0)
    return (
      <EmptyState
        icon={<ListChecks className="mx-auto size-8 text-emerald-300" />}
        title="No tasks found"
        description="Adjust filters or create tasks from a board."
      />
    );
  return null;
}

export function CalendarTaskView() {
  const { query } = useAdvancedTasks({ sort: 'dueDate', direction: 'asc' });
  const mode = useTaskViewStore((state) => state.calendarMode);
  const setMode = useTaskViewStore((state) => state.setCalendarMode);
  const updateTask = useUpdateTask();
  const [cursor, setCursor] = useState(() => new Date());
  const tasks = query.data?.items ?? [];
  const state = <TaskState isLoading={query.isLoading} isError={query.isError} tasks={tasks} />;
  if (query.isLoading || query.isError || tasks.length === 0) return <>{state}</>;

  const days = calendarDays(cursor, mode);
  const moveTaskToDay = (taskId: string, date: Date) => {
    updateTask.mutate({ taskId, input: { dueDate: toIsoDay(date), startDate: toIsoDay(date) } });
  };
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 rounded-lg p-3">
        <Button variant="secondary" onClick={() => setCursor(new Date())}>
          Today
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCursor(addDays(cursor, mode === 'month' ? -30 : -7))}
          aria-label="Previous period"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Input
          type="date"
          value={dayKey(cursor)}
          onChange={(event) => setCursor(new Date(event.target.value))}
          aria-label="Pick date"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCursor(addDays(cursor, mode === 'month' ? 30 : 7))}
          aria-label="Next period"
        >
          <ChevronRight className="size-4" />
        </Button>
        {(['month', 'week', 'day', 'agenda'] satisfies CalendarMode[]).map((item) => (
          <Button
            key={item}
            variant={mode === item ? 'primary' : 'secondary'}
            onClick={() => setMode(item)}
          >
            {item}
          </Button>
        ))}
      </Card>
      <div className={mode === 'agenda' ? 'space-y-3' : 'grid grid-cols-1 gap-3 md:grid-cols-7'}>
        {days.map((day) => {
          const key = dayKey(day);
          const dayTasks = tasks.filter((task) => formatDateInput(task.dueDate) === key);
          return (
            <Card
              key={key}
              className="min-h-36 rounded-lg p-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => moveTaskToDay(event.dataTransfer.getData('task/id'), day)}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <span className="text-xs text-slate-500">{dayTasks.length}</span>
              </div>
              <div className="mt-3 space-y-2">
                {dayTasks.map((task) => (
                  <TaskPill
                    key={task.id}
                    task={task}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('task/id', task.id)}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function calendarDays(cursor: Date, mode: CalendarMode): Date[] {
  if (mode === 'day') return [cursor];
  if (mode === 'agenda') return Array.from({ length: 14 }, (_, index) => addDays(cursor, index));
  if (mode === 'week') return Array.from({ length: 7 }, (_, index) => addDays(cursor, index));
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  return Array.from({ length: 35 }, (_, index) => addDays(start, index));
}

function TaskPill({ task, ...props }: React.HTMLAttributes<HTMLDivElement> & { task: Task }) {
  return (
    <div
      {...props}
      className={`rounded-lg border px-3 py-2 text-sm ${isOverdue(task) ? 'border-red-300/40 bg-red-400/10 text-red-100' : 'border-white/10 bg-white/[0.04]'}`}
    >
      <p className="truncate font-medium">{task.title}</p>
      <p className="mt-1 text-xs text-slate-400">
        {task.priority} - {task.status.replace('_', ' ')}
      </p>
    </div>
  );
}

export function TableTaskView() {
  const filters = useTaskViewStore((state) => state.filters);
  const setFilters = useTaskViewStore((state) => state.setFilters);
  const selected = useTaskViewStore((state) => state.selectedTaskIds);
  const setSelected = useTaskViewStore((state) => state.setSelectedTaskIds);
  const columns = useTaskViewStore((state) => state.tableColumns);
  const toggleColumn = useTaskViewStore((state) => state.toggleTableColumn);
  const { query } = useAdvancedTasks();
  const updateTask = useUpdateTask();
  const bulk = useBulkUpdateTasks();
  const tasks = query.data?.items ?? [];
  const state = <TaskState isLoading={query.isLoading} isError={query.isError} tasks={tasks} />;
  if (query.isLoading || query.isError || tasks.length === 0) return <>{state}</>;
  const allSelected = selected.length === tasks.length;
  const toggleTask = (taskId: string) =>
    setSelected(
      selected.includes(taskId) ? selected.filter((id) => id !== taskId) : [...selected, taskId],
    );
  return (
    <Card className="overflow-hidden rounded-lg">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
        <Button
          variant="secondary"
          disabled={selected.length === 0}
          onClick={() => bulk.mutate({ taskIds: selected, archived: true })}
        >
          <Archive className="size-4" />
          Archive selected
        </Button>
        <select
          className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm"
          onChange={(event) =>
            event.target.value &&
            bulk.mutate({ taskIds: selected, priority: event.target.value as TaskPriority })
          }
          disabled={selected.length === 0}
        >
          <option value="">Priority</option>
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        {Object.keys(columns).map((column) => (
          <label
            key={column}
            className="ml-auto flex items-center gap-2 text-xs text-slate-400 first:ml-0"
          >
            <input
              type="checkbox"
              checked={columns[column]}
              onChange={() => toggleColumn(column)}
            />
            {column}
          </label>
        ))}
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-950">
            <tr className="border-b border-white/10 text-left text-xs uppercase text-slate-500">
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? [] : tasks.map((task) => task.id))}
                />
              </th>
              {columns.title && (
                <SortableHead
                  label="Title"
                  field="title"
                  filters={filters}
                  setFilters={setFilters}
                />
              )}
              {columns.priority && (
                <SortableHead
                  label="Priority"
                  field="priority"
                  filters={filters}
                  setFilters={setFilters}
                />
              )}
              {columns.status && <th className="resize-x p-3">Status</th>}
              {columns.startDate && <th className="resize-x p-3">Start</th>}
              {columns.dueDate && (
                <SortableHead
                  label="Due"
                  field="dueDate"
                  filters={filters}
                  setFilters={setFilters}
                />
              )}
              {columns.labels && <th className="resize-x p-3">Labels</th>}
              {columns.updatedAt && (
                <SortableHead
                  label="Updated"
                  field="updatedAt"
                  filters={filters}
                  setFilters={setFilters}
                />
              )}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b border-white/10">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(task.id)}
                    onChange={() => toggleTask(task.id)}
                  />
                </td>
                {columns.title && (
                  <td className="p-3">
                    <InlineText task={task} />
                  </td>
                )}
                {columns.priority && (
                  <td className="p-3">
                    <InlineSelect
                      value={task.priority}
                      options={priorities}
                      onChange={(priority) =>
                        updateTask.mutate({
                          taskId: task.id,
                          input: { priority: priority as TaskPriority },
                        })
                      }
                    />
                  </td>
                )}
                {columns.status && (
                  <td className="p-3">
                    <InlineSelect
                      value={task.status}
                      options={statuses}
                      onChange={(status) =>
                        updateTask.mutate({
                          taskId: task.id,
                          input: { status: status as TaskStatus },
                        })
                      }
                    />
                  </td>
                )}
                {columns.startDate && (
                  <td className="p-3">
                    <DateCell
                      value={task.startDate}
                      onChange={(startDate) =>
                        updateTask.mutate({ taskId: task.id, input: { startDate } })
                      }
                    />
                  </td>
                )}
                {columns.dueDate && (
                  <td className="p-3">
                    <DateCell
                      value={task.dueDate}
                      onChange={(dueDate) =>
                        updateTask.mutate({ taskId: task.id, input: { dueDate } })
                      }
                    />
                  </td>
                )}
                {columns.labels && (
                  <td className="p-3 text-slate-400">{task.labels.join(', ') || '-'}</td>
                )}
                {columns.updatedAt && (
                  <td className="p-3 text-slate-400">
                    {new Date(task.updatedAt).toLocaleDateString()}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SortableHead({
  label,
  field,
  filters,
  setFilters,
}: {
  label: string;
  field: NonNullable<TaskFilters['sort']>;
  filters: TaskFilters;
  setFilters: (filters: Partial<TaskFilters>) => void;
}) {
  return (
    <th className="resize-x p-3">
      <button
        type="button"
        onClick={() =>
          setFilters({ sort: field, direction: filters.direction === 'asc' ? 'desc' : 'asc' })
        }
      >
        {label}
      </button>
    </th>
  );
}

function InlineText({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  return (
    <input
      className="w-full bg-transparent outline-none"
      defaultValue={task.title}
      onBlur={(event) =>
        event.target.value !== task.title &&
        updateTask.mutate({ taskId: task.id, input: { title: event.target.value } })
      }
    />
  );
}

function InlineSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option.replace('_', ' ')}
        </option>
      ))}
    </select>
  );
}

function DateCell({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <input
      type="date"
      className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1"
      value={formatDateInput(value)}
      onChange={(event) =>
        onChange(event.target.value ? toIsoDay(new Date(event.target.value)) : null)
      }
    />
  );
}

export function TimelineTaskView() {
  const zoom = useTaskViewStore((state) => state.timelineZoom);
  const setZoom = useTaskViewStore((state) => state.setTimelineZoom);
  const { query } = useAdvancedTasks({ sort: 'dueDate', direction: 'asc' });
  const updateTask = useUpdateTask();
  const tasks = query.data?.items ?? [];
  const state = <TaskState isLoading={query.isLoading} isError={query.isError} tasks={tasks} />;
  if (query.isLoading || query.isError || tasks.length === 0) return <>{state}</>;
  const scale = zoom === 'week' ? 24 : zoom === 'month' ? 10 : 4;
  return (
    <Card className="rounded-lg p-4">
      <div className="mb-4 flex gap-2">
        {(['week', 'month', 'quarter'] as const).map((item) => (
          <Button
            key={item}
            variant={zoom === item ? 'primary' : 'secondary'}
            onClick={() => setZoom(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      <div className="space-y-3 overflow-x-auto pb-2">
        {tasks.map((task) => {
          const start = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
          const end = task.dueDate ? new Date(task.dueDate) : addDays(start, 1);
          const offset = Math.max(0, Math.floor((start.getTime() - Date.now()) / 86400000) + 30);
          const width = Math.max(2, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
          return (
            <div
              key={task.id}
              className="grid min-w-[900px] grid-cols-[220px_1fr] items-center gap-3"
            >
              <div>
                <p className="truncate text-sm font-medium">{task.title}</p>
                <div className="mt-1 flex gap-2">
                  <DateCell
                    value={task.startDate}
                    onChange={(startDate) =>
                      updateTask.mutate({ taskId: task.id, input: { startDate } })
                    }
                  />
                  <DateCell
                    value={task.dueDate}
                    onChange={(dueDate) =>
                      updateTask.mutate({ taskId: task.id, input: { dueDate } })
                    }
                  />
                </div>
              </div>
              <div className="relative h-10 rounded-lg bg-white/[0.04]">
                <div
                  className={`absolute top-1 h-8 rounded-lg ${isOverdue(task) ? 'bg-red-400' : 'bg-emerald-400'}`}
                  style={{ left: `${offset * scale}px`, width: `${width * scale}px` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function MyTasksView() {
  const userId = useAuthStore((state) => state.user?.id);
  const { query } = useAdvancedTasks({ assigneeId: userId, sort: 'dueDate', direction: 'asc' });
  const created = useAdvancedTasks({
    createdBy: userId,
    sort: 'updatedAt',
    direction: 'desc',
  }).query;
  const watching = useAdvancedTasks({
    watchingUserId: userId,
    sort: 'updatedAt',
    direction: 'desc',
  }).query;
  const tasks = query.data?.items ?? [];
  const state = <TaskState isLoading={query.isLoading} isError={query.isError} tasks={tasks} />;
  if (query.isLoading || query.isError || tasks.length === 0) return <>{state}</>;
  const today = dayKey(new Date());
  const sections = [
    { title: 'Today', tasks: tasks.filter((task) => formatDateInput(task.dueDate) === today) },
    {
      title: 'Upcoming',
      tasks: tasks.filter((task) => task.dueDate && new Date(task.dueDate) > new Date()),
    },
    { title: 'Overdue', tasks: tasks.filter(isOverdue) },
    { title: 'Completed', tasks: tasks.filter((task) => task.status === 'done') },
    { title: 'Archived', tasks: tasks.filter((task) => task.archived) },
    { title: 'Watching', tasks: watching.data?.items ?? [] },
    { title: 'Created by me', tasks: created.data?.items ?? [] },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {sections.map((section) => (
        <Card key={section.title} className="rounded-lg p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CheckSquare className="size-4" />
            {section.title}
          </h2>
          <div className="mt-3 space-y-2">
            {section.tasks.length > 0 ? (
              section.tasks.map((task) => <TaskPill key={task.id} task={task} />)
            ) : (
              <p className="text-sm text-slate-500">Nothing here.</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function SavedViewsPageContent() {
  const setSelectedView = useTaskViewStore((state) => state.setSelectedView);
  const presets = [
    {
      title: 'Calendar planning',
      href: '/dashboard/tasks/calendar',
      icon: CalendarDays,
      view: 'calendar',
    },
    { title: 'Spreadsheet triage', href: '/dashboard/tasks/table', icon: Columns3, view: 'table' },
    {
      title: 'Delivery timeline',
      href: '/dashboard/tasks/timeline',
      icon: ChevronRight,
      view: 'timeline',
    },
    { title: 'My Tasks', href: '/dashboard/tasks/my', icon: Search, view: 'my-tasks' },
  ] as const;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {presets.map((preset) => {
        const Icon = preset.icon;
        return (
          <Card key={preset.title} className="rounded-lg p-5">
            <Icon className="size-5 text-emerald-300" />
            <h2 className="mt-4 text-lg font-semibold">{preset.title}</h2>
            <p className="mt-2 text-sm text-slate-400">
              Persisted filters and sorting are shared across task views.
            </p>
            <Button className="mt-4" onClick={() => setSelectedView(preset.view)}>
              Select view
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
