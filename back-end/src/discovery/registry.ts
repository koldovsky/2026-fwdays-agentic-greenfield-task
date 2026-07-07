import { EventEmitter } from 'node:events';

export interface Device {
  udn: string;
  name: string;
  model: string | null;
  ip: string;
  port: number;
  status: 'online' | 'offline';
  lastSeen: number;
}

export type RegistryEvent = 'added' | 'updated' | 'removed' | 'offline';

export interface RegistryUpsertInput {
  udn: string;
  name: string;
  model: string | null;
  ip: string;
  port: number;
}

export interface DeviceRegistry {
  /**
   * Idempotent write. Returns the device (existing or new). Returns
   * `undefined` when the input was dropped by the IP-based dedup guard
   * (see `openspec/specs/upnp-tv-discovery/spec.md` "IP-based device
   * dedup"): a single physical Samsung TV publishes multiple UPnP root
   * devices under distinct UDNs, and the SPA's device list must show
   * exactly one row per IP.
   */
  upsert(input: RegistryUpsertInput, now?: number): Device | undefined;
  snapshot(): Device[];
  markOfflineOlderThan(thresholdMs: number, now?: number): Device[];
  on(event: RegistryEvent, listener: (device: Device) => void): this;
  off(event: RegistryEvent, listener: (device: Device) => void): this;
}

/**
 * In-memory device registry keyed by UDN. Emits `added`, `updated`,
 * `removed`, `offline` events for the WebSocket broker to fan out.
 *
 * `removed` is exposed on the interface for schema completeness — MVP
 * keeps offline devices in the registry (spec: "Offline devices SHALL
 * remain in the registry so users can see previously-known TVs"), so
 * `removed` is not emitted by the built-in sweep.
 */
export function createDeviceRegistry(): DeviceRegistry {
  const devices = new Map<string, Device>();
  const emitter = new EventEmitter();

  function upsert(input: RegistryUpsertInput, now = Date.now()): Device | undefined {
    const existing = devices.get(input.udn);
    if (!existing) {
      // IP-based dedup: a fresh UDN cannot land on an IP that already
      // holds a different online UDN. Same-UDN updates are unaffected —
      // they take the `existing` branch below.
      for (const [otherUdn, other] of devices) {
        if (otherUdn === input.udn) continue;
        if (other.status !== 'online') continue;
        if (other.ip === input.ip) return undefined;
      }
    }
    const next: Device = {
      udn: input.udn,
      name: input.name,
      model: input.model,
      ip: input.ip,
      port: input.port,
      status: 'online',
      lastSeen: now,
    };
    devices.set(input.udn, next);
    if (!existing) {
      emitter.emit('added', next);
    } else {
      emitter.emit('updated', next);
    }
    return next;
  }

  function snapshot(): Device[] {
    return Array.from(devices.values());
  }

  function markOfflineOlderThan(
    thresholdMs: number,
    now = Date.now(),
  ): Device[] {
    const cutoff = now - thresholdMs;
    const flipped: Device[] = [];
    for (const [udn, device] of devices) {
      if (device.status !== 'online') continue;
      if (device.lastSeen >= cutoff) continue;
      const next: Device = { ...device, status: 'offline' };
      devices.set(udn, next);
      flipped.push(next);
      emitter.emit('offline', next);
    }
    return flipped;
  }

  return Object.assign(emitter, {
    upsert,
    snapshot,
    markOfflineOlderThan,
  }) as DeviceRegistry;
}
