import type { FastifyInstance } from 'fastify';
import { HttpError } from '../errors.js';
import { toClientSessionState } from '../tv/types.js';

interface SessionParams {
  udn: string;
}

export async function registerSessionRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: SessionParams }>(
    '/devices/:udn/session',
    async (request) => {
      const { udn } = request.params;
      const manager = app.discovery?.sessions;
      const session = manager?.get(udn);
      const state = session?.getState() ?? { kind: 'Disconnected' as const };
      return { state: toClientSessionState(state) };
    },
  );

  app.post<{ Params: SessionParams }>(
    '/devices/:udn/connect',
    async (request) => {
      const { udn } = request.params;
      const manager = app.discovery?.sessions;
      if (!manager) throw HttpError.notFound('session manager unavailable');
      const session = manager.ensure(udn);
      if (!session) throw HttpError.notFound(`unknown UDN: ${udn}`);
      await session.connect();
      return { state: toClientSessionState(session.getState()) };
    },
  );

  app.post<{ Params: SessionParams }>(
    '/devices/:udn/disconnect',
    async (request) => {
      const { udn } = request.params;
      const manager = app.discovery?.sessions;
      const session = manager?.get(udn);
      if (session) await session.disconnect();
      return { state: 'Disconnected' as const };
    },
  );
}
