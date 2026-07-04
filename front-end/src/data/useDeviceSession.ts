import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client.ts';

/**
 * Client-visible session states — mirrors `back-end/src/tv/types.ts`
 * `ClientSessionState`. `Reconnecting` collapses to `Connecting` on the
 * back-end side, so it never appears here.
 */
export type ClientSessionState =
  | 'Disconnected'
  | 'Connecting'
  | 'Connected'
  | 'Offline';

export interface UseDeviceSessionResult {
  state: ClientSessionState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

interface WsSessionMessage {
  topic: 'devices';
  event: 'session';
  udn: string;
  state: ClientSessionState;
}

export interface UseDeviceSessionOptions {
  /** Injectable for tests. Defaults to `new WebSocket(new URL('/ws', window.location.href))`. */
  createWebSocket?: () => WebSocket;
  /** Injectable for tests. Defaults to `apiClient.get<{state}>('/api/devices/:udn/session')`. */
  fetchInitial?: (udn: string) => Promise<ClientSessionState>;
  postConnect?: (udn: string) => Promise<void>;
  postDisconnect?: (udn: string) => Promise<void>;
}

/**
 * Subscribes to the `/ws` `devices` topic's `session` events for a
 * specific UDN, plus a one-off `GET /api/devices/:udn/session` on mount
 * so state hydrates even if the WebSocket is slow.
 *
 * Returns `state`, `connect()`, `disconnect()` — the last two POST to
 * the back-end. `state` never carries `Reconnecting`; the back-end
 * collapses it to `Connecting`.
 */
export function useDeviceSession(
  udn: string,
  options: UseDeviceSessionOptions = {},
): UseDeviceSessionResult {
  const [state, setState] = useState<ClientSessionState>('Disconnected');
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
        const body = await apiClient.get<{ state: ClientSessionState }>(
          `/api/devices/${encodeURIComponent(u)}/session`,
        );
        return body.state;
      });

    void (async () => {
      try {
        const initial = await fetchInitial(udn);
        if (!cancelled) setState(initial);
      } catch {
        /* leave state at Disconnected until the WS fills it in */
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
      const message = parsed as Partial<WsSessionMessage>;
      if (
        message?.topic === 'devices' &&
        message.event === 'session' &&
        message.udn === udn &&
        typeof message.state === 'string'
      ) {
        setState(message.state);
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

  const connect = useCallback(async () => {
    const post =
      optionsRef.current.postConnect ??
      (async (u: string) => {
        await apiClient.post<{ state: ClientSessionState }>(
          `/api/devices/${encodeURIComponent(u)}/connect`,
        );
      });
    await post(udn);
  }, [udn]);

  const disconnect = useCallback(async () => {
    const post =
      optionsRef.current.postDisconnect ??
      (async (u: string) => {
        await apiClient.post<{ state: ClientSessionState }>(
          `/api/devices/${encodeURIComponent(u)}/disconnect`,
        );
      });
    await post(udn);
  }, [udn]);

  return { state, connect, disconnect };
}
