import { existsSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

export interface StaticSpaOptions {
  root: string;
  enabled: boolean;
}

function notFoundEnvelope(correlationId: string) {
  return { code: 'not_found', message: 'Not found', correlationId };
}

// Resolves a request URL to a real file under root, refusing anything that
// would escape root via `..` segments. Returns null for directories/misses
// so the caller falls back to the SPA shell instead of trying to send one.
function resolveStaticFile(root: string, urlPath: string): string | null {
  const requestPath = decodeURIComponent(urlPath.split('?')[0] ?? '').replace(
    /^\/+/,
    '',
  );
  if (requestPath === '') return null;

  const resolvedRoot = resolve(root);
  const candidate = resolve(resolvedRoot, requestPath);
  const isInsideRoot =
    candidate === resolvedRoot || candidate.startsWith(resolvedRoot + sep);
  if (!isInsideRoot || !existsSync(candidate)) return null;

  return statSync(candidate).isFile() ? candidate : null;
}

export async function registerStaticSpa(
  app: FastifyInstance,
  { root, enabled }: StaticSpaOptions,
): Promise<void> {
  const spaAvailable = enabled && existsSync(root);

  if (spaAvailable) {
    await app.register(fastifyStatic, { root, wildcard: false });
  }

  app.setNotFoundHandler((request, reply) => {
    const isReservedPath =
      request.url.startsWith('/api/') || request.url === '/ws';

    if (spaAvailable && !isReservedPath && request.method === 'GET') {
      const file = resolveStaticFile(root, request.url);
      const filename = file ? relative(root, file) : 'index.html';
      reply.sendFile(filename);
      return;
    }

    reply.status(404).send(notFoundEnvelope(request.id));
  });
}
