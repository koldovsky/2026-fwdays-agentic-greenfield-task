import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client.ts';
import type { Device, DevicesTopicMessage } from './types.ts';

export interface UseDevicesResult {
  devices: Device[];
  loading: boolean;
  /** True when the WebSocket is currently disconnected. */
  offline: boolean;
}

export interface UseDevicesOptions {
  /** Injectable for tests. Defaults to `new WebSocket(new URL('/ws', window.location.href))`. */
  createWebSocket?: () => WebSocket;
  /** Injectable for tests. Defaults to `apiClient.get<Device[]>('/api/devices')`. */
  fetchDevices?: () => Promise<Device[]>;
  restFallbackMs?: number;
  minReconnectMs?: number;
  maxReconnectMs?: number;
}

const DEFAULT_REST_FALLBACK_MS = 500;
const DEFAULT_MIN_RECONNECT_MS = 1_000;
const DEFAULT_MAX_RECONNECT_MS = 30_000;

/**
 * WebSocket-first, REST-fallback subscription to the back-end device
 * registry. Design lives in `openspec/changes/device-list-ui/design.md`
 * D1. The `snapshot` event replaces the entire list; `added` / `updated`
 * / `removed` / `offline` are applied in place. A REST snapshot only
 * hydrates the list if no WebSocket snapshot has arrived yet — a late
 * WebSocket snapshot always wins.
 */
export function useDevices(options: UseDevicesOptions = {}): UseDevicesResult {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  // Refs keep the "snapshot won" flag stable across renders without
  // triggering re-renders of their own.
  const snapshotReceivedRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let restTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay =
      optionsRef.current.minReconnectMs ?? DEFAULT_MIN_RECONNECT_MS;
    const maxReconnectMs =
      optionsRef.current.maxReconnectMs ?? DEFAULT_MAX_RECONNECT_MS;
    const restFallbackMs =
      optionsRef.current.restFallbackMs ?? DEFAULT_REST_FALLBACK_MS;

    function applyMessage(message: DevicesTopicMessage): void {
      if (message.topic !== 'devices') return;
      switch (message.event) {
        case 'snapshot': {
          snapshotReceivedRef.current = true;
          if (cancelled) return;
          setDevices(message.devices ?? []);
          setLoading(false);
          break;
        }
        case 'added':
        case 'updated': {
          if (!message.device) break;
          const incoming = message.device;
          setDevices((prev) => {
            const idx = prev.findIndex((d) => d.udn === incoming.udn);
            if (idx < 0) return [...prev, incoming];
            const next = prev.slice();
            next[idx] = incoming;
            return next;
          });
          break;
        }
        case 'removed': {
          if (!message.device) break;
          const removed = message.device;
          setDevices((prev) => prev.filter((d) => d.udn !== removed.udn));
          break;
        }
        case 'offline': {
          if (!message.device) break;
          const off = message.device;
          setDevices((prev) => {
            const idx = prev.findIndex((d) => d.udn === off.udn);
            if (idx < 0) return prev;
            const next = prev.slice();
            next[idx] = { ...next[idx]!, status: 'offline' };
            return next;
          });
          break;
        }
      }
    }

    async function tryRestFallback(): Promise<void> {
      if (snapshotReceivedRef.current || cancelled) return;
      const fetchDevices =
        optionsRef.current.fetchDevices ??
        (() => apiClient.get<Device[]>('/api/devices'));
      try {
        const list = await fetchDevices();
        if (cancelled || snapshotReceivedRef.current) return;
        setDevices(list);
        setLoading(false);
      } catch (err) {
        // Silent — a healthy WebSocket is the primary path; REST here
        // is only a hydration hint. `error-surfacing` owns the user
        // signal for total-loss cases.
        console.warn('useDevices: REST fallback failed', err);
      }
    }

    function connect(): void {
      const factory =
        optionsRef.current.createWebSocket ??
        (() =>
          new WebSocket(new URL('/ws', window.location.href).toString()));

      try {
        socket = factory();
      } catch (err) {
        console.warn('useDevices: WebSocket factory threw; scheduling reconnect', err);
        scheduleReconnect();
        return;
      }

      socket.addEventListener('open', () => {
        if (cancelled) return;
        reconnectDelay =
          optionsRef.current.minReconnectMs ?? DEFAULT_MIN_RECONNECT_MS;
        setOffline(false);
      });

      socket.addEventListener('message', (event: MessageEvent) => {
        if (cancelled) return;
        const raw = typeof event.data === 'string' ? event.data : '';
        if (!raw) return;
        let parsed: DevicesTopicMessage | null = null;
        try {
          parsed = JSON.parse(raw) as DevicesTopicMessage;
        } catch {
          return;
        }
        if (parsed) applyMessage(parsed);
      });

      socket.addEventListener('close', () => {
        if (cancelled) return;
        setOffline(true);
        scheduleReconnect();
      });

      socket.addEventListener('error', () => {
        // Let `close` handle the reconnect — browsers fire both.
      });
    }

    function scheduleReconnect(): void {
      if (cancelled || reconnectTimer) return;
      const delay = reconnectDelay;
      reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectMs);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (cancelled) return;
        connect();
      }, delay);
    }

    connect();
    restTimer = setTimeout(tryRestFallback, restFallbackMs);

    return () => {
      cancelled = true;
      if (restTimer) clearTimeout(restTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        try {
          socket.close();
        } catch {
          /* ignore — socket may not be open yet */
        }
      }
    };
    // Only re-run on mount/unmount. Injected fns come through `optionsRef`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { devices, loading, offline };
}
