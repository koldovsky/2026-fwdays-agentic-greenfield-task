import pino, { type DestinationStream, type LoggerOptions } from 'pino';

const SENSITIVE_KEYS = new Set(['AccessToken', 'authorization']);
const MAX_DEPTH = 8;

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// pino's path-based `redact` option only supports single-level (`*`) and
// terminal wildcards, not arbitrary-depth (`**`) matching, so it cannot
// guarantee AccessToken is stripped "regardless of nesting depth." A
// recursive formatter does instead — but only descends into plain
// objects/arrays. Class instances (Fastify's request/reply, sockets,
// buffers, dates, errors, ...) are left untouched: they can hold circular
// references and huge internal state, and Fastify's own req/res
// serializers still need the original instances to run on afterwards.
function stripSensitive(
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
  depth = 0,
): unknown {
  if (depth > MAX_DEPTH) return '[Truncated]';
  if (Array.isArray(value)) {
    return value.map((item) => stripSensitive(item, seen, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    if (!isPlainObject(value)) return value;
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key)) continue;
      result[key] = stripSensitive(entryValue, seen, depth + 1);
    }
    return result;
  }
  return value;
}

// Shared with app.ts, which passes this straight into Fastify's `logger`
// option so Fastify builds and owns the actual request-logger instance
// (wiring in its own req/res serializers). Passing a pre-built pino
// instance via `loggerInstance` instead skips those serializers, so
// Fastify's own request/response objects — which contain circular
// references — reach this formatter unserialized and crash it.
export const loggerOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    // A logging bug must never take down request handling: fall back to
    // the unredacted object rather than throwing out of a log call.
    log: (object) => {
      try {
        return stripSensitive(object) as Record<string, unknown>;
      } catch {
        return object;
      }
    },
  },
};

// Standalone instance for logging outside of a Fastify request lifecycle
// (e.g. background jobs in later capabilities) and for unit-testing the
// redaction in isolation. Factory form lets tests redirect output to a
// capturing stream.
//
// Always emits plain NDJSON — no in-process pretty-printing transport.
// pino-pretty's worker-thread transport is a common source of hangs in
// sandboxed/CI environments; pipe `npm run back:dev | npx pino-pretty`
// for readable local output instead (see back-end/README.md).
export function createLogger(destination?: DestinationStream): pino.Logger {
  return destination ? pino(loggerOptions, destination) : pino(loggerOptions);
}

export const logger = createLogger();
