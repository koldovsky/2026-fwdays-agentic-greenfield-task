import { ConsoleLogger, LogLevel } from '@nestjs/common';

// Railway flattens top-level JSON fields into queryable log attributes but
// renders an object-valued `message` as an empty string (observed
// 2026-07-09) — so plain-object messages are spread into the envelope,
// keeping their own `message` string for the human-readable column.
class JsonConsoleLogger extends ConsoleLogger {
  protected override getJsonLogObject(
    message: unknown,
    options: {
      context: string;
      logLevel: LogLevel;
      writeStreamType?: 'stdout' | 'stderr';
      errorStack?: unknown;
    },
  ) {
    const base = super.getJsonLogObject(message, options);
    if (
      message !== null &&
      typeof message === 'object' &&
      message.constructor === Object
    ) {
      // Envelope fields always win — a payload key like `level` or
      // `timestamp` must not be able to forge the envelope (review S-08 #1).
      const { message: text, ...fields } = message as Record<string, unknown>;
      for (const key of ['level', 'pid', 'timestamp', 'context', 'stack']) {
        delete fields[key];
      }
      return {
        ...base,
        ...fields,
        message: typeof text === 'string' ? text : '',
      };
    }
    return base;
  }
}

// Structured logs in production (NFR-OBS-01): with json enabled every Logger
// call site — request lines, the exceptions handler, SMS senders — emits
// single-line JSON for Railway. Outside production the factory returns
// undefined and NestFactory keeps the default human-readable logger.
export function createAppLogger(
  env: NodeJS.ProcessEnv,
): ConsoleLogger | undefined {
  return env.NODE_ENV === 'production'
    ? new JsonConsoleLogger({ json: true })
    : undefined;
}
