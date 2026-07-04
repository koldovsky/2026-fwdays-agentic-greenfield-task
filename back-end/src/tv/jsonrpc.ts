import { Pool, Agent } from 'undici';
import { mapRpcErrorCode, mapTransportError, TvError } from './errors.js';

export interface JsonRpcLogger {
  info: (obj: Record<string, unknown> | string, msg?: string) => void;
  warn: (obj: Record<string, unknown> | string, msg?: string) => void;
  error: (obj: Record<string, unknown> | string, msg?: string) => void;
  debug: (obj: Record<string, unknown> | string, msg?: string) => void;
}

/**
 * Injectable transport for a per-TV JSON-RPC connection. Tests pass a
 * stub; production wires up a real `undici.Pool`. `call` returns the raw
 * `result` value on success and throws a mapped `TvError` on any
 * transport or JSON-RPC error.
 */
export interface JsonRpcTransport {
  call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
  close(): Promise<void>;
}

export interface CreateTransportOptions {
  ip: string;
  port: number;
  logger: JsonRpcLogger;
  /** Optional AccessToken merged into every `params`. Never logged. */
  accessToken?: string;
  /** Per-call timeout in ms. Default 3 s (spec: Wi-Fi TVs can lag). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 3_000;

let nextRpcId = 1;
function allocRpcId(): number {
  const id = nextRpcId;
  nextRpcId = nextRpcId >= Number.MAX_SAFE_INTEGER ? 1 : nextRpcId + 1;
  return id;
}

interface JsonRpcSuccess<T> {
  jsonrpc: '2.0';
  result: T;
  id: number;
}

interface JsonRpcFailure {
  jsonrpc: '2.0';
  error: { code: number; message: string; data?: unknown };
  id: number | null;
}

/**
 * Real transport backed by `undici.Pool` (one pool per TV, keep-alive
 * hard-capped to 30 s idle / 300 s max — spec §1.3 / §1.4). Samsung TVs
 * present self-signed certs on the LAN; production uses
 * `rejectUnauthorized: false` scoped to the pool. The AccessToken is
 * merged into every request's `params` but never appears on the log
 * lines — the redacting formatter in `logger.ts` strips it.
 */
export function createHttpsTransport(
  options: CreateTransportOptions,
): JsonRpcTransport {
  const { ip, port, logger } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const origin = `https://${ip}:${port}`;

  const pool = new Pool(origin, {
    connect: { rejectUnauthorized: false },
    keepAliveTimeout: 30_000,
    keepAliveMaxTimeout: 300_000,
    pipelining: 1,
  });

  async function call<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const rpcId = allocRpcId();
    const paramsWithToken = options.accessToken
      ? { ...params, AccessToken: options.accessToken }
      : params;
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params: paramsWithToken,
      id: rpcId,
    });
    logger.info(
      { rpcId, method, params: paramsWithToken, origin },
      'jsonrpc request',
    );

    let statusCode: number;
    let responseText: string;
    try {
      const res = await pool.request({
        path: '/',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body,
        bodyTimeout: timeoutMs,
        headersTimeout: timeoutMs,
      });
      statusCode = res.statusCode;
      responseText = await res.body.text();
    } catch (err) {
      logger.warn({ rpcId, method, err }, 'jsonrpc transport error');
      throw mapTransportError(err, rpcId);
    }

    if (statusCode !== 200) {
      logger.warn(
        { rpcId, method, statusCode, body: responseText },
        'jsonrpc non-200 response',
      );
      throw new TvError('TvFailed', `HTTP ${statusCode}`, undefined, rpcId);
    }

    let payload: JsonRpcSuccess<T> | JsonRpcFailure;
    try {
      payload = JSON.parse(responseText) as JsonRpcSuccess<T> | JsonRpcFailure;
    } catch {
      logger.warn(
        { rpcId, method, body: responseText },
        'jsonrpc response was not valid JSON',
      );
      throw new TvError('TvUnknown', 'malformed response', undefined, rpcId);
    }

    if ('error' in payload && payload.error) {
      const code = payload.error.code;
      const mapped = mapRpcErrorCode(code);
      logger.warn(
        { rpcId, method, rawCode: code, mappedCode: mapped, data: payload.error.data },
        'jsonrpc application error',
      );
      throw new TvError(mapped, payload.error.message ?? 'jsonrpc error', code, rpcId);
    }

    logger.info(
      { rpcId, method, hasResult: 'result' in payload },
      'jsonrpc response',
    );
    return (payload as JsonRpcSuccess<T>).result;
  }

  async function close(): Promise<void> {
    try {
      await pool.close();
    } catch {
      /* pool may have already been destroyed */
    }
  }

  return { call, close };
}

/** Small helper for callers that want a fresh Agent (e.g. one-off tools). */
export function createSharedAgent(): Agent {
  return new Agent({ connect: { rejectUnauthorized: false } });
}
