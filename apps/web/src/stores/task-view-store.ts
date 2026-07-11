'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TaskFilters } from '@/features/tasks/types';

export type TaskViewMode = 'kanban' | 'calendar' | 'table' | 'timeline' | 'my-tasks';
export type CalendarMode = 'month' | 'week' | 'day' | 'agenda';
export type TimelineZoom = 'week' | 'month' | 'quarter';

interface TaskViewState {
  selectedView: TaskViewMode;
  calendarMode: CalendarMode;
  timelineZoom: TimelineZoom;
  filters: TaskFilters;
  tableColumns: Record<string, boolean>;
  selectedTaskIds: string[];
  setSelectedView: (view: TaskViewMode) => void;
  setCalendarMode: (mode: CalendarMode) => void;
  setTimelineZoom: (zoom: TimelineZoom) => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  resetFilters: () => void;
  toggleTableColumn: (column: string) => void;
  setSelectedTaskIds: (taskIds: string[]) => void;
}

const defaultColumns = {
  title: true,
  priority: true,
  status: true,
  startDate: true,
  dueDate: true,
  labels: true,
  assignees: true,
  updatedAt: true,
};

export const useTaskViewStore = create<TaskViewState>()(
  persist(
    (set) => ({
      selectedView: 'kanban',
      calendarMode: 'month',
      timelineZoom: 'month',
      filters: { sort: 'updatedAt', direction: 'desc' },
      tableColumns: defaultColumns,
      selectedTaskIds: [],
      setSelectedView: (selectedView) => set({ selectedView }),
      setCalendarMode: (calendarMode) => set({ calendarMode }),
      setTimelineZoom: (timelineZoom) => set({ timelineZoom }),
      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters, page: 1 } })),
      resetFilters: () => set({ filters: { sort: 'updatedAt', direction: 'desc' } }),
      toggleTableColumn: (column) =>
        set((state) => ({
          tableColumns: { ...state.tableColumns, [column]: !state.tableColumns[column] },
        })),
      setSelectedTaskIds: (selectedTaskIds) => set({ selectedTaskIds }),
    }),
    { name: 'pm-task-views' },
  ),
);
