import PQueue from 'p-queue';
import {
  fetchDescription as defaultFetchDescription,
  isSamsungTv,
  type DeviceDescription,
} from './description.js';
import type { DeviceRegistry } from './registry.js';
import type { SsdpHit, SsdpLogger, SsdpTransport } from './ssdp.js';

/** Service Type Samsung TVs advertise; captured by `docs/samsung-ip-control-protocol` skill. */
export const SAMSUNG_ST = 'urn:schemas-upnp-org:device:MediaRenderer:1';

/**
 * Cheap pre-fetch filter: skip the description-XML fetch for hits whose
 * SSDP headers carry no Samsung signature. Post-fetch `isSamsungTv`
 * stays as a defensive backstop for firmware that hides the vendor in
 * headers but exposes it in the XML.
 */
export function shouldFetch(hit: {
  usn?: string;
  st?: string;
  server?: string;
}): boolean {
  const haystack = [hit.usn, hit.st, hit.server]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' ')
    .toLowerCase();
  if (!haystack) return true; // no headers → fall through to post-fetch filter
  return haystack.includes('samsung');
}

const DEFAULT_SEARCH_INTERVAL_MS = 30_000;
const DEFAULT_OFFLINE_SWEEP_INTERVAL_MS = 30_000;
const DEFAULT_OFFLINE_THRESHOLD_MS = 60_000;
const DEFAULT_FETCH_CONCURRENCY = 5;

export interface DiscoveryOptions {
  transport: SsdpTransport;
  registry: DeviceRegistry;
  logger: SsdpLogger;
  searchIntervalMs?: number;
  offlineSweepIntervalMs?: number;
  offlineThresholdMs?: number;
  fetchConcurrency?: number;
  fetchDescription?: typeof defaultFetchDescription;
  st?: string;
}

export interface DiscoveryHandle {
  /** Trigger a one-off M-SEARCH; used by tests to avoid waiting on the timer. */
  triggerSearch(): void;
  /** Trigger a one-off offline sweep; used by tests to avoid waiting on the timer. */
  triggerOfflineSweep(): void;
  stop(): Promise<void>;
}

/**
 * Wire the SSDP transport into the registry. On every hit:
 *   1. queue a description fetch (bounded concurrency),
 *   2. run the Samsung filter,
 *   3. upsert into the registry (which fans out to the WS broker).
 *
 * Runs two 30-second timers:
 *   - periodic M-SEARCH broadcasts (`FR-DISCOVERY-03`).
 *   - offline sweep that flips devices whose last hit is older than
 *     `offlineThresholdMs` (default 60 s) — `FR-DISCOVERY-04`.
 */
export async function startDiscovery(
  options: DiscoveryOptions,
): Promise<DiscoveryHandle> {
  const {
    transport,
    registry,
    logger,
    searchIntervalMs = DEFAULT_SEARCH_INTERVAL_MS,
    offlineSweepIntervalMs = DEFAULT_OFFLINE_SWEEP_INTERVAL_MS,
    offlineThresholdMs = DEFAULT_OFFLINE_THRESHOLD_MS,
    fetchConcurrency = DEFAULT_FETCH_CONCURRENCY,
    fetchDescription = defaultFetchDescription,
    st = SAMSUNG_ST,
  } = options;

  const queue = new PQueue({ concurrency: fetchConcurrency });

  async function handleHit(hit: SsdpHit): Promise<void> {
    if (!hit.location) return;

    let ip: string;
    let port: number;
    try {
      const url = new URL(hit.location);
      ip = url.hostname;
      port = Number(url.port) || (url.protocol === 'https:' ? 443 : 80);
    } catch {
      logger.debug({ location: hit.location }, 'invalid LOCATION URL; ignoring');
      return;
    }

    let description: DeviceDescription | null;
    try {
      description = await fetchDescription(hit.location);
    } catch (err) {
      logger.debug(
        { err, location: hit.location, source: hit.source },
        'description fetch failed',
      );
      return;
    }
    if (!description) {
      logger.debug(
        { location: hit.location, source: hit.source },
        'description missing or unparseable; skipping',
      );
      return;
    }
    if (!isSamsungTv(description)) {
      logger.debug(
        {
          location: hit.location,
          manufacturer: description.manufacturer,
          modelName: description.modelName,
        },
        'not a Samsung TV; skipping',
      );
      return;
    }

    const stored = registry.upsert({
      udn: description.udn,
      name: description.name,
      model: description.model,
      ip,
      port,
    });
    if (!stored) {
      logger.debug(
        { udn: description.udn, ip, port },
        'ssdp hit dropped: another online Samsung UDN already owns this IP',
      );
    }
  }

  transport.on('hit', (hit) => {
    if (!shouldFetch(hit)) {
      logger.debug(
        {
          location: hit.location,
          usn: hit.usn,
          st: hit.st,
          server: hit.server,
          source: hit.source,
        },
        'ssdp hit dropped: no Samsung signature in headers',
      );
      return;
    }
    void queue.add(() => handleHit(hit));
  });

  await transport.start();
  // Kick off an initial search so the registry is populated well before
  // the first 30 s timer fires — the spec ("discovery begins on boot")
  // requires an M-SEARCH within 2 s of app.listen().
  transport.search(st);

  const searchTimer = setInterval(() => {
    transport.search(st);
  }, searchIntervalMs);
  searchTimer.unref();

  const sweepTimer = setInterval(() => {
    registry.markOfflineOlderThan(offlineThresholdMs);
  }, offlineSweepIntervalMs);
  sweepTimer.unref();

  return {
    triggerSearch() {
      transport.search(st);
    },
    triggerOfflineSweep() {
      registry.markOfflineOlderThan(offlineThresholdMs);
    },
    async stop() {
      clearInterval(searchTimer);
      clearInterval(sweepTimer);
      queue.clear();
      await queue.onIdle();
      await transport.stop();
    },
  };
}
