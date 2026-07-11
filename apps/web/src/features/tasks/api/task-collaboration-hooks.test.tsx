import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, apiUploadRequest } from '@/lib/api/client';
import {
  useCreateComment,
  useLabels,
  useUploadAttachment,
  useWatchTask,
} from './task-collaboration-hooks';

vi.mock('@/lib/api/client', () => ({
  apiRequest: vi.fn(),
  apiUploadRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);
const mockedApiUploadRequest = vi.mocked(apiUploadRequest);

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('task collaboration hooks', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    mockedApiUploadRequest.mockReset();
  });

  it('creates comments through the task endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce({ id: 'comment-1', content: 'Hello' });

    const { result } = renderHook(() => useCreateComment('task-1'), { wrapper });
    result.current.mutate({ content: 'Hello' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/tasks/task-1/comments', {
      method: 'POST',
      body: { content: 'Hello' },
    });
  });

  it('uploads attachments as FormData', async () => {
    mockedApiUploadRequest.mockResolvedValueOnce({ id: 'attachment-1' });
    const file = new File(['hello'], 'hello.pdf', { type: 'application/pdf' });

    const { result } = renderHook(() => useUploadAttachment('task-1'), { wrapper });
    result.current.mutate(file);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [, options] = mockedApiUploadRequest.mock.calls[0] ?? [];
    expect(mockedApiUploadRequest.mock.calls[0]?.[0]).toBe('/api/tasks/task-1/attachments');
    expect(options).toMatchObject({ method: 'POST' });
    expect(options?.body).toBeInstanceOf(FormData);
  });

  it('rejects unsupported attachments before upload', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    const { result } = renderHook(() => useUploadAttachment('task-1'), { wrapper });
    result.current.mutate(file);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockedApiRequest).not.toHaveBeenCalled();
    expect(mockedApiUploadRequest).not.toHaveBeenCalled();
  });

  it('allows supported attachment extensions with generic MIME types', async () => {
    mockedApiUploadRequest.mockResolvedValueOnce({ id: 'attachment-1' });
    const file = new File(['zip'], 'archive.zip', { type: 'application/octet-stream' });

    const { result } = renderHook(() => useUploadAttachment('task-1'), { wrapper });
    result.current.mutate(file);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedApiUploadRequest).toHaveBeenCalledWith(
      '/api/tasks/task-1/attachments',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('creates labels and watches tasks', async () => {
    mockedApiRequest
      .mockResolvedValueOnce({ id: 'label-1' })
      .mockResolvedValueOnce({ id: 'watcher-1' });

    const labels = renderHook(() => useLabels('task-1', false), { wrapper });
    labels.result.current.create.mutate({ name: 'Bug', color: '#ef4444' });
    await waitFor(() => expect(labels.result.current.create.isSuccess).toBe(true));

    const watch = renderHook(() => useWatchTask('task-1'), { wrapper });
    watch.result.current.watch.mutate();
    await waitFor(() => expect(watch.result.current.watch.isSuccess).toBe(true));

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, '/api/tasks/task-1/labels', {
      method: 'POST',
      body: { name: 'Bug', color: '#ef4444' },
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/api/tasks/task-1/watch', {
      method: 'POST',
    });
  });
});
