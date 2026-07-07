import type { FastifyInstance } from 'fastify';
import { HttpError } from '../errors.js';
import { keyControlParams, SAMSUNG_KEY_CODES, type SamsungKeyCode } from '../tv/keys.js';

interface KeyParams {
  udn: string;
}

interface KeyBody {
  key: SamsungKeyCode;
}

const bodySchema = {
  type: 'object',
  required: ['key'],
  additionalProperties: false,
  properties: {
    key: { type: 'string', enum: SAMSUNG_KEY_CODES as readonly string[] },
  },
};

export async function registerKeyRoute(app: FastifyInstance): Promise<void> {
  app.post<{ Params: KeyParams; Body: KeyBody }>(
    '/devices/:udn/key',
    { schema: { body: bodySchema } },
    async (request, reply) => {
      const { udn } = request.params;
      const { key } = request.body;

      const manager = app.discovery?.sessions;
      if (!manager) throw HttpError.notFound('session manager unavailable');
      const session = manager.get(udn) ?? manager.ensure(udn);
      if (!session) throw HttpError.notFound(`unknown UDN: ${udn}`);
      if (session.getState().kind !== 'Connected') {
        throw new HttpError(409, 'SessionNotConnected', 'session is not connected');
      }

      await session.enqueue((transport) =>
        transport.call('ms.remote.control', keyControlParams(key)),
      );
      reply.code(204).send();
    },
  );
}
