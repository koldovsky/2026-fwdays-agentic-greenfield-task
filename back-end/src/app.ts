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
import { startMdns, type MdnsClient, type MdnsHandle } from './mdns.js';

export interface MdnsAppOptions {
  enabled?: boolean;
  client?: MdnsClient;
  networkInterfaces?: typeof os.networkInterfaces;
  pollIntervalMs?: number;
  instanceName?: string;
  hostname?: string;
}

export interface CreateAppOptions {
  staticRoot?: string;
  serveSpa?: boolean;
  /** Port advertised in the mDNS SRV record. Defaults to `PORT` / 80. */
  port?: number;
  mdns?: MdnsAppOptions;
}

const defaultStaticRoot = fileURLToPath(
  new URL('../../front-end/dist', import.meta.url),
);

declare module 'fastify' {
  interface FastifyInstance {
    mdns: { handle: MdnsHandle | undefined };
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

  await app.register(websocket);
  app.get('/ws', { websocket: true }, (socket) => {
    socket.on('message', (raw: RawData) => {
      if (raw.toString() === 'ping') socket.send('pong');
    });
  });

  await app.register(
    async (api) => {
      await registerHealthRoute(api);
    },
    { prefix: '/api' },
  );

  await registerStaticSpa(app, {
    root: options.staticRoot ?? defaultStaticRoot,
    enabled: options.serveSpa ?? process.env.SERVE_SPA !== '0',
  });

  return app;
}
