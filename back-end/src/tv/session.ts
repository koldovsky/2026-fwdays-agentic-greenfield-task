import { EventEmitter } from 'node:events';
import PQueue from 'p-queue';
import { TvError } from './errors.js';
import type { JsonRpcLogger, JsonRpcTransport } from './jsonrpc.js';
import { createHttpsTransport } from './jsonrpc.js';
import type { TokenStore } from './token-store.js';
import type { SessionState } from './types.js';

export interface SessionOptions {
  udn: string;
  ip: string;
  port: number;
  logger: JsonRpcLogger;
  tokenStore: TokenStore;
  /** Injectable — tests pass a stub. Default builds a real `undici.Pool`. */
  createTransport?: (opts: {
    ip: string;
    port: number;
    accessToken?: string;
    logger: JsonRpcLogger;
  }) => JsonRpcTransport;
  reconnectDelaysMs?: number[];
  heartbeatIntervalMs?: number;
  /** Method the TV answers with the persisted token for MVP pairing. */
  pairMethod?: string;
  /** Method used as the keep-alive heartbeat. */
  heartbeatMethod?: string;
}

/** Emits `state` on every transition. */
export interface Session {
  udn: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  markOffline(): Promise<void>;
  markBackOnline(): void;
  getState(): SessionState;
  enqueue<T>(fn: (transport: JsonRpcTransport) => Promise<T>): Promise<T>;
  on(event: 'state', listener: (state: SessionState) => void): this;
  off(event: 'state', listener: (state: SessionState) => void): this;
}

const DEFAULT_RECONNECT_DELAYS_MS = [200, 500, 1_000, 2_000, 5_000];
const DEFAULT_HEARTBEAT_MS = 15_000;
/**
 * Samsung's IP Control spec provisions the AccessToken out-of-band and
 * has no documented "getAccessToken" JSON-RPC call. Per the change's
 * design.md, MVP still tries a `getAccessToken` call so a firmware /
 * fork that DOES support it Just Works — on a stock TV it will return
 * `-32601` (TvNotSupported) and the session transitions to
 * `Disconnected` with a log line pointing the user at the Samsung
 * Business setup guide or the `MYTV_TOKEN_<UDN>` env override.
 */
const DEFAULT_PAIR_METHOD = 'getAccessToken';
const DEFAULT_HEARTBEAT_METHOD = 'getSystemInfo';

/**
 * Per-TV session actor. Owns exactly one JSON-RPC transport, one FIFO
 * command queue (concurrency 1 — spec forbids batching and mandates
 * per-TV serialization), and one state machine per the design's D1
 * diagram. State transitions fire on the `state` event; the manager
 * fans those out to the WS broker.
 */
export function createSession(options: SessionOptions): Session {
  const emitter = new EventEmitter();
  const queue = new PQueue({ concurrency: 1 });
  const reconnectDelays =
    options.reconnectDelaysMs ?? DEFAULT_RECONNECT_DELAYS_MS;
  const heartbeatIntervalMs =
    options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_MS;
  const pairMethod = options.pairMethod ?? DEFAULT_PAIR_METHOD;
  const heartbeatMethod = options.heartbeatMethod ?? DEFAULT_HEARTBEAT_METHOD;
  const createTransport =
    options.createTransport ??
    ((opts) => createHttpsTransport({ ...opts, logger: options.logger }));

  let state: SessionState = { kind: 'Disconnected' };
  let transport: JsonRpcTransport | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  function setState(next: SessionState): void {
    state = next;
    emitter.emit('state', next);
  }

  async function tryOpen(): Promise<void> {
    const tokens = await options.tokenStore.loadTokens();
    let token: string | undefined =
      process.env[`MYTV_TOKEN_${options.udn}`] ?? tokens[options.udn];

    const t = createTransport({
      ip: options.ip,
      port: options.port,
      logger: options.logger,
      accessToken: token,
    });

    if (!token) {
      // MVP pairing path — see the DEFAULT_PAIR_METHOD comment.
      options.logger.info(
        { udn: options.udn },
        'No AccessToken for TV; attempting MVP pairing. Look at the TV screen for a confirmation prompt.',
      );
      try {
        const paired = (await t.call<{ AccessToken?: string; accessToken?: string; token?: string }>(
          pairMethod,
          {},
        )) ?? {};
        const newToken =
          typeof paired === 'string'
            ? paired
            : paired.AccessToken ?? paired.accessToken ?? paired.token;
        if (!newToken) {
          await t.close();
          throw new TvError(
            'TvNotSupported',
            `Pairing method ${pairMethod} returned no token; provision one out-of-band and store it via MYTV_TOKEN_${options.udn} or the token store`,
          );
        }
        await options.tokenStore.saveToken(options.udn, newToken);
        token = newToken;
        options.logger.info({ udn: options.udn }, 'AccessToken persisted');
      } catch (err) {
        await t.close();
        throw err;
      }
    }

    // Verify the transport actually works by issuing the heartbeat
    // method once. Without this, `tryOpen` would optimistically mark the
    // session Connected even when the TV drops every subsequent call —
    // the reconnect cap could never trip because each attempt "succeeds"
    // at the open step and then instantly fails on the next heartbeat.
    try {
      await t.call(heartbeatMethod, {});
    } catch (err) {
      await t.close();
      throw err;
    }

    transport = t;
    setState({ kind: 'Connected', since: Date.now() });
    startHeartbeat();
  }

  function startHeartbeat(): void {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      void heartbeat();
    }, heartbeatIntervalMs);
    heartbeatTimer.unref?.();
  }

  function stopHeartbeat(): void {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    }
  }

  async function heartbeat(): Promise<void> {
    if (state.kind !== 'Connected' || !transport) return;
    try {
      await transport.call(heartbeatMethod, {});
    } catch (err) {
      options.logger.warn({ udn: options.udn, err }, 'heartbeat failed; transitioning to Reconnecting');
      stopHeartbeat();
      await teardownTransport();
      setState({ kind: 'Reconnecting', since: Date.now(), attempt: 0 });
      scheduleReconnect();
    }
  }

  function scheduleReconnect(): void {
    if (stopped) return;
    if (state.kind !== 'Reconnecting') return;
    const attempt = state.attempt;
    if (attempt >= reconnectDelays.length) {
      options.logger.warn(
        { udn: options.udn, attempts: attempt },
        'reconnect cap reached; transitioning to Disconnected',
      );
      setState({ kind: 'Disconnected' });
      return;
    }
    const delay = reconnectDelays[attempt]!;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      void attemptReconnect();
    }, delay);
    reconnectTimer.unref?.();
  }

  async function attemptReconnect(): Promise<void> {
    if (stopped || state.kind !== 'Reconnecting') return;
    const currentAttempt = state.attempt;
    const initialSince = state.since;
    try {
      await tryOpen();
    } catch (err) {
      options.logger.warn(
        { udn: options.udn, attempt: currentAttempt + 1, err },
        'reconnect attempt failed',
      );
      // Re-read the current state after the await — TS's narrowing
      // above is stale, and `tryOpen()` may have moved us to Connected.
      const currentKind = (state as SessionState).kind;
      if (currentKind === 'Connected') return;
      setState({
        kind: 'Reconnecting',
        since: initialSince,
        attempt: currentAttempt + 1,
      });
      scheduleReconnect();
    }
  }

  async function teardownTransport(): Promise<void> {
    if (transport) {
      const t = transport;
      transport = undefined;
      try {
        await t.close();
      } catch {
        /* ignore — pool may already be destroyed */
      }
    }
  }

  async function connect(): Promise<void> {
    if (state.kind === 'Connected' || state.kind === 'Connecting') return;
    if (state.kind === 'Offline') {
      options.logger.warn(
        { udn: options.udn },
        'connect() ignored: device is Offline',
      );
      return;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
    setState({ kind: 'Connecting', since: Date.now() });
    try {
      await tryOpen();
    } catch (err) {
      options.logger.warn({ udn: options.udn, err }, 'initial connect failed');
      await teardownTransport();
      setState({ kind: 'Disconnected' });
    }
  }

  async function disconnect(): Promise<void> {
    stopped = true;
    stopHeartbeat();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
    await teardownTransport();
    setState({ kind: 'Disconnected' });
    stopped = false;
  }

  async function markOffline(): Promise<void> {
    stopHeartbeat();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
    await teardownTransport();
    setState({ kind: 'Offline' });
  }

  function markBackOnline(): void {
    if (state.kind !== 'Offline') return;
    setState({ kind: 'Disconnected' });
  }

  return Object.assign(emitter, {
    udn: options.udn,
    connect,
    disconnect,
    markOffline,
    markBackOnline,
    getState: () => state,
    enqueue: <T>(fn: (t: JsonRpcTransport) => Promise<T>): Promise<T> => {
      return queue.add(async () => {
        if (!transport) throw new TvError('TvNotReachable', 'no active session');
        return fn(transport);
      }) as Promise<T>;
    },
  }) as Session;
}
