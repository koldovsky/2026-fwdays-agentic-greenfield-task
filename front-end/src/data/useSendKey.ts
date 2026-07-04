import { useCallback } from 'react';
import { apiClient, ApiError } from '../api/client.ts';
import type { SamsungKeyCode } from './keys.ts';

export interface UseSendKeyResult {
  sendKey: (key: SamsungKeyCode) => Promise<void>;
}

export interface UseSendKeyOptions {
  /** Injectable for tests. Defaults to `apiClient.post`. */
  post?: (udn: string, key: SamsungKeyCode) => Promise<void>;
}

/**
 * `sendKey(key)` POSTs to `/api/devices/:udn/key` with `{ key }`. Re-throws
 * `ApiError` on failure and console-logs. Toast/banner surfacing arrives
 * with the `error-surfacing` capability — for now failures are silent to
 * the user beyond the button not visibly committing.
 */
export function useSendKey(
  udn: string,
  options: UseSendKeyOptions = {},
): UseSendKeyResult {
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
        } else {
          console.warn('useSendKey: send failed (non-ApiError)', { udn, key, err });
        }
        throw err;
      }
    },
    [udn, options.post],
  );
  return { sendKey };
}
