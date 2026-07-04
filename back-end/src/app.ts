import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import type { RawData } from 'ws';
import { loggerOptions } from './logger.js';
import { errorHandler } from './errors.js';
import { registerStaticSpa } from './plugins/static-spa.js';
import { registerHealthRoute } from './routes/health.js';

export interface CreateAppOptions {
  staticRoot?: string;
  serveSpa?: boolean;
}

const defaultStaticRoot = fileURLToPath(
  new URL('../../front-end/dist', import.meta.url),
);

export async function createApp(
  options: CreateAppOptions = {},
): Promise<FastifyInstance> {
  const app: FastifyInstance = Fastify({
    logger: loggerOptions,
    genReqId: () => randomUUID(),
  });

  app.setErrorHandler(errorHandler);

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
