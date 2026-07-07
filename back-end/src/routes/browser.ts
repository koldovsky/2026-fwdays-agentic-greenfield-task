import type { FastifyInstance } from 'fastify';
import { HttpError } from '../errors.js';
import { launchBrowserParams } from '../tv/browser.js';

interface BrowserParams {
  udn: string;
}

interface BrowserBody {
  url: string;
}

const bodySchema = {
  type: 'object',
  required: ['url'],
  additionalProperties: false,
  properties: {
    url: { type: 'string', minLength: 1, maxLength: 2048 },
  },
};

export async function registerBrowserRoute(app: FastifyInstance): Promise<void> {
  app.post<{ Params: BrowserParams; Body: BrowserBody }>(
    '/devices/:udn/browser',
    { schema: { body: bodySchema } },
    async (request, reply) => {
      const { udn } = request.params;
      const { url } = request.body;

      // Layer 2 (post-schema) URL check: WHATWG parse + http/https scheme
      // guard. Ajv's `format: 'uri'` is too lax (accepts `javascript:`),
      // so this happens in the handler. Any parse failure or non-http
      // scheme → 400 with envelope `code: "validation"`, matching the
      // C6/C7/C8 error-envelope shape.
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new HttpError(400, 'validation', 'url is not parseable');
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new HttpError(400, 'validation', 'url scheme must be http or https');
      }

      const manager = app.discovery?.sessions;
      if (!manager) throw HttpError.notFound('session manager unavailable');
      const session = manager.get(udn) ?? manager.ensure(udn);
      if (!session) throw HttpError.notFound(`unknown UDN: ${udn}`);
      if (session.getState().kind !== 'Connected') {
        throw new HttpError(409, 'SessionNotConnected', 'session is not connected');
      }

      // Log the full URL alongside host — `logger.ts`'s TOKEN_QUERY_FRAGMENT
      // regex redacts any `?token=…` / `&token=…` fragment before it hits
      // the sink, so a user-pasted URL that carries a session token
      // won't leak.
      request.log.info(
        { correlationId: request.id, udn, url, host: parsed.host },
        'browser launch',
      );
      await session.enqueue((transport) =>
        transport.call('ms.channel.emit', launchBrowserParams(url)),
      );
      reply.code(204).send();
    },
  );
}
