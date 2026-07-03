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
  body?: unknown;
  skipAuthRefresh?: boolean;
}

const buildHeaders = (options: RequestOptions): Headers => {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body !== undefined)
    headers.set('Content-Type', 'application/json');
  const token = useAuthStore.getState().accessToken;
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  return headers;
};

const refreshSession = async (): Promise<boolean> => {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return false;
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return false;
  const envelope = (await response.json()) as ApiEnvelope<AuthPayload>;
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
    if (body !== undefined) init.body = JSON.stringify(body);
    return fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, init);
  };

  let response = await execute();
  if (response.status === 401 && !options.skipAuthRefresh && (await refreshSession()))
    response = await execute();

  const envelope = (await response.json()) as ApiEnvelope<TData>;
  if (!response.ok || !envelope.success || envelope.data === null) {
    throw new ApiError({
      message: envelope.message || 'Request failed',
      status: response.status,
      errors: envelope.errors,
    });
  }
  return envelope.data;
};

export const apiMutation = <TData, TVariables>(path: string, body: TVariables): Promise<TData> =>
  apiRequest<TData>(path, { method: 'POST', body });
