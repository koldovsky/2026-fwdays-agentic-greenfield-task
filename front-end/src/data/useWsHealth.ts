import { useEffect, useRef, useState } from 'react';

export type WsHealth = 'connected' | 'reconnecting' | 'offline';

export interface UseWsHealthOptions {
  /** Injectable for tests. Defaults to `new WebSocket(new URL('/ws', window.location.href))`. */
  createWebSocket?: () => WebSocket;
  /** Baseline reconnect delay; doubles on each failed attempt up to `maxReconnectMs`. */
  minReconnectMs?: number;
  maxReconnectMs?: number;
  /** After this many consecutive failed attempts, transition to `offline`. */
  giveUpAfterAttempts?: number;
}

const DEFAULT_MIN_RECONNECT_MS = 1_000;
const DEFAULT_MAX_RECONNECT_MS = 30_000;
const DEFAULT_GIVE_UP_AFTER = 5;

/**
 * Tracks the health of a `/ws` connection independently of the data
 * hooks (`useDevices`, `useDeviceSession`, …). The chip on each screen
 * uses this to show "Live" / "Reconnecting…" / "Offline". A dedicated
 * connection keeps the health signal local to any screen that mounts
 * this hook; the pattern matches the "one WS per hook" architecture
 * the rest of the SPA already ships.
 */
export function useWsHealth(options: UseWsHealthOptions = {}): WsHealth {
  const [health, setHealth] = useState<WsHealth>('reconnecting');
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let reconnectDelay =
      optionsRef.current.minReconnectMs ?? DEFAULT_MIN_RECONNECT_MS;
    const maxReconnectMs =
      optionsRef.current.maxReconnectMs ?? DEFAULT_MAX_RECONNECT_MS;
    const giveUpAfter =
      optionsRef.current.giveUpAfterAttempts ?? DEFAULT_GIVE_UP_AFTER;
    const factory =
      optionsRef.current.createWebSocket ??
      (() => new WebSocket(new URL('/ws', window.location.href).toString()));

    function open(): void {
      if (cancelled) return;
      try {
        socket = factory();
      } catch (err) {
        console.warn('useWsHealth: WebSocket factory threw', err);
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        if (cancelled) return;
        attempts = 0;
        reconnectDelay =
          optionsRef.current.minReconnectMs ?? DEFAULT_MIN_RECONNECT_MS;
        setHealth('connected');
      };

      socket.onclose = () => {
        if (cancelled) return;
        scheduleReconnect();
      };

      socket.onerror = () => {
        if (cancelled) return;
        // `close` will fire right after — let it drive the reconnect.
      };
    }

    function scheduleReconnect(): void {
      if (cancelled || reconnectTimer) return;
      attempts += 1;
      if (attempts >= giveUpAfter) {
        setHealth('offline');
      } else {
        setHealth('reconnecting');
      }
      const delay = reconnectDelay;
      reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectMs);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        open();
      }, delay);
    }

    open();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        socket?.close();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return health;
}
