import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { TvError, toHttpEnvelope } from './tv/errors.js';

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }

  static badRequest(message: string): HttpError {
    return new HttpError(400, 'bad_request', message);
  }

  static notFound(message: string): HttpError {
    return new HttpError(404, 'not_found', message);
  }
}

interface ErrorEnvelope {
  code: string;
  message: string;
  correlationId: string;
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const correlationId = request.id;

  if (error instanceof HttpError) {
    request.log.warn({ err: error, correlationId }, error.message);
    const envelope: ErrorEnvelope = {
      code: error.code,
      message: error.message,
      correlationId,
    };
    reply.status(error.statusCode).send(envelope);
    return;
  }

  if (error instanceof TvError) {
    // Domain TV failures propagating out of a route (e.g. the session
    // socket dropped between the `Connected` guard and the enqueued
    // Smart View call) must land as a mapped domain envelope, never the
    // generic `code: "internal"` (spec `remote-control-keys` scenario
    // "TV failure surfaces to caller"; AGENTS.md house rule).
    request.log.warn({ err: error, correlationId }, error.message);
    const { status, body } = toHttpEnvelope(error, correlationId);
    reply.status(status).send(body);
    return;
  }

  if (error.validation) {
    request.log.warn({ err: error, correlationId }, 'validation error');
    const envelope: ErrorEnvelope = {
      code: 'validation',
      message: error.message,
      correlationId,
    };
    reply.status(400).send(envelope);
    return;
  }

  request.log.error({ err: error, correlationId }, 'unhandled error');
  const envelope: ErrorEnvelope = {
    code: 'internal',
    message: 'Internal server error',
    correlationId,
  };
  reply.status(500).send(envelope);
}
