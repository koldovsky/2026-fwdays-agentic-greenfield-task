import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

// One structured entry per API request (NFR-OBS-01), emitted on response
// 'finish' so the final status code is known. Plain Express middleware, not
// a Nest interceptor — interceptors never fire for guard rejections (401)
// or route misses (404), and those must be visible too. `structured` adds
// the per-field payload for the JSON logger; the dev pretty logger gets a
// compact one-line string instead of a multi-line inspected object.
export function createRequestLogger(
  structured: boolean,
  logger: Pick<Logger, 'log'> = new Logger('http'),
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    // SPA page and asset requests are noise; log only the API surface.
    // Exact-segment check: '/api-foo' must not match (review S-08 #4).
    if (req.path !== '/api' && !req.path.startsWith('/api/')) {
      next();
      return;
    }
    const startedAt = performance.now();
    res.on('finish', () => {
      const durationMs = Math.round(performance.now() - startedAt);
      // Allowlist only: req.path without the query string (search q carries
      // user text, FR-LIST-03) and never bodies or tokens (NFR-SEC-01).
      // `message` repeats the fields for Railway's human-readable column.
      const message = `${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`;
      logger.log(
        structured
          ? {
              message,
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              durationMs,
            }
          : message,
      );
    });
    next();
  };
}
