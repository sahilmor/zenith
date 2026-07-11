import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { projectKeys } from '@/features/projects/api/project-hooks';
import { workspaceKeys } from '@/features/workspaces/api/workspace-hooks';
import { RealtimeProvider } from './realtime-provider';

type Handler = (payload?: unknown) => void;

class FakeSocket {
  public readonly handlers = new Map<string, Handler[]>();
  public readonly emitted: { event: string; payload: unknown }[] = [];

  public connect() {
    this.emitServer('connect');
  }

  public disconnect() {
    this.emitServer('disconnect');
  }

  public on(event: string, handler: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
  }

  public emit(event: string, payload: unknown) {
    this.emitted.push({ event, payload });
  }

  public removeAllListeners() {
    this.handlers.clear();
  }

  public emitServer(event: string, payload?: unknown) {
    (this.handlers.get(event) ?? []).forEach((handler) => handler(payload));
  }
}

const authState = vi.hoisted(() => ({
  accessToken: 'access-token',
  user: { id: 'user-1' },
}));

const workspaceState = vi.hoisted(() => ({
  currentWorkspaceId: 'workspace-1',
}));

const socketState = vi.hoisted(() => ({
  socket: null as FakeSocket | null,
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('@/stores/workspace-store', () => ({
  useWorkspaceStore: (selector: (state: typeof workspaceState) => unknown) =>
    selector(workspaceState),
}));

vi.mock('./socket-client', () => ({
  createRealtimeSocket: () => {
    socketState.socket = new FakeSocket();
    return socketState.socket;
  },
}));

function wrapper(queryClient: QueryClient, children: ReactNode) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('RealtimeProvider', () => {
  beforeEach(() => {
    socketState.socket = null;
    authState.accessToken = 'access-token';
    authState.user = { id: 'user-1' };
    workspaceState.currentWorkspaceId = 'workspace-1';
  });

  it('joins the current workspace room after connecting', async () => {
    const queryClient = new QueryClient();
    render(wrapper(queryClient, <RealtimeProvider>Ready</RealtimeProvider>));

    await waitFor(() =>
      expect(socketState.socket?.emitted).toContainEqual({
        event: 'room:join',
        payload: { scope: 'workspace', id: 'workspace-1' },
      }),
    );
  });

  it('invalidates affected queries for incoming realtime events from other users', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(projectKeys.byWorkspace('workspace-1'), []);
    queryClient.setQueryData(workspaceKeys.detail('workspace-1'), { id: 'workspace-1' });
    render(wrapper(queryClient, <RealtimeProvider>Ready</RealtimeProvider>));

    await waitFor(() => expect(socketState.socket).not.toBeNull());
    socketState.socket?.emitServer('realtime:event', {
      id: 'event-1',
      resource: 'project',
      action: 'created',
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      actorId: 'user-2',
      timestamp: new Date().toISOString(),
    });

    await waitFor(() =>
      expect(queryClient.getQueryState(projectKeys.byWorkspace('workspace-1'))?.isInvalidated).toBe(
        true,
      ),
    );
    expect(queryClient.getQueryState(workspaceKeys.detail('workspace-1'))?.isInvalidated).toBe(
      true,
    );
  });
});
