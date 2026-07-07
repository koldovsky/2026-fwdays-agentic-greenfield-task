import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient, ApiError } from '../api/client.ts';
import { messageFor } from '../errors/messages.ts';
import { useToast } from '../ui/useToast.ts';

/**
 * Client-visible volume state — mirrors `back-end/src/tv/volume.ts`
 * `VolumeState`. `level` is always `null` on Smart View (see the
 * `volume-control` change's design.md D1/D2); consumers treat the
 * slider as write-only.
 */
export interface ClientVolumeState {
  level: null;
  muted: boolean;
}

export interface UseVolumeResult {
  level: null;
  muted: boolean;
  /** Fire N `KEY_VOLUP` (positive) or `KEY_VOLDOWN` (negative) frames. */
  delta: (steps: number) => Promise<void>;
  toggleMute: () => Promise<void>;
}

interface WsVolumeMessage {
  topic: 'devices';
  event: 'volume';
  udn: string;
  level: null;
  muted: boolean;
}

export interface UseVolumeOptions {
  createWebSocket?: () => WebSocket;
  fetchInitial?: (udn: string) => Promise<ClientVolumeState>;
  postDelta?: (udn: string, steps: number) => Promise<void>;
  postToggleMute?: (udn: string) => Promise<void>;
}

/**
 * Subscribes to the `/ws` `devices` topic's `volume` events for a
 * specific UDN, plus a one-off `GET /api/devices/:udn/volume` on mount.
 * `delta(steps)` POSTs to `/volume/delta`; `toggleMute()` POSTs to
 * `/mute` and optimistically inverts local `muted` (the server does the
 * same on its side — a WebSocket push arrives shortly to confirm).
 */
export function useVolume(
  udn: string,
  options: UseVolumeOptions = {},
): UseVolumeResult {
  const [muted, setMuted] = useState(false);
  const { push } = useToast();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let cancelled = false;
    const factory =
      optionsRef.current.createWebSocket ??
      (() => new WebSocket(new URL('/ws', window.location.href).toString()));
    const fetchInitial =
      optionsRef.current.fetchInitial ??
      (async (u: string) => {
        const body = await apiClient.get<ClientVolumeState>(
          `/api/devices/${encodeURIComponent(u)}/volume`,
        );
        return body;
      });

    void (async () => {
      try {
        const initial = await fetchInitial(udn);
        if (!cancelled) setMuted(initial.muted);
      } catch {
        /* leave state at { muted: false } until the WS fills it in */
      }
    })();

    let socket: WebSocket | null = null;
    try {
      socket = factory();
    } catch {
      return () => {
        cancelled = true;
      };
    }

    const onMessage = (event: MessageEvent): void => {
      if (cancelled) return;
      const raw = typeof event.data === 'string' ? event.data : '';
      if (!raw) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }
      const message = parsed as Partial<WsVolumeMessage>;
      if (
        message?.topic === 'devices' &&
        message.event === 'volume' &&
        message.udn === udn &&
        typeof message.muted === 'boolean'
      ) {
        setMuted(message.muted);
      }
    };
    socket.addEventListener('message', onMessage);

    return () => {
      cancelled = true;
      socket?.removeEventListener('message', onMessage);
      try {
        socket?.close();
      } catch {
        /* ignore */
      }
    };
  }, [udn]);

  const delta = useCallback(
    async (steps: number) => {
      const post =
        optionsRef.current.postDelta ??
        (async (u: string, s: number) => {
          await apiClient.post<void>(
            `/api/devices/${encodeURIComponent(u)}/volume/delta`,
            { delta: s },
          );
        });
      try {
        await post(udn, steps);
      } catch (err) {
        if (err instanceof ApiError) {
          console.warn('useVolume: delta failed', {
            udn,
            steps,
            code: err.code,
            correlationId: err.correlationId,
          });
          push(messageFor(err));
        } else {
          console.warn('useVolume: delta failed (non-ApiError)', { udn, steps, err });
          push({ tone: 'error', message: 'Something went wrong.' });
        }
        throw err;
      }
    },
    [udn, push],
  );

  const toggleMute = useCallback(async () => {
    // Optimistic flip — matches the server-side optimistic tracker so the
    // WS confirmation lands on the same value we already show.
    setMuted((m) => !m);
    const post =
      optionsRef.current.postToggleMute ??
      (async (u: string) => {
        await apiClient.post<void>(`/api/devices/${encodeURIComponent(u)}/mute`);
      });
    try {
      await post(udn);
    } catch (err) {
      // Roll back the optimistic flip since the toggle failed.
      setMuted((m) => !m);
      if (err instanceof ApiError) {
        console.warn('useVolume: mute failed', {
          udn,
          code: err.code,
          correlationId: err.correlationId,
        });
        push(messageFor(err));
      } else {
        console.warn('useVolume: mute failed (non-ApiError)', { udn, err });
        push({ tone: 'error', message: 'Something went wrong.' });
      }
      throw err;
    }
  }, [udn, push]);

  return { level: null, muted, delta, toggleMute };
}
