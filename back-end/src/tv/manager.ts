import { EventEmitter } from 'node:events';
import type { Device, DeviceRegistry } from '../discovery/registry.js';
import type { JsonRpcLogger, JsonRpcTransport } from './jsonrpc.js';
import { createSession, type Session, type SessionOptions } from './session.js';
import type { TokenStore } from './token-store.js';
import type { SessionState } from './types.js';

/**
 * Samsung Smart View control port for Tizen TVs from 2016 onward (the
 * target hardware family). Not derived from year/model — the failure
 * mode of guessing wrong (connect timeout) is worse than a constant with
 * an env escape hatch. `device.port` from the UPnP description is the
 * *description* port, not the control port, and is deliberately ignored
 * here. See design.md D3.
 */
const SMART_VIEW_PORT = 8001;

function resolveControlPort(udn: string): number {
  const override = process.env[`MYTV_CONTROL_PORT_${udn}`];
  return override ? Number(override) : SMART_VIEW_PORT;
}

export interface SessionSnapshot {
  udn: string;
  state: SessionState;
}

export interface SessionManager {
  ensure(udn: string): Session | undefined;
  get(udn: string): Session | undefined;
  snapshot(): SessionSnapshot[];
  on(event: 'state', listener: (snapshot: SessionSnapshot) => void): this;
  off(event: 'state', listener: (snapshot: SessionSnapshot) => void): this;
  close(): Promise<void>;
}

export interface SessionManagerOptions {
  registry: DeviceRegistry;
  tokenStore: TokenStore;
  logger: JsonRpcLogger;
  createTransport?: SessionOptions['createTransport'];
  sessionOptions?: Partial<Omit<SessionOptions, 'udn' | 'ip' | 'port' | 'logger' | 'tokenStore' | 'createTransport'>>;
}

/**
 * Owns the `Map<UDN, Session>` and mediates the discovery↔session
 * lifecycle. `offline` in the registry tears the session down and flips
 * it to `Offline`; `updated` on a UDN in `Offline` flips it back to
 * `Disconnected` (spec: "no automatic reconnect fires — the user must
 * call `connect`").
 */
export function createSessionManager(
  options: SessionManagerOptions,
): SessionManager {
  const emitter = new EventEmitter();
  const sessions = new Map<string, Session>();
  const deviceIndex = new Map<string, Device>();

  function factory(udn: string, ip: string, port: number): Session {
    const session = createSession({
      udn,
      ip,
      port,
      logger: options.logger,
      tokenStore: options.tokenStore,
      ...(options.createTransport ? { createTransport: options.createTransport } : {}),
      ...options.sessionOptions,
    });
    session.on('state', (state) => {
      emitter.emit('state', { udn, state } satisfies SessionSnapshot);
    });
    return session;
  }

  function ensure(udn: string): Session | undefined {
    const device = deviceIndex.get(udn);
    if (!device) return undefined;
    let session = sessions.get(udn);
    if (!session) {
      session = factory(udn, device.ip, resolveControlPort(udn));
      sessions.set(udn, session);
    }
    return session;
  }

  function get(udn: string): Session | undefined {
    return sessions.get(udn);
  }

  function snapshot(): SessionSnapshot[] {
    const list: SessionSnapshot[] = [];
    for (const [udn, session] of sessions) {
      list.push({ udn, state: session.getState() });
    }
    return list;
  }

  const onAdded = (device: Device): void => {
    deviceIndex.set(device.udn, device);
  };
  const onUpdated = (device: Device): void => {
    deviceIndex.set(device.udn, device);
    const session = sessions.get(device.udn);
    if (session) session.markBackOnline();
  };
  const onOffline = (device: Device): void => {
    deviceIndex.set(device.udn, device);
    const session = sessions.get(device.udn);
    if (session) void session.markOffline();
  };
  const onRemoved = (device: Device): void => {
    deviceIndex.delete(device.udn);
  };

  // Prime index with anything already discovered before the manager
  // started (registry may have entries from prior ticks).
  for (const device of options.registry.snapshot()) {
    deviceIndex.set(device.udn, device);
  }

  options.registry.on('added', onAdded);
  options.registry.on('updated', onUpdated);
  options.registry.on('offline', onOffline);
  options.registry.on('removed', onRemoved);

  return Object.assign(emitter, {
    ensure,
    get,
    snapshot,
    async close(): Promise<void> {
      options.registry.off('added', onAdded);
      options.registry.off('updated', onUpdated);
      options.registry.off('offline', onOffline);
      options.registry.off('removed', onRemoved);
      for (const session of sessions.values()) {
        await session.disconnect();
      }
      sessions.clear();
    },
  }) as SessionManager;
}

export type { JsonRpcTransport };
