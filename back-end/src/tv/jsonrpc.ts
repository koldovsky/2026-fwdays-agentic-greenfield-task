import { WebSocket } from 'ws';
import { mapWsError, TvError } from './errors.js';

export interface JsonRpcLogger {
  info: (obj: Record<string, unknown> | string, msg?: string) => void;
  warn: (obj: Record<string, unknown> | string, msg?: string) => void;
  error: (obj: Record<string, unknown> | string, msg?: string) => void;
  debug: (obj: Record<string, unknown> | string, msg?: string) => void;
}

/**
 * Injectable transport for a per-TV Samsung Smart View WebSocket
 * connection. Tests pass a stub; production wires up a real
 * `ws.WebSocket`. Named `JsonRpcTransport`/`createHttpsTransport` to
 * minimise diff churn from the previous (JSON-RPC over HTTPS) cycle —
 * see `openspec/changes/smart-view-ws-transport/design.md` Non-Goals;
 * renaming is a follow-up.
 */
export interface JsonRpcTransport {
  /** Fire-and-forget: Smart View reserves no per-call response id. The
   * promise resolves once the frame is drained, not once the TV acts on
   * it. */
  call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
  /** Waits for the TV's pairing ack. Resolves with a token when the TV
   * issues a new one (first-time pairing); resolves with `{}` when the
   * TV just re-confirms an already-trusted token. Rejects with a mapped
   * `TvError` on `unauthorized`, `timeOut`, a socket error/close before
   * the ack, or its own timeout. */
  connectHandshake(): Promise<{ token?: string }>;
  /** Keep-alive probe: `ws.ping()`, resolving on `pong`. Rejects with a
   * `TvError` if no `pong` arrives before the timeout. */
  ping(): Promise<void>;
  close(): Promise<void>;
}

export interface CreateTransportOptions {
  ip: string;
  port: number;
  logger: JsonRpcLogger;
  /** Stored/preloaded Smart View pairing token, if any. Never logged. */
  token?: string;
  /** Pairing handshake timeout in ms. Default 30 s — the user has to look
   * at the TV and accept the on-screen prompt. */
  handshakeTimeoutMs?: number;
  /** Heartbeat ping timeout in ms. Default 5 s. */
  pingTimeoutMs?: number;
}

const DEFAULT_HANDSHAKE_TIMEOUT_MS = 30_000;
const DEFAULT_PING_TIMEOUT_MS = 5_000;
const SMART_VIEW_PATH = '/api/v2/channels/samsung.remote.control';
const CLIENT_NAME = 'mytv';

function buildUrl(ip: string, port: number, token?: string): string {
  const name = Buffer.from(CLIENT_NAME).toString('base64');
  const params = new URLSearchParams({ name });
  if (token) params.set('token', token);
  return `ws://${ip}:${port}${SMART_VIEW_PATH}?${params.toString()}`;
}

interface SmartViewEvent {
  event: string;
  data?: { token?: string; [key: string]: unknown };
}

function parseSmartViewEvent(raw: unknown): SmartViewEvent | undefined {
  try {
    const text = typeof raw === 'string' ? raw : String(raw);
    const parsed = JSON.parse(text) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      typeof (parsed as { event?: unknown }).event === 'string'
    ) {
      return parsed as SmartViewEvent;
    }
  } catch {
    /* not JSON — not a Smart View event, ignore */
  }
  return undefined;
}

/**
 * Real transport backed by the `ws` package — one WebSocket per session
 * (design.md D1), connecting to
 * `ws://<ip>:<SMART_VIEW_PORT>/api/v2/channels/samsung.remote.control`.
 * The pairing token travels in the connection URL and in `ms.channel.*`
 * event payloads but never appears on a log line — `logger.ts`'s
 * redacting formatter strips the `token` key (any depth) and `token=`
 * query fragments from logged strings.
 */
export function createHttpsTransport(
  options: CreateTransportOptions,
): JsonRpcTransport {
  const { ip, port, logger } = options;
  const handshakeTimeoutMs =
    options.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS;
  const pingTimeoutMs = options.pingTimeoutMs ?? DEFAULT_PING_TIMEOUT_MS;
  const socket = new WebSocket(buildUrl(ip, port, options.token));
  let handshakeSettled = false;

  socket.on('message', (raw) => {
    const parsed = parseSmartViewEvent(raw);
    if (parsed?.event === 'ms.error') {
      logger.warn({ ip, port, data: parsed.data }, 'ms.error received from TV');
    }
  });

  socket.on('error', (error) => {
    logger.warn({ ip, port, err: error }, 'smart view socket error');
  });

  async function connectHandshake(): Promise<{ token?: string }> {
    if (handshakeSettled) {
      throw new TvError('TvUnknown', 'connectHandshake called more than once');
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        settle(() => reject(mapWsError({ kind: 'event', event: 'ms.channel.timeOut' })));
      }, handshakeTimeoutMs);
      timer.unref?.();

      function cleanup(): void {
        clearTimeout(timer);
        socket.off('message', onMessage);
        socket.off('error', onError);
        socket.off('close', onClose);
      }

      function settle(fn: () => void): void {
        if (handshakeSettled) return;
        handshakeSettled = true;
        cleanup();
        fn();
      }

      function onMessage(raw: unknown): void {
        const parsed = parseSmartViewEvent(raw);
        if (!parsed) return;
        if (parsed.event === 'ms.channel.connect') {
          settle(() => resolve({ token: parsed.data?.token }));
        } else if (parsed.event === 'ms.channel.unauthorized') {
          settle(() => reject(mapWsError({ kind: 'event', event: parsed.event })));
        } else if (parsed.event === 'ms.channel.timeOut') {
          settle(() => reject(mapWsError({ kind: 'event', event: parsed.event })));
        }
      }
      function onError(error: unknown): void {
        settle(() => reject(mapWsError({ kind: 'socket-error', error })));
      }
      function onClose(code: number): void {
        settle(() => reject(mapWsError({ kind: 'close', code })));
      }

      socket.on('message', onMessage);
      socket.on('error', onError);
      socket.on('close', onClose);
    });
  }

  async function call<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    logger.info({ ip, port, method }, 'smart view command sent');
    return new Promise((resolve, reject) => {
      socket.send(JSON.stringify({ method, params }), (error) => {
        if (error) {
          reject(mapWsError({ kind: 'socket-error', error }));
          return;
        }
        resolve(undefined as T);
      });
    });
  }

  async function ping(): Promise<void> {
    if (socket.readyState !== WebSocket.OPEN) {
      throw new TvError('TvNotReachable', 'socket is not open');
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off('pong', onPong);
        reject(new TvError('TvNotReachable', 'heartbeat ping timed out'));
      }, pingTimeoutMs);
      timer.unref?.();

      function onPong(): void {
        clearTimeout(timer);
        resolve();
      }
      socket.once('pong', onPong);
      socket.ping();
    });
  }

  async function close(): Promise<void> {
    return new Promise((resolve) => {
      if (socket.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }
      socket.once('close', () => resolve());
      socket.close(1000);
    });
  }

  return { call, connectHandshake, ping, close };
}
