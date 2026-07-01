import type { AuthTokens } from '@honeydo/shared';
import { API_URL } from '../config';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '../auth/tokenStore';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Called when the session can't be recovered (refresh failed) so the app can route
// back to auth (FR-AUTH-06). Registered by the AuthProvider.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  const tokens = (await res.json()) as AuthTokens;
  await saveTokens(tokens);
  return true;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    const msg = body.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  } catch {
    // non-JSON body
  }
  return `Request failed (${res.status})`;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Attach the access token and refresh on 401 (default true). */
  auth?: boolean;
}

/** JSON request helper with bearer auth and one transparent refresh-and-retry on 401. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) {
      const accessToken = await getAccessToken();
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    }
    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let res = await send();

  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await send();
    }
    if (!refreshed || res.status === 401) {
      await clearTokens();
      onUnauthorized?.();
      throw new ApiError(401, 'Your session has expired. Please sign in again.');
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
