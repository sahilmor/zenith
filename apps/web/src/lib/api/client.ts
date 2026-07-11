import { env } from '@/lib/env';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiEnvelope, ApiErrorDetails, AuthPayload } from './types';

export class ApiError extends Error {
  public readonly status: number;
  public readonly errors: unknown[] | null;

  public constructor(details: ApiErrorDetails) {
    super(details.message);
    this.status = details.status;
    this.errors = details.errors;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | unknown;
  skipAuthRefresh?: boolean;
}

interface UploadRequestOptions {
  readonly body: FormData;
  readonly method?: 'POST' | 'PATCH' | 'PUT';
  readonly onProgress?: (progress: number) => void;
}

interface StreamRequestOptions {
  readonly body?: unknown;
  readonly signal?: AbortSignal;
  readonly onEvent: (event: Record<string, unknown>) => void;
}

const apiBaseUrl = env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');

const buildApiUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
};

const isFormDataBody = (body: unknown): body is FormData =>
  typeof FormData !== 'undefined' && body instanceof FormData;

const parseEnvelope = async <TData>(response: Response): Promise<ApiEnvelope<TData>> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const message = (await response.text()) || response.statusText || 'Request failed';
    return {
      success: response.ok,
      message,
      data: null,
      errors: null,
      timestamp: new Date().toISOString(),
    };
  }
  return (await response.json()) as ApiEnvelope<TData>;
};

const buildHeaders = (options: RequestOptions): Headers => {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body !== undefined && !isFormDataBody(options.body))
    headers.set('Content-Type', 'application/json');
  const token = useAuthStore.getState().accessToken;
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  return headers;
};

const refreshSession = async (): Promise<boolean> => {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return false;
  const response = await fetch(buildApiUrl('/api/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return false;
  const envelope = await parseEnvelope<AuthPayload>(response);
  if (!envelope.success || !envelope.data) return false;
  useAuthStore.getState().setSession(envelope.data);
  return true;
};

export const apiRequest = async <TData>(
  path: string,
  options: RequestOptions = {},
): Promise<TData> => {
  const execute = async (): Promise<Response> => {
    const { body, skipAuthRefresh, ...requestOptions } = options;
    void skipAuthRefresh;
    const init: RequestInit = {
      ...requestOptions,
      credentials: 'include',
      headers: buildHeaders(options),
    };
    if (isFormDataBody(body)) init.body = body;
    else if (body !== undefined) init.body = JSON.stringify(body);
    return fetch(buildApiUrl(path), init);
  };

  let response = await execute();
  if (response.status === 401 && !options.skipAuthRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) response = await execute();
    else useAuthStore.getState().clearSession();
  }

  const envelope = await parseEnvelope<TData>(response);
  if (!response.ok || !envelope.success) {
    throw new ApiError({
      message: envelope.message || 'Request failed',
      status: response.status,
      errors: envelope.errors,
    });
  }
  return envelope.data as TData;
};

export const apiMutation = <TData, TVariables>(path: string, body: TVariables): Promise<TData> =>
  apiRequest<TData>(path, { method: 'POST', body });

export interface ApiDownload {
  readonly blob: Blob;
  readonly fileName: string;
}

export const apiDownloadRequest = async (path: string): Promise<ApiDownload> => {
  const response = await fetch(buildApiUrl(path), {
    method: 'GET',
    credentials: 'include',
    headers: buildHeaders({}),
  });
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) return apiDownloadRequest(path);
    useAuthStore.getState().clearSession();
  }
  if (!response.ok) {
    const envelope = await parseEnvelope<unknown>(response);
    throw new ApiError({
      message: envelope.message || 'Download failed',
      status: response.status,
      errors: envelope.errors,
    });
  }
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = /filename="([^"]+)"/.exec(disposition);
  return {
    blob: await response.blob(),
    fileName: match?.[1] ?? 'zenith-report',
  };
};

export const apiStreamRequest = async (
  path: string,
  options: StreamRequestOptions,
): Promise<void> => {
  const init: RequestInit = {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders({ body: options.body }),
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  if (options.signal) init.signal = options.signal;
  const response = await fetch(buildApiUrl(path), init);
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) return apiStreamRequest(path, options);
    useAuthStore.getState().clearSession();
  }
  if (!response.ok || !response.body) {
    const envelope = await parseEnvelope<unknown>(response);
    throw new ApiError({
      message: envelope.message || 'Stream request failed',
      status: response.status,
      errors: envelope.errors,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    chunks.forEach((chunk) => {
      const line = chunk
        .split('\n')
        .find((item) => item.startsWith('data: '))
        ?.slice(6);
      if (!line || line === '[DONE]') return;
      options.onEvent(JSON.parse(line) as Record<string, unknown>);
    });
  }
};

export const apiUploadRequest = async <TData>(
  path: string,
  options: UploadRequestOptions,
): Promise<TData> =>
  new Promise((resolve, reject) => {
    let retried = false;
    const send = () => {
      const request = new XMLHttpRequest();
      request.open(options.method ?? 'POST', buildApiUrl(path));
      buildHeaders({ body: options.body }).forEach((value, key) =>
        request.setRequestHeader(key, value),
      );
      request.withCredentials = true;
      request.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        options.onProgress?.((event.loaded / event.total) * 100);
      };
      request.onload = () => {
        const handleLoad = async () => {
          if (request.status === 401 && !retried) {
            retried = true;
            const refreshed = await refreshSession();
            if (refreshed) {
              send();
              return;
            }
            useAuthStore.getState().clearSession();
          }
          const contentType = request.getResponseHeader('content-type') ?? '';
          const fallback: ApiEnvelope<TData> = {
            success: request.status >= 200 && request.status < 300,
            message: request.responseText || request.statusText || 'Request failed',
            data: null,
            errors: null,
            timestamp: new Date().toISOString(),
          };
          const envelope = contentType.includes('application/json')
            ? (JSON.parse(request.responseText) as ApiEnvelope<TData>)
            : fallback;
          if (request.status < 200 || request.status >= 300 || !envelope.success) {
            reject(
              new ApiError({
                message: envelope.message || 'Request failed',
                status: request.status,
                errors: envelope.errors,
              }),
            );
            return;
          }
          resolve(envelope.data as TData);
        };
        handleLoad().catch(() => {
          reject(new ApiError({ message: 'Upload request failed', status: 0, errors: null }));
        });
      };
      request.onerror = () =>
        reject(new ApiError({ message: 'Network request failed', status: 0, errors: null }));
      request.send(options.body);
    };
    send();
  });
