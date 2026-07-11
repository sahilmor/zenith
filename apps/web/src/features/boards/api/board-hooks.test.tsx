import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { apiRequest } from '@/lib/api/client';
import { useBoards, useCreateBoard, useCreateColumn, useReorderColumns } from './board-hooks';

vi.mock('@/lib/api/client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('board hooks', () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it('loads boards for a project', async () => {
    mockedApiRequest.mockResolvedValueOnce([{ id: 'board-1', name: 'Delivery' }]);

    const { result } = renderHook(() => useBoards('project-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/projects/project-1/boards');
  });

  it('creates boards through the project endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 'board-1', name: 'Delivery' });

    const { result } = renderHook(() => useCreateBoard('project-1'), { wrapper });
    result.current.mutate({ name: 'Delivery', isDefault: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/projects/project-1/boards', {
      method: 'POST',
      body: { name: 'Delivery', isDefault: true },
    });
  });

  it('creates and reorders columns', async () => {
    mockedApiRequest
      .mockResolvedValueOnce({ id: 'column-1', name: 'QA' })
      .mockResolvedValueOnce([{ id: 'column-2' }, { id: 'column-1' }]);

    const create = renderHook(() => useCreateColumn('board-1'), { wrapper });
    create.result.current.mutate({ name: 'QA', color: '#a855f7', limit: 2 });
    await waitFor(() => expect(create.result.current.isSuccess).toBe(true));

    const reorder = renderHook(() => useReorderColumns('board-1'), { wrapper });
    reorder.result.current.mutate(['column-2', 'column-1']);
    await waitFor(() => expect(reorder.result.current.isSuccess).toBe(true));

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, '/api/boards/board-1/columns', {
      method: 'POST',
      body: { name: 'QA', color: '#a855f7', limit: 2 },
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/api/boards/board-1/reorder-columns', {
      method: 'POST',
      body: { columnIds: ['column-2', 'column-1'] },
    });
  });
});
