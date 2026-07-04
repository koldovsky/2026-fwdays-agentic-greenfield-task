import os from 'node:os';
import { Bonjour } from 'bonjour-service';
import { logger as defaultLogger } from './logger.js';

/** Structural subset of Pino / Fastify loggers we actually call. */
export interface MdnsLogger {
  info: (obj: object, msg?: string) => void;
  warn: (obj: object, msg?: string) => void;
  error: (obj: object, msg?: string) => void;
}

export type MdnsState = 'stopped' | 'advertising' | 'error';

/**
 * Minimal service handle we depend on — matches the surface of
 * `bonjour-service`'s Service. Kept structural so tests can inject fakes.
 */
export interface MdnsService {
  stop: (cb?: () => void) => void;
}

/**
 * Structural subset of the `bonjour-service` client. Only the methods
 * this module invokes; anything else is intentionally excluded so tests
 * can pass a hand-rolled mock without pulling in the whole class.
 */
export interface MdnsClient {
  publish: (opts: {
    name: string;
    type: string;
    port: number;
    host?: string;
    txt?: Record<string, string>;
  }) => MdnsService;
  destroy: (cb?: () => void) => void;
}

export interface MdnsHandle {
  stop: () => Promise<void>;
  state: MdnsState;
  address: string | undefined;
  error: string | undefined;
  hostname: string;
  /**
   * Fires the interface-set delta check synchronously. Exposed so tests
   * can drive the change path without waiting on the 5 s poll timer.
   */
  triggerInterfaceCheck: () => void;
}

export interface StartMdnsOptions {
  networkInterfaces?: typeof os.networkInterfaces;
  pollIntervalMs?: number;
  client?: MdnsClient;
  logger?: MdnsLogger;
  instanceName?: string;
  hostname?: string;
}

const DEFAULT_HOSTNAME = 'mytv.local';
const AVAHI_HINT =
  'mDNS port 5353 is busy — is avahi-daemon (Linux) or mDNSResponder (macOS) already running? Stop it or set AVAHI_COMPAT=1.';

function activeIpv4Addresses(
  getIfaces: typeof os.networkInterfaces,
): string[] {
  const addrs = new Set<string>();
  const ifaces = getIfaces();
  for (const list of Object.values(ifaces)) {
    if (!list) continue;
    for (const entry of list) {
      if (entry.family === 'IPv4' && !entry.internal) {
        addrs.add(entry.address);
      }
    }
  }
  return [...addrs].sort();
}

function isPortConflict(message: string): boolean {
  return /EADDRINUSE|EACCES/.test(message);
}

export function startMdns(
  port: number,
  options: StartMdnsOptions = {},
): MdnsHandle {
  const log = options.logger ?? defaultLogger;
  const getIfaces = options.networkInterfaces ?? os.networkInterfaces;
  const pollIntervalMs = options.pollIntervalMs ?? 5000;
  const instanceName =
    options.instanceName ?? process.env.INSTANCE_NAME ?? 'mytv';
  const hostname = options.hostname ?? DEFAULT_HOSTNAME;
  // `bonjour-service` uses `service.host` verbatim as the A-record name and
  // the SRV target — set it to the full `mytv.local` FQDN so peers that
  // query `mytv.local` actually get an A record back.

  // `bonjour-service`'s Service#stop is typed as CallableFunction, which
  // is looser than our MdnsService.stop signature — cast through unknown
  // rather than widen the ergonomic type used by test stubs.
  const client: MdnsClient =
    options.client ?? (new Bonjour() as unknown as MdnsClient);

  const handle: MdnsHandle = {
    stop: async () => {},
    state: 'stopped',
    address: undefined,
    error: undefined,
    hostname,
    triggerInterfaceCheck: () => {},
  };

  // The real bonjour-service exposes the underlying multicast-dns socket as
  // `server.mdns`, which is the only place async bind errors (EADDRINUSE
  // when Avahi/mDNSResponder already holds 5353) surface. Attach an
  // 'error' listener there so those errors mark the handle degraded
  // instead of crashing the process. Mocks won't have this shape — skip.
  const rawClient = client as unknown as {
    server?: { mdns?: { on?: (evt: string, fn: (err: Error) => void) => void } };
  };
  const mdnsSocket = rawClient.server?.mdns;
  if (mdnsSocket && typeof mdnsSocket.on === 'function') {
    mdnsSocket.on('error', (err: Error) => {
      const message = err.message ?? String(err);
      handle.state = 'error';
      handle.error = message;
      handle.address = undefined;
      log.error(
        { err, hint: isPortConflict(message) ? AVAHI_HINT : undefined },
        'mDNS socket error',
      );
    });
  }

  let currentService: MdnsService | undefined;
  let lastAddresses: string[] = [];

  function publish(): void {
    try {
      currentService = client.publish({
        name: instanceName,
        type: 'http',
        port,
        host: hostname,
        txt: { path: '/' },
      });
      const addrs = activeIpv4Addresses(getIfaces);
      lastAddresses = addrs;
      handle.state = 'advertising';
      handle.address = addrs[0];
      handle.error = undefined;
      log.info(
        {
          instance: instanceName,
          hostname,
          address: handle.address,
          addresses: addrs,
          port,
        },
        'mDNS advertisement started',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      handle.state = 'error';
      handle.error = message;
      handle.address = undefined;
      currentService = undefined;
      log.error(
        { err, hint: isPortConflict(message) ? AVAHI_HINT : undefined },
        'mDNS publish failed',
      );
    }
  }

  function stopCurrentService(): void {
    if (!currentService) return;
    try {
      currentService.stop();
    } catch (err) {
      log.warn({ err }, 'mDNS service stop failed');
    }
    currentService = undefined;
  }

  function checkInterfaces(): void {
    let now: string[];
    try {
      now = activeIpv4Addresses(getIfaces);
    } catch (err) {
      log.warn({ err }, 'mDNS interface poll failed');
      return;
    }
    const changed =
      now.length !== lastAddresses.length ||
      now.some((v, i) => v !== lastAddresses[i]);
    if (!changed) return;
    log.info(
      { old: lastAddresses, new: now },
      'mDNS interface change detected; re-advertising',
    );
    stopCurrentService();
    publish();
  }

  publish();

  const interval =
    pollIntervalMs > 0 ? setInterval(checkInterfaces, pollIntervalMs) : undefined;
  interval?.unref();

  handle.stop = async () => {
    if (interval) clearInterval(interval);
    stopCurrentService();
    // Small grace period so bonjour's goodbye packet reaches the LAN
    // before we destroy the socket.
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      client.destroy();
    } catch (err) {
      log.warn({ err }, 'mDNS client destroy failed');
    }
    handle.state = 'stopped';
    handle.address = undefined;
  };
  handle.triggerInterfaceCheck = checkInterfaces;

  return handle;
}
