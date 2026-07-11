'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DashboardWidgetType =
  | 'kpis'
  | 'status'
  | 'priority'
  | 'assignee'
  | 'labels'
  | 'completed'
  | 'overdue'
  | 'upcoming'
  | 'recent'
  | 'activity'
  | 'projectProgress'
  | 'boardProgress'
  | 'workload';

export interface DashboardWidgetPreference {
  readonly id: string;
  readonly type: DashboardWidgetType;
  readonly size: 'sm' | 'md' | 'lg';
}

interface AnalyticsDashboardState {
  readonly widgets: DashboardWidgetPreference[];
  readonly dateRange: {
    readonly from: string | null;
    readonly to: string | null;
  };
  readonly favoriteReports: string[];
  readonly setDateRange: (range: { from: string | null; to: string | null }) => void;
  readonly addWidget: (type: DashboardWidgetType) => void;
  readonly removeWidget: (id: string) => void;
  readonly resizeWidget: (id: string, size: DashboardWidgetPreference['size']) => void;
  readonly moveWidget: (id: string, direction: 'up' | 'down') => void;
  readonly toggleFavoriteReport: (reportId: string) => void;
}

const defaultWidgets: DashboardWidgetPreference[] = [
  { id: 'kpis', type: 'kpis', size: 'lg' },
  { id: 'status', type: 'status', size: 'md' },
  { id: 'priority', type: 'priority', size: 'md' },
  { id: 'project-progress', type: 'projectProgress', size: 'md' },
  { id: 'workload', type: 'workload', size: 'lg' },
  { id: 'activity', type: 'activity', size: 'md' },
];

export const useAnalyticsDashboardStore = create<AnalyticsDashboardState>()(
  persist(
    (set) => ({
      widgets: defaultWidgets,
      dateRange: { from: null, to: null },
      favoriteReports: [],
      setDateRange: (dateRange) => set({ dateRange }),
      addWidget: (type) =>
        set((state) => ({
          widgets: [
            ...state.widgets,
            { id: `${type}-${Date.now()}`, type, size: type === 'kpis' ? 'lg' : 'md' },
          ],
        })),
      removeWidget: (id) =>
        set((state) => ({ widgets: state.widgets.filter((widget) => widget.id !== id) })),
      resizeWidget: (id, size) =>
        set((state) => ({
          widgets: state.widgets.map((widget) => (widget.id === id ? { ...widget, size } : widget)),
        })),
      moveWidget: (id, direction) =>
        set((state) => {
          const index = state.widgets.findIndex((widget) => widget.id === id);
          const target = direction === 'up' ? index - 1 : index + 1;
          if (index < 0 || target < 0 || target >= state.widgets.length) return state;
          const widgets = [...state.widgets];
          const [widget] = widgets.splice(index, 1);
          if (!widget) return state;
          widgets.splice(target, 0, widget);
          return { widgets };
        }),
      toggleFavoriteReport: (reportId) =>
        set((state) => ({
          favoriteReports: state.favoriteReports.includes(reportId)
            ? state.favoriteReports.filter((id) => id !== reportId)
            : [...state.favoriteReports, reportId],
        })),
    }),
    { name: 'pm-analytics-dashboard' },
  ),
);
