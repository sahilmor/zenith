'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import type {
  CreateSubtaskInput,
  CreateTaskInput,
  BulkUpdateTasksInput,
  ReorderTasksInput,
  Subtask,
  Task,
  TaskFilters,
  TaskList,
  UpdateSubtaskInput,
  UpdateTaskInput,
} from '../types';

export const taskKeys = {
  list: (filters: TaskFilters = {}) => ['tasks', 'list', filters] as const,
  byColumn: (columnId: string | null | undefined) => ['columns', columnId, 'tasks'] as const,
  byBoard: (boardId: string | null | undefined) => ['boards', boardId, 'tasks'] as const,
  detail: (taskId: string | null | undefined) => ['tasks', taskId] as const,
  subtasks: (taskId: string | null | undefined) => ['tasks', taskId, 'subtasks'] as const,
};

const toSearchParams = (filters: TaskFilters): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

export function useTaskList(filters: TaskFilters = {}, enabled = true) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => apiRequest<TaskList>(`/api/tasks${toSearchParams(filters)}`),
    enabled,
  });
}

export function useTasks(columnId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: taskKeys.byColumn(columnId),
    queryFn: () => apiRequest<Task[]>(`/api/columns/${columnId}/tasks`),
    enabled: enabled && Boolean(columnId),
  });
}

export function useBoardTasks(columnIds: string[], boardId: string | null | undefined) {
  const queries = useQueries({
    queries: columnIds.map((columnId) => ({
      queryKey: taskKeys.byColumn(columnId),
      queryFn: () => apiRequest<Task[]>(`/api/columns/${columnId}/tasks`),
      enabled: Boolean(boardId),
    })),
  });
  return {
    queries,
    data: queries.flatMap((query) => query.data ?? []),
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
  };
}

export function useTask(taskId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => apiRequest<Task>(`/api/tasks/${taskId}`),
    enabled: enabled && Boolean(taskId),
  });
}

export function useCreateTask(columnId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['task-create'],
    meta: {
      loadingTitle: 'Creating task',
      successTitle: 'Task created',
      errorTitle: 'Task creation failed',
    },
    mutationFn: (input: CreateTaskInput) =>
      apiRequest<Task>(`/api/columns/${columnId}/tasks`, { method: 'POST', body: input }),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.byColumn(columnId) });
      queryClient.setQueryData(taskKeys.detail(task.id), task);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['task-update'],
    meta: {
      loadingTitle: 'Updating task',
      successTitle: 'Task updated',
      errorTitle: 'Task update failed',
    },
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
      apiRequest<Task>(`/api/tasks/${taskId}`, { method: 'PATCH', body: input }),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(task.id), task);
      queryClient.invalidateQueries({ queryKey: taskKeys.byColumn(task.columnId) });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
  });
}

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['tasks-bulk-update'],
    meta: {
      loadingTitle: 'Updating tasks',
      successTitle: 'Tasks updated',
      errorTitle: 'Bulk update failed',
    },
    mutationFn: (input: BulkUpdateTasksInput) =>
      apiRequest<Task[]>('/api/tasks/bulk', { method: 'PATCH', body: input }),
    onSuccess: (tasks) => {
      tasks.forEach((task) => {
        queryClient.setQueryData(taskKeys.detail(task.id), task);
        queryClient.invalidateQueries({ queryKey: taskKeys.byColumn(task.columnId) });
      });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['task-delete'],
    meta: {
      loadingTitle: 'Archiving task',
      successTitle: 'Task archived',
      errorTitle: 'Task archive failed',
    },
    mutationFn: (task: Task) => apiRequest<unknown>(`/api/tasks/${task.id}`, { method: 'DELETE' }),
    onSuccess: (_data, task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.byColumn(task.columnId) });
      queryClient.removeQueries({ queryKey: taskKeys.detail(task.id) });
    },
  });
}

export function useMoveTask() {
  return useReorderTasks();
}

export function useReorderTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['task-reorder'],
    meta: { feedback: false },
    mutationFn: (input: ReorderTasksInput) =>
      apiRequest<Task[]>('/api/tasks/reorder', { method: 'POST', body: input }),
    onMutate: async (input) => {
      await Promise.all(
        input.columns.map((column) =>
          queryClient.cancelQueries({ queryKey: taskKeys.byColumn(column.columnId) }),
        ),
      );
      const previous = input.columns.map((column) => ({
        columnId: column.columnId,
        tasks: queryClient.getQueryData<Task[]>(taskKeys.byColumn(column.columnId)) ?? [],
      }));
      const previousTasks = new Map(
        previous.flatMap((item) => item.tasks.map((task) => [task.id, task])),
      );
      input.columns.forEach((column) => {
        const nextTasks = column.taskIds
          .map((taskId, order) => {
            const task = previousTasks.get(taskId);
            return task ? { ...task, columnId: column.columnId, order } : null;
          })
          .filter((task): task is Task => task !== null);
        queryClient.setQueryData(taskKeys.byColumn(column.columnId), nextTasks);
      });
      return { previous };
    },
    onError: (_error, _input, context) => {
      context?.previous.forEach((item) => {
        queryClient.setQueryData(taskKeys.byColumn(item.columnId), item.tasks);
      });
    },
    onSuccess: (tasks) => {
      const grouped = new Map<string, Task[]>();
      tasks.forEach((task) => {
        grouped.set(task.columnId, [...(grouped.get(task.columnId) ?? []), task]);
        queryClient.setQueryData(taskKeys.detail(task.id), task);
      });
      grouped.forEach((columnTasks, columnId) => {
        queryClient.setQueryData(
          taskKeys.byColumn(columnId),
          columnTasks.sort((first, second) => first.order - second.order),
        );
      });
    },
  });
}

export function useSubtasks(taskId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: taskKeys.subtasks(taskId),
    queryFn: () => apiRequest<Subtask[]>(`/api/tasks/${taskId}/subtasks`),
    enabled: enabled && Boolean(taskId),
  });
}

export function useCreateSubtask(taskId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['subtask-create'],
    meta: {
      loadingTitle: 'Creating subtask',
      successTitle: 'Subtask created',
      errorTitle: 'Subtask creation failed',
    },
    mutationFn: (input: CreateSubtaskInput) =>
      apiRequest<Subtask>(`/api/tasks/${taskId}/subtasks`, { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(taskId) }),
  });
}

export function useUpdateSubtask(taskId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['subtask-update'],
    meta: { feedback: false },
    mutationFn: ({ subtaskId, input }: { subtaskId: string; input: UpdateSubtaskInput }) =>
      apiRequest<Subtask>(`/api/subtasks/${subtaskId}`, { method: 'PATCH', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(taskId) }),
  });
}

export function useDeleteSubtask(taskId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['subtask-delete'],
    meta: {
      loadingTitle: 'Deleting subtask',
      successTitle: 'Subtask deleted',
      errorTitle: 'Subtask delete failed',
    },
    mutationFn: (subtaskId: string) =>
      apiRequest<unknown>(`/api/subtasks/${subtaskId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(taskId) }),
  });
}
