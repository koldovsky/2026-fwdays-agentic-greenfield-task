import { createSocket, type Socket } from 'node:dgram';
import { EventEmitter } from 'node:events';
// node-ssdp is CommonJS with `module.exports = { Server, Client, Base }`.
// Node's ESM interop won't destructure named `import { Client }`, so pull the
// default and reach into `.Client`.
import ssdp from 'node-ssdp';

const NodeSsdpClient = ssdp.Client;

export interface SsdpHit {
  /** Absolute URL of the UPnP device description XML (LOCATION header). */
  location: string;
  /** Service Type — `ST` on M-SEARCH responses, `NT` on NOTIFY. */
  st: string;
  /** Unique Service Name (USN). */
  usn: string;
  /** Where the hit originated so callers can debug transport bugs. */
  source: 'msearch' | 'notify';
}

export interface SsdpLogger {
  debug: (obj: Record<string, unknown> | string, msg?: string) => void;
  info: (obj: Record<string, unknown> | string, msg?: string) => void;
  warn: (obj: Record<string, unknown> | string, msg?: string) => void;
  error: (obj: Record<string, unknown> | string, msg?: string) => void;
}

export interface SsdpTransport {
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Send an M-SEARCH broadcast for the given ST. */
  search(st: string): void;
  on(event: 'hit', listener: (hit: SsdpHit) => void): this;
  off(event: 'hit', listener: (hit: SsdpHit) => void): this;
}

const SSDP_MULTICAST_IP = '239.255.255.250';
const SSDP_PORT = 1900;

export interface SsdpTransportOptions {
  logger: SsdpLogger;
}

/**
 * Real SSDP transport backed by `node-ssdp` for M-SEARCH and a raw dgram
 * socket bound to port 1900 for asynchronous NOTIFY reception. node-ssdp's
 * Client alone binds an ephemeral source port, which cannot receive
 * multicast NOTIFY messages targeted at `239.255.255.250:1900`.
 */
export function createSsdpTransport(
  options: SsdpTransportOptions,
): SsdpTransport {
  const { logger } = options;
  const emitter = new EventEmitter();
  let client: InstanceType<typeof NodeSsdpClient> | undefined;
  let notifySocket: Socket | undefined;
  let started = false;

  function handleHit(hit: SsdpHit): void {
    if (!hit.location) return;
    emitter.emit('hit', hit);
  }

  async function start(): Promise<void> {
    if (started) return;
    started = true;

    client = new NodeSsdpClient({ reuseAddr: true });
    client.on('response', (headers) => {
      const location = typeof headers.LOCATION === 'string' ? headers.LOCATION : '';
      const st = typeof headers.ST === 'string' ? headers.ST : '';
      const usn = typeof headers.USN === 'string' ? headers.USN : '';
      handleHit({ location, st, usn, source: 'msearch' });
    });
    await client.start();
    logger.info('SSDP client started');

    notifySocket = createSocket({ type: 'udp4', reuseAddr: true });
    notifySocket.on('error', (err) => {
      logger.warn(
        { err, port: SSDP_PORT },
        'SSDP NOTIFY listener socket error',
      );
    });
    notifySocket.on('message', (msg) => {
      const parsed = parseNotify(msg.toString('utf8'));
      if (!parsed) return;
      handleHit({ ...parsed, source: 'notify' });
    });

    await new Promise<void>((resolve, reject) => {
      notifySocket!.bind(SSDP_PORT, () => {
        try {
          notifySocket!.addMembership(SSDP_MULTICAST_IP);
          notifySocket!.unref();
          logger.info(
            { port: SSDP_PORT, group: SSDP_MULTICAST_IP },
            'SSDP NOTIFY listener joined multicast group',
          );
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      notifySocket!.once('error', reject);
    });
  }

  async function stop(): Promise<void> {
    if (!started) return;
    started = false;
    try {
      client?.stop();
    } catch (err) {
      logger.warn({ err }, 'error stopping node-ssdp client');
    }
    client = undefined;
    if (notifySocket) {
      const s = notifySocket;
      notifySocket = undefined;
      await new Promise<void>((resolve) => {
        s.close(() => resolve());
      });
    }
  }

  function search(st: string): void {
    if (!client) {
      logger.warn({ st }, 'SSDP search called before start; ignoring');
      return;
    }
    client.search(st);
  }

  return Object.assign(emitter, {
    start,
    stop,
    search,
  }) as SsdpTransport;
}

/**
 * Parse an SSDP `NOTIFY * HTTP/1.1` datagram. Returns `null` for anything
 * that isn't an alive notification (byebye is not surfaced — offline is
 * handled by the registry's lastSeen sweep, which the spec pins on the
 * absence of hits for 60 seconds).
 */
export function parseNotify(
  raw: string,
): { location: string; st: string; usn: string } | null {
  const lines = raw.split(/\r\n|\n/);
  const first = lines.shift();
  if (!first || !/^NOTIFY\s+\*\s+HTTP\/1\.1/i.test(first)) return null;

  const headers: Record<string, string> = {};
  for (const line of lines) {
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toUpperCase();
    const value = line.slice(idx + 1).trim();
    if (key) headers[key] = value;
  }

  const nts = headers['NTS'] ?? '';
  if (nts.toLowerCase() !== 'ssdp:alive') return null;

  return {
    location: headers['LOCATION'] ?? '',
    st: headers['NT'] ?? '',
    usn: headers['USN'] ?? '',
  };
}
