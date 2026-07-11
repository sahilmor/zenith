import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/lib/api/client';
import {
  taskKeys,
  useBulkUpdateTasks,
  useCreateTask,
  useReorderTasks,
  useTaskList,
} from './task-hooks';
import type { Task } from '../types';

vi.mock('@/lib/api/client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

const makeTask = (id: string, columnId: string, order: number): Task => ({
  id,
  workspaceId: 'workspace',
  projectId: 'project',
  boardId: 'board',
  columnId,
  title: id,
  description: null,
  order,
  priority: 'medium',
  status: 'open',
  assigneeIds: [],
  reporterId: 'user',
  labels: [],
  dueDate: null,
  startDate: null,
  estimate: null,
  coverImage: null,
  taskTypeId: null,
  workflowId: null,
  workflowStateId: null,
  customFields: [],
  archived: false,
  createdBy: 'user',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
};

describe('task hooks', () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it('creates tasks through the column endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce(makeTask('task-1', 'todo', 0));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateTask('todo'), { wrapper });
    result.current.mutate({ title: 'Ship board', priority: 'high' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/columns/todo/tasks', {
      method: 'POST',
      body: { title: 'Ship board', priority: 'high' },
    });
  });

  it('lists advanced tasks with filters', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      items: [makeTask('task-1', 'todo', 0)],
      page: 1,
      limit: 50,
      total: 1,
      hasMore: false,
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useTaskList({ workspaceId: 'workspace', priority: 'urgent', labels: ['launch'] }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/api/tasks?workspaceId=workspace&priority=urgent&labels=launch',
    );
  });

  it('bulk-updates tasks and invalidates task caches', async () => {
    mockedApiRequest.mockResolvedValueOnce([makeTask('task-1', 'todo', 0)]);
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(taskKeys.byColumn('todo'), [makeTask('task-1', 'todo', 0)]);

    const { result } = renderHook(() => useBulkUpdateTasks(), { wrapper });
    result.current.mutate({ taskIds: ['task-1'], priority: 'high' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/tasks/bulk', {
      method: 'PATCH',
      body: { taskIds: ['task-1'], priority: 'high' },
    });
  });

  it('rolls optimistic reorder back when the API fails', async () => {
    mockedApiRequest.mockRejectedValueOnce(new Error('Network down'));
    const { queryClient, wrapper } = createWrapper();
    const todo = [makeTask('task-1', 'todo', 0), makeTask('task-2', 'todo', 1)];
    const done = [makeTask('task-3', 'done', 0)];
    queryClient.setQueryData(taskKeys.byColumn('todo'), todo);
    queryClient.setQueryData(taskKeys.byColumn('done'), done);

    const { result } = renderHook(() => useReorderTasks(), { wrapper });
    result.current.mutate({
      boardId: 'board',
      columns: [
        { columnId: 'todo', taskIds: ['task-2'] },
        { columnId: 'done', taskIds: ['task-3', 'task-1'] },
      ],
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(taskKeys.byColumn('todo'))).toEqual(todo);
    expect(queryClient.getQueryData(taskKeys.byColumn('done'))).toEqual(done);
  });
});
