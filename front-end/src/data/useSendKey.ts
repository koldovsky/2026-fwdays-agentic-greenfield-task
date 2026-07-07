import { useCallback } from 'react';
import { apiClient, ApiError } from '../api/client.ts';
import { messageFor } from '../errors/messages.ts';
import { useToast } from '../ui/useToast.ts';
import type { SamsungKeyCode } from './keys.ts';

export interface UseSendKeyResult {
  sendKey: (key: SamsungKeyCode) => Promise<void>;
}

export interface UseSendKeyOptions {
  /** Injectable for tests. Defaults to `apiClient.post`. */
  post?: (udn: string, key: SamsungKeyCode) => Promise<void>;
}

/**
 * `sendKey(key)` POSTs to `/api/devices/:udn/key` with `{ key }`. On
 * failure it pushes a toast via `useToast()` (mapped from the error's
 * domain `code` through `messageFor`), console-logs the raw envelope
 * for correlation, and re-throws — callers can still branch on the
 * error type if they need to (e.g. RemoteScreen swallows the throw
 * since the toast is enough user-facing signal).
 */
export function useSendKey(
  udn: string,
  options: UseSendKeyOptions = {},
): UseSendKeyResult {
  const { push } = useToast();
  const sendKey = useCallback(
    async (key: SamsungKeyCode) => {
      const post =
        options.post ??
        (async (u: string, k: SamsungKeyCode) => {
          await apiClient.post<void>(`/api/devices/${encodeURIComponent(u)}/key`, {
            key: k,
          });
        });
      try {
        await post(udn, key);
      } catch (err) {
        if (err instanceof ApiError) {
          console.warn('useSendKey: send failed', {
            udn,
            key,
            code: err.code,
            correlationId: err.correlationId,
          });
          push(messageFor(err));
        } else {
          console.warn('useSendKey: send failed (non-ApiError)', { udn, key, err });
          push({ tone: 'error', message: 'Something went wrong.' });
        }
        throw err;
      }
    },
    [udn, options.post, push],
  );
  return { sendKey };
}
