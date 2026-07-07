import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient, ApiError } from '../api/client.ts';
import { messageFor } from '../errors/messages.ts';
import { useToast } from '../ui/useToast.ts';
import type { InputCatalogueEntry, SamsungInputKey } from './inputs.ts';

export interface UseInputsResult {
  inputs: readonly InputCatalogueEntry[];
  /**
   * POSTs `/api/devices/:udn/input { key }`. Re-throws `ApiError` on
   * failure. There is no `activeId` — Smart View can't report the
   * TV's active input; the on-screen picker doesn't show a checkmark.
   */
  setInput: (key: SamsungInputKey) => Promise<void>;
}

export interface UseInputsOptions {
  fetchInputs?: (udn: string) => Promise<readonly InputCatalogueEntry[]>;
  postSetInput?: (udn: string, key: SamsungInputKey) => Promise<void>;
}

/**
 * On mount, `GET /api/devices/:udn/inputs` populates `inputs`. Because
 * the catalogue is a static back-end constant, the initial fetch is
 * effectively a catalogue-drift check — if the front-end mirror in
 * `data/inputs.ts` disagrees with the server, the server wins.
 *
 * `setInput(key)` fires `POST /api/devices/:udn/input { key }`.
 * Re-throws `ApiError` on failure and console-logs. User-facing
 * surfacing lives in `error-surfacing` (C9).
 */
export function useInputs(
  udn: string,
  options: UseInputsOptions = {},
): UseInputsResult {
  const [inputs, setInputs] = useState<readonly InputCatalogueEntry[]>([]);
  const { push } = useToast();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let cancelled = false;
    const fetchInputs =
      optionsRef.current.fetchInputs ??
      (async (u: string) => {
        const body = await apiClient.get<{ inputs: InputCatalogueEntry[] }>(
          `/api/devices/${encodeURIComponent(u)}/inputs`,
        );
        return body.inputs;
      });
    void (async () => {
      try {
        const list = await fetchInputs(udn);
        if (!cancelled) setInputs(list);
      } catch {
        /* Leave inputs empty — the modal opens with no rows and the user
         * can retry by closing/reopening. Toast lives in error-surfacing. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [udn]);

  const setInput = useCallback(
    async (key: SamsungInputKey) => {
      const post =
        optionsRef.current.postSetInput ??
        (async (u: string, k: SamsungInputKey) => {
          await apiClient.post<void>(
            `/api/devices/${encodeURIComponent(u)}/input`,
            { key: k },
          );
        });
      try {
        await post(udn, key);
      } catch (err) {
        if (err instanceof ApiError) {
          console.warn('useInputs: setInput failed', {
            udn,
            key,
            code: err.code,
            correlationId: err.correlationId,
          });
          push(messageFor(err));
        } else {
          console.warn('useInputs: setInput failed (non-ApiError)', { udn, key, err });
          push({ tone: 'error', message: 'Something went wrong.' });
        }
        throw err;
      }
    },
    [udn, push],
  );

  return { inputs, setInput };
}
