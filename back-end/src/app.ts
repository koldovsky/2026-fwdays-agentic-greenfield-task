import { randomUUID } from 'node:crypto';
import type os from 'node:os';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import type { RawData } from 'ws';
import { loggerOptions } from './logger.js';
import { errorHandler } from './errors.js';
import { registerStaticSpa } from './plugins/static-spa.js';
import { registerHealthRoute } from './routes/health.js';
import { registerDevicesRoute } from './routes/devices.js';
import { registerSessionRoutes } from './routes/sessions.js';
import { startMdns, type MdnsClient, type MdnsHandle } from './mdns.js';
import { createSsdpTransport, type SsdpTransport } from './discovery/ssdp.js';
import { createDeviceRegistry, type DeviceRegistry } from './discovery/registry.js';
import {
  startDiscovery,
  type DiscoveryHandle,
  type DiscoveryOptions,
} from './discovery/index.js';
import { createDevicesBroker, type DevicesBroker } from './ws/broker.js';
import { createSessionManager, type SessionManager } from './tv/manager.js';
import { createTokenStore, type TokenStore } from './tv/token-store.js';
import type { SessionOptions } from './tv/session.js';

export interface MdnsAppOptions {
  enabled?: boolean;
  client?: MdnsClient;
  networkInterfaces?: typeof os.networkInterfaces;
  pollIntervalMs?: number;
  instanceName?: string;
  hostname?: string;
}

export interface DiscoveryAppOptions {
  enabled?: boolean;
  /** Injectable SSDP transport (tests pass a stub). */
  transport?: SsdpTransport;
  searchIntervalMs?: number;
  offlineSweepIntervalMs?: number;
  offlineThresholdMs?: number;
  fetchConcurrency?: number;
  fetchDescription?: DiscoveryOptions['fetchDescription'];
  st?: string;
}

export interface SessionsAppOptions {
  enabled?: boolean;
  tokenStore?: TokenStore;
  createTransport?: SessionOptions['createTransport'];
  sessionOptions?: SessionManagerAppSessionOptions;
}

export type SessionManagerAppSessionOptions = Partial<
  Omit<
    SessionOptions,
    'udn' | 'ip' | 'port' | 'logger' | 'tokenStore' | 'createTransport'
  >
>;

export interface CreateAppOptions {
  staticRoot?: string;
  serveSpa?: boolean;
  /** Port advertised in the mDNS SRV record. Defaults to `PORT` / 80. */
  port?: number;
  mdns?: MdnsAppOptions;
  discovery?: DiscoveryAppOptions;
  sessions?: SessionsAppOptions;
}

const defaultStaticRoot = fileURLToPath(
  new URL('../../front-end/dist', import.meta.url),
);

declare module 'fastify' {
  interface FastifyInstance {
    mdns: { handle: MdnsHandle | undefined };
    discovery: {
      registry: DeviceRegistry;
      broker: DevicesBroker | undefined;
      handle: DiscoveryHandle | undefined;
      sessions: SessionManager | undefined;
    };
  }
}

export async function createApp(
  options: CreateAppOptions = {},
): Promise<FastifyInstance> {
  const app: FastifyInstance = Fastify({
    logger: loggerOptions,
    genReqId: () => randomUUID(),
  });

  app.setErrorHandler(errorHandler);

  // Some clients send `Content-Type: application/json` on POSTs that
  // carry no body (e.g. `/connect`, `/disconnect`). Fastify's built-in
  // JSON parser rejects that with 400; treat empty payloads as no body.
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      const text = typeof body === 'string' ? body : body.toString();
      if (text.length === 0) {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(text));
      } catch (err) {
        done(err as Error);
      }
    },
  );

  const mdnsRef: { handle: MdnsHandle | undefined } = { handle: undefined };
  app.decorate('mdns', mdnsRef);

  const mdnsOptions = options.mdns ?? {};
  const mdnsEnabled =
    mdnsOptions.enabled ?? process.env.MDNS_ENABLED !== '0';
  const advertisedPort =
    options.port ?? Number(process.env.PORT ?? 80);

  if (mdnsEnabled) {
    app.addHook('onReady', async () => {
      mdnsRef.handle = startMdns(advertisedPort, {
        client: mdnsOptions.client,
        networkInterfaces: mdnsOptions.networkInterfaces,
        pollIntervalMs: mdnsOptions.pollIntervalMs,
        instanceName: mdnsOptions.instanceName,
        hostname: mdnsOptions.hostname,
        logger: app.log,
      });
    });

    app.addHook('onClose', async () => {
      // startMdns' stop() already includes a ~500 ms grace period so the
      // goodbye packet leaves before the client is destroyed.
      await mdnsRef.handle?.stop();
      mdnsRef.handle = undefined;
    });
  }

  const registry = createDeviceRegistry();
  const discoveryRef: FastifyInstance['discovery'] = {
    registry,
    broker: undefined,
    handle: undefined,
    sessions: undefined,
  };
  app.decorate('discovery', discoveryRef);

  const sessionsOptions = options.sessions ?? {};
  const sessionsEnabled =
    sessionsOptions.enabled ?? process.env.SESSIONS_ENABLED !== '0';
  if (sessionsEnabled) {
    const tokenStore = sessionsOptions.tokenStore ?? createTokenStore();
    discoveryRef.sessions = createSessionManager({
      registry,
      tokenStore,
      logger: app.log,
      ...(sessionsOptions.createTransport
        ? { createTransport: sessionsOptions.createTransport }
        : {}),
      ...(sessionsOptions.sessionOptions
        ? { sessionOptions: sessionsOptions.sessionOptions }
        : {}),
    });
    app.addHook('onClose', async () => {
      await discoveryRef.sessions?.close();
      discoveryRef.sessions = undefined;
    });
  }

  const discoveryOptions = options.discovery ?? {};
  const discoveryEnabled =
    discoveryOptions.enabled ?? process.env.DISCOVERY_ENABLED !== '0';

  if (discoveryEnabled) {
    app.addHook('onReady', async () => {
      const transport =
        discoveryOptions.transport ?? createSsdpTransport({ logger: app.log });
      const handle = await startDiscovery({
        transport,
        registry,
        logger: app.log,
        searchIntervalMs: discoveryOptions.searchIntervalMs,
        offlineSweepIntervalMs: discoveryOptions.offlineSweepIntervalMs,
        offlineThresholdMs: discoveryOptions.offlineThresholdMs,
        fetchConcurrency: discoveryOptions.fetchConcurrency,
        fetchDescription: discoveryOptions.fetchDescription,
        st: discoveryOptions.st,
      });
      discoveryRef.handle = handle;
    });

    app.addHook('onClose', async () => {
      await discoveryRef.handle?.stop();
      discoveryRef.handle = undefined;
      discoveryRef.broker?.close();
      discoveryRef.broker = undefined;
    });
  }

  await app.register(websocket);
  if (discoveryEnabled) {
    discoveryRef.broker = createDevicesBroker(
      registry,
      app.log,
      discoveryRef.sessions,
    );
  }
  app.get('/ws', { websocket: true }, (socket) => {
    discoveryRef.broker?.register(socket);
    socket.on('message', (raw: RawData) => {
      if (raw.toString() === 'ping') socket.send('pong');
    });
  });

  await app.register(
    async (api) => {
      await registerHealthRoute(api);
      await registerDevicesRoute(api);
      await registerSessionRoutes(api);
    },
    { prefix: '/api' },
  );

  await registerStaticSpa(app, {
    root: options.staticRoot ?? defaultStaticRoot,
    enabled: options.serveSpa ?? process.env.SERVE_SPA !== '0',
  });

  return app;
}
