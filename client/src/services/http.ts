import { mockRequest } from './mockApi';
import { ApiError, type ApiErrorCode } from './apiError';

export { ApiError, messageFor } from './apiError';
export type { ApiErrorCode } from './apiError';

/**
 * The single place the client talks to the outside world.
 *
 * Phase 1 answers requests from an in-memory mock that speaks the exact shapes
 * the Express API will return, so switching to the real server in Phase 3 is a
 * change to one environment variable — not a rewrite.
 */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

export const AUTH_EXPIRED_EVENT = 'jj:auth-expired';

function codeForStatus(status: number): ApiErrorCode {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'not_found';
  if (status === 413) return 'too_large';
  if (status === 400 || status === 422) return 'validation';
  if (status === 503) return 'storage';
  return 'server';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

export function buildPath(path: string, query?: RequestOptions['query']): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options;
  const url = buildPath(path, query);

  if (USE_MOCK_API) {
    return mockRequest<T>(method, url, body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      // Session lives in an HTTP-only cookie; no token is ever readable by JS.
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the server.', 0, 'network');
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const code = codeForStatus(response.status);
    if (code === 'unauthorized') {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    const serverMessage =
      (payload && typeof payload === 'object'
        ? (() => {
            if ('message' in payload && typeof (payload as { message?: unknown }).message !== 'undefined') {
              return String((payload as { message: unknown }).message);
            }
            if ('error' in payload && typeof (payload as { error?: unknown }).error !== 'undefined') {
              return String((payload as { error: unknown }).error);
            }
            return null;
          })()
        : null) || 'Request failed.';
    throw new ApiError(serverMessage, response.status, code);
  }

  // The server wraps successful responses as { data: ... }.
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
