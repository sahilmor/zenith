import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, apiUploadRequest } from './client';

const authState = vi.hoisted(() => ({
  accessToken: null as string | null,
  refreshToken: null as string | null,
  setSession: vi.fn(),
  clearSession: vi.fn(),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => authState,
  },
}));

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

describe('apiRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authState.accessToken = null;
    authState.refreshToken = null;
    authState.setSession.mockClear();
    authState.clearSession.mockClear();
  });

  it('treats successful null-data responses as success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          success: true,
          message: 'Deleted',
          data: null,
          errors: null,
          timestamp: new Date().toISOString(),
        }),
      ),
    );

    await expect(
      apiRequest<null>('/api/attachments/attachment-1', { method: 'DELETE' }),
    ).resolves.toBeNull();
  });

  it('does not set JSON content type for FormData uploads', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        success: true,
        message: 'Uploaded',
        data: { id: 'attachment-1' },
        errors: null,
        timestamp: new Date().toISOString(),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const body = new FormData();
    body.append('file', new File(['pdf'], 'spec.pdf', { type: 'application/pdf' }));

    await apiRequest('/api/tasks/task-1/attachments', { method: 'POST', body });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).has('Content-Type')).toBe(false);
    expect(init.body).toBe(body);
  });

  it('refreshes the session and retries XMLHttpRequest uploads after a 401', async () => {
    class MockXMLHttpRequest {
      public static responses: { readonly status: number; readonly body: unknown }[] = [];
      public static instances: MockXMLHttpRequest[] = [];
      public readonly headers = new Map<string, string>();
      public readonly upload: { onprogress?: (event: ProgressEvent) => void } = {};
      public status = 0;
      public responseText = '';
      public statusText = '';
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;

      public constructor() {
        MockXMLHttpRequest.instances.push(this);
      }

      public open(): void {
        this.statusText = '';
      }

      public setRequestHeader(key: string, value: string): void {
        this.headers.set(key, value);
      }

      public getResponseHeader(key: string): string | null {
        return key.toLowerCase() === 'content-type' ? 'application/json' : null;
      }

      public send(): void {
        const response = MockXMLHttpRequest.responses.shift();
        if (!response) {
          this.onerror?.();
          return;
        }
        this.status = response.status;
        this.responseText = JSON.stringify(response.body);
        this.onload?.();
      }
    }

    authState.accessToken = 'expired-token';
    authState.refreshToken = 'refresh-token';
    authState.setSession.mockImplementation((payload: { accessToken: string }) => {
      authState.accessToken = payload.accessToken;
    });
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          success: true,
          message: 'Token refreshed',
          data: {
            accessToken: 'fresh-token',
            refreshToken: 'new-refresh-token',
            user: { id: 'user-1', email: 'user@example.com', name: 'User' },
          },
          errors: null,
          timestamp: new Date().toISOString(),
        }),
      ),
    );
    MockXMLHttpRequest.responses = [
      {
        status: 401,
        body: {
          success: false,
          message: 'Unauthorized',
          data: null,
          errors: null,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 201,
        body: {
          success: true,
          message: 'Uploaded',
          data: { id: 'attachment-1' },
          errors: null,
          timestamp: new Date().toISOString(),
        },
      },
    ];

    const body = new FormData();
    body.append('file', new File(['pdf'], 'spec.pdf', { type: 'application/pdf' }));

    await expect(apiUploadRequest('/api/tasks/task-1/attachments', { body })).resolves.toEqual({
      id: 'attachment-1',
    });
    expect(authState.setSession).toHaveBeenCalledTimes(1);
    expect(MockXMLHttpRequest.instances).toHaveLength(2);
    expect(MockXMLHttpRequest.instances[0]?.headers.get('authorization')).toBe(
      'Bearer expired-token',
    );
    expect(MockXMLHttpRequest.instances[1]?.headers.get('authorization')).toBe(
      'Bearer fresh-token',
    );
  });
});
