import { useCallback, useRef, useState } from 'react';
import { apiClient, ApiError } from '../api/client.ts';
import { messageFor } from '../errors/messages.ts';
import { useToast } from '../ui/useToast.ts';

export interface UseBrowserLaunchResult {
  /**
   * POSTs `{ url }` to `/api/devices/:udn/browser`. On resolved success
   * the caller can clear its input; on failure the shared C9 toast has
   * already fired and the promise rejects with the original `ApiError`.
   */
  launch: (url: string) => Promise<void>;
  isPending: boolean;
}

export interface UseBrowserLaunchOptions {
  postLaunch?: (udn: string, url: string) => Promise<void>;
}

/**
 * Fires `POST /api/devices/:udn/browser { url }` for the given UDN.
 * Errors are mapped through the shared error-surfacing toast pattern
 * owned by C9 — the caller does not need to render its own error
 * copy. `isPending` guards the calling UI against duplicate submits
 * while a launch is in flight.
 */
export function useBrowserLaunch(
  udn: string,
  options: UseBrowserLaunchOptions = {},
): UseBrowserLaunchResult {
  const [isPending, setIsPending] = useState(false);
  const { push } = useToast();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const launch = useCallback(
    async (url: string) => {
      const post =
        optionsRef.current.postLaunch ??
        (async (u: string, target: string) => {
          await apiClient.post<void>(
            `/api/devices/${encodeURIComponent(u)}/browser`,
            { url: target },
          );
        });
      setIsPending(true);
      try {
        await post(udn, url);
      } catch (err) {
        if (err instanceof ApiError) {
          console.warn('useBrowserLaunch: launch failed', {
            udn,
            code: err.code,
            correlationId: err.correlationId,
          });
          push(messageFor(err));
        } else {
          console.warn('useBrowserLaunch: launch failed (non-ApiError)', { udn, err });
          push({ tone: 'error', message: 'Something went wrong.' });
        }
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [udn, push],
  );

  return { launch, isPending };
}
