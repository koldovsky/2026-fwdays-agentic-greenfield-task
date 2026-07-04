import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDevices } from './useDevices.ts';
import type { Device, DevicesTopicMessage } from './types.ts';

/**
 * Minimal WebSocket stub: enough surface for `useDevices` to attach the
 * `open`, `message`, `close`, `error` listeners and for the test to drive
 * events with `stub.emit('...')`. Not a real `WebSocket` instance —
 * exposed as `unknown as WebSocket` to the hook.
 */
class StubWebSocket {
  private listeners = new Map<string, Set<(event: unknown) => void>>();
  sent: string[] = [];
  closed = false;
  addEventListener(type: string, listener: (event: unknown) => void): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.get(type)?.delete(listener);
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.closed = true;
    this.dispatch('close', {});
  }
  emit(type: 'open' | 'message' | 'close' | 'error', event: unknown): void {
    this.dispatch(type, event);
  }
  emitMessage(message: DevicesTopicMessage): void {
    this.dispatch('message', { data: JSON.stringify(message) });
  }
  private dispatch(type: string, event: unknown): void {
    for (const l of this.listeners.get(type) ?? []) l(event);
  }
}

function samsung(overrides: Partial<Device> = {}): Device {
  return {
    udn: 'samsung-1',
    name: 'Living Room',
    model: 'UN65KS8500',
    ip: '192.168.1.42',
    port: 9197,
    status: 'online',
    lastSeen: 1_000,
    ...overrides,
  };
}

describe('useDevices', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hydrates from WebSocket snapshot and applies added/offline deltas', async () => {
    const socket = new StubWebSocket();
    const { result } = renderHook(() =>
      useDevices({
        createWebSocket: () => socket as unknown as WebSocket,
        // Fetch shouldn't be called on the happy path. Fail loudly if it is.
        fetchDevices: () => Promise.reject(new Error('REST fetch should not run')),
        restFallbackMs: 10_000,
      }),
    );

    // Wait for the hook to attach listeners (effects run after the first
    // render, so the very first tick of state is `{ loading: true }`).
    await waitFor(() => {
      // No assertion yet — just gives React time to attach.
      expect(result.current.loading).toBe(true);
    });

    act(() => {
      socket.emit('open', {});
      socket.emitMessage({
        topic: 'devices',
        event: 'snapshot',
        devices: [samsung()],
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.devices).toHaveLength(1);
    });

    act(() => {
      socket.emitMessage({
        topic: 'devices',
        event: 'added',
        device: samsung({ udn: 'samsung-2', name: 'Bedroom' }),
      });
    });
    await waitFor(() => {
      expect(result.current.devices).toHaveLength(2);
      expect(result.current.devices[1]!.name).toBe('Bedroom');
    });

    act(() => {
      socket.emitMessage({
        topic: 'devices',
        event: 'offline',
        device: samsung(),
      });
    });
    await waitFor(() => {
      const living = result.current.devices.find((d) => d.udn === 'samsung-1');
      expect(living?.status).toBe('offline');
    });
  });

  it('falls back to REST if no WebSocket snapshot arrives within the fallback window', async () => {
    const socket = new StubWebSocket();
    let fetchCalls = 0;
    const fetchDevices = vi.fn(async () => {
      fetchCalls += 1;
      return [samsung({ udn: 'via-rest', name: 'Kitchen' })];
    });

    const { result } = renderHook(() =>
      useDevices({
        createWebSocket: () => socket as unknown as WebSocket,
        fetchDevices,
        restFallbackMs: 20,
      }),
    );

    await waitFor(() => {
      expect(fetchCalls).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.devices).toHaveLength(1);
      expect(result.current.devices[0]!.udn).toBe('via-rest');
    });
  });

  it('a late WebSocket snapshot overrides a REST-hydrated list', async () => {
    const socket = new StubWebSocket();
    const fetchDevices = vi.fn(async () => [
      samsung({ udn: 'via-rest' }),
    ]);

    const { result } = renderHook(() =>
      useDevices({
        createWebSocket: () => socket as unknown as WebSocket,
        fetchDevices,
        restFallbackMs: 5,
      }),
    );

    await waitFor(() => {
      expect(result.current.devices[0]?.udn).toBe('via-rest');
    });

    act(() => {
      socket.emitMessage({
        topic: 'devices',
        event: 'snapshot',
        devices: [samsung({ udn: 'via-ws' })],
      });
    });

    await waitFor(() => {
      expect(result.current.devices).toHaveLength(1);
      expect(result.current.devices[0]!.udn).toBe('via-ws');
    });
  });

  it('flips `offline` when the WebSocket closes', async () => {
    const socket = new StubWebSocket();
    const { result } = renderHook(() =>
      useDevices({
        createWebSocket: () => socket as unknown as WebSocket,
        fetchDevices: () => Promise.resolve([]),
        restFallbackMs: 10_000,
        minReconnectMs: 10_000,
      }),
    );

    act(() => {
      socket.emit('open', {});
    });

    act(() => {
      socket.emit('close', {});
    });

    await waitFor(() => {
      expect(result.current.offline).toBe(true);
    });
  });
});
