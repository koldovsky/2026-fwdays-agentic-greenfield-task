import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { createRequestLogger } from './request-logger.middleware';

function makeReq(method: string, url: string): Request {
  const [path, query] = url.split('?');
  return {
    method,
    path,
    originalUrl: url,
    query: query ? { q: query.split('=')[1] } : {},
  } as unknown as Request;
}

function makeRes(statusCode: number): Response {
  const res = new EventEmitter() as unknown as Response;
  res.statusCode = statusCode;
  return res;
}

describe('createRequestLogger', () => {
  let log: jest.Mock;
  let middleware: (req: Request, res: Response, next: NextFunction) => void;

  beforeEach(() => {
    log = jest.fn();
    middleware = createRequestLogger(true, { log });
  });

  it('logs exactly the allowlisted fields once the response finishes', () => {
    const req = makeReq('GET', '/api/tickets');
    const res = makeRes(200);
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();

    (res as unknown as EventEmitter).emit('finish');
    expect(log).toHaveBeenCalledTimes(1);
    const entry = log.mock.calls[0][0];
    // Exact allowlist (design D4): nothing beyond these fields may leak.
    expect(Object.keys(entry).sort()).toEqual([
      'durationMs',
      'message',
      'method',
      'path',
      'statusCode',
    ]);
    expect(entry).toMatchObject({
      method: 'GET',
      path: '/api/tickets',
      statusCode: 200,
    });
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    expect(entry.message).toMatch(/^GET \/api\/tickets 200 \d+ms$/);
  });

  it('never logs the query string (search text may contain names)', () => {
    const req = makeReq('GET', '/api/tickets?q=Іваненко');
    const res = makeRes(200);

    middleware(req, res, jest.fn());
    (res as unknown as EventEmitter).emit('finish');

    const entry = log.mock.calls[0][0];
    expect(entry.path).toBe('/api/tickets');
    expect(JSON.stringify(entry)).not.toContain('Іваненко');
  });

  it('logs guard rejections (401) and route misses (404) with their status', () => {
    for (const [url, status] of [
      ['/api/houses', 401],
      ['/api/no-such-route', 404],
    ] as const) {
      const res = makeRes(status);
      middleware(makeReq('GET', url), res, jest.fn());
      (res as unknown as EventEmitter).emit('finish');
    }

    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0][0]).toMatchObject({
      path: '/api/houses',
      statusCode: 401,
    });
    expect(log.mock.calls[1][0]).toMatchObject({
      path: '/api/no-such-route',
      statusCode: 404,
    });
  });

  it('logs a compact one-line string in unstructured (dev) mode', () => {
    const devMiddleware = createRequestLogger(false, { log });
    const res = makeRes(200);

    devMiddleware(makeReq('GET', '/api/tickets?q=Іваненко'), res, jest.fn());
    (res as unknown as EventEmitter).emit('finish');

    const entry = log.mock.calls[0][0];
    expect(typeof entry).toBe('string');
    expect(entry).toMatch(/^GET \/api\/tickets 200 \d+ms$/);
  });

  it('skips SPA page and asset requests entirely', () => {
    // '/api-foo' is the near-miss prefix case (review S-08 #4)
    for (const url of ['/', '/tickets/5', '/main-ABCDEF.js', '/api-foo']) {
      const req = makeReq('GET', url);
      const res = makeRes(200);
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      (res as unknown as EventEmitter).emit('finish');
    }
    expect(log).not.toHaveBeenCalled();
  });
});
