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
  /** Injectable — tests pass a stub. Default builds a real `ws.WebSocket`. */
  createTransport?: (opts: {
    ip: string;
    port: number;
    token?: string;
    logger: JsonRpcLogger;
    handshakeTimeoutMs?: number;
    pingTimeoutMs?: number;
  }) => JsonRpcTransport;
  reconnectDelaysMs?: number[];
  heartbeatIntervalMs?: number;
  /** Forwarded to the default transport factory. Production defaults
   * (30 s handshake / 5 s ping, see jsonrpc.ts) are fine as-is; tests
   * override for speed. */
  handshakeTimeoutMs?: number;
  pingTimeoutMs?: number;
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
 * Per-TV session actor. Owns exactly one Smart View WebSocket transport,
 * one FIFO command queue (concurrency 1 — per-TV serialization), and one
 * state machine per design.md's D1 diagram (this file's design predates
 * the transport pivot in `smart-view-ws-transport`; the state machine
 * itself is unchanged by it — only what's underneath `transport` and how
 * pairing/heartbeat talk to it changed). State transitions fire on the
 * `state` event; the manager fans those out to the WS broker.
 */
export function createSession(options: SessionOptions): Session {
  const emitter = new EventEmitter();
  const queue = new PQueue({ concurrency: 1 });
  const reconnectDelays =
    options.reconnectDelaysMs ?? DEFAULT_RECONNECT_DELAYS_MS;
  const heartbeatIntervalMs =
    options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_MS;
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

  /**
   * Pairing per design.md D2: open the transport with whatever token we
   * have (env override → store → none), then wait for the TV's own ack.
   * `connectHandshake()` resolves with a token when the TV issues a new
   * one (first-time pairing) or `{}` when it just re-confirms a
   * already-trusted one — persisting the returned token unconditionally
   * is safe either way (same value overwrites the same file bytes).
   */
  async function tryOpen(): Promise<void> {
    const tokens = await options.tokenStore.loadTokens();
    const token: string | undefined =
      process.env[`MYTV_TOKEN_${options.udn}`] ?? tokens[options.udn];

    const t = createTransport({
      ip: options.ip,
      port: options.port,
      logger: options.logger,
      token,
      ...(options.handshakeTimeoutMs !== undefined
        ? { handshakeTimeoutMs: options.handshakeTimeoutMs }
        : {}),
      ...(options.pingTimeoutMs !== undefined
        ? { pingTimeoutMs: options.pingTimeoutMs }
        : {}),
    });

    if (!token) {
      options.logger.info(
        { udn: options.udn },
        'awaiting pairing confirmation on TV screen',
      );
    }

    let handshake: { token?: string };
    try {
      handshake = await t.connectHandshake();
    } catch (err) {
      await t.close();
      throw err;
    }

    if (handshake.token) {
      await options.tokenStore.saveToken(options.udn, handshake.token);
      options.logger.info({ udn: options.udn }, 'token persisted');
    }

    // Verify the socket is actually alive with one heartbeat probe.
    // Without this, `tryOpen` would optimistically mark the session
    // Connected even when the TV drops the socket right after the ack —
    // the reconnect cap could never trip because each attempt "succeeds"
    // at the open step and then instantly fails on the next heartbeat.
    try {
      await t.ping();
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
      await transport.ping();
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
        /* ignore — socket may already be closed */
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
