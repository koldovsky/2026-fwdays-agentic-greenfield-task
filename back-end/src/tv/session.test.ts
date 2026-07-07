import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSession } from './session.js';
import type { JsonRpcTransport } from './jsonrpc.js';
import { TvError } from './errors.js';
import { createTokenStore } from './token-store.js';

interface StubTransport extends JsonRpcTransport {
  calls: Array<{ method: string; params: Record<string, unknown> }>;
  closed: boolean;
  pings: number;
}

interface StubBehavior {
  handshake: () => Promise<{ token?: string }> | { token?: string };
  ping?: () => Promise<void> | void;
}

function makeStub(behavior: StubBehavior): StubTransport {
  const stub: StubTransport = {
    calls: [],
    closed: false,
    pings: 0,
    async call<T>(method: string, params: Record<string, unknown> = {}) {
      stub.calls.push({ method, params });
      return undefined as T;
    },
    async connectHandshake() {
      return behavior.handshake();
    },
    async ping() {
      stub.pings += 1;
      if (behavior.ping) await behavior.ping();
    },
    async close() {
      stub.closed = true;
    },
  };
  return stub;
}

const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

let tmp: string;
before(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'mytv-session-'));
});
after(async () => {
  await rm(tmp, { recursive: true, force: true });
});

test('connect pairs (no token) and transitions Disconnected → Connecting → Connected', async () => {
  const store = createTokenStore({ path: join(tmp, 'test1.json') });
  let stub: StubTransport | undefined;
  const session = createSession({
    udn: 'udn-1',
    ip: '10.0.0.1',
    port: 8001,
    logger: silentLogger,
    tokenStore: store,
    heartbeatIntervalMs: 60_000,
    createTransport: () => {
      stub = makeStub({ handshake: () => ({ token: 'freshly-paired-token' }) });
      return stub;
    },
  });
  const seen: string[] = [];
  session.on('state', (s) => seen.push(s.kind));

  assert.equal(session.getState().kind, 'Disconnected');
  await session.connect();
  assert.equal(session.getState().kind, 'Connected');
  assert.deepEqual(seen, ['Connecting', 'Connected']);
  const tokens = await store.loadTokens();
  assert.equal(tokens['udn-1'], 'freshly-paired-token');
});

test('connect using a stored token passes it to the transport and re-confirms without changing it', async () => {
  const store = createTokenStore({ path: join(tmp, 'test2.json') });
  await store.saveToken('udn-2', 'preloaded-token');
  let receivedToken: string | undefined;
  const stub = makeStub({
    handshake: () => ({}), // TV re-confirms an already-trusted token: no new token returned
  });
  const session = createSession({
    udn: 'udn-2',
    ip: '10.0.0.2',
    port: 8001,
    logger: silentLogger,
    tokenStore: store,
    heartbeatIntervalMs: 60_000,
    createTransport: (opts) => {
      receivedToken = opts.token;
      return stub;
    },
  });
  await session.connect();
  assert.equal(session.getState().kind, 'Connected');
  assert.equal(receivedToken, 'preloaded-token');
  const tokens = await store.loadTokens();
  assert.equal(tokens['udn-2'], 'preloaded-token');
});

test('heartbeat failure transitions Connected → Reconnecting; recovery returns to Connected', async () => {
  const store = createTokenStore({ path: join(tmp, 'test3.json') });
  await store.saveToken('udn-3', 'token-3');
  let failNext = false;
  const stub = makeStub({
    handshake: () => ({}),
    ping: () => {
      if (failNext) throw new TvError('TvNotReachable', 'socket dropped');
    },
  });
  const session = createSession({
    udn: 'udn-3',
    ip: '10.0.0.3',
    port: 8001,
    logger: silentLogger,
    tokenStore: store,
    heartbeatIntervalMs: 15, // fast for the test
    reconnectDelaysMs: [5, 5, 5, 5, 5],
    createTransport: () => stub,
  });
  const seen: string[] = [];
  session.on('state', (s) => seen.push(s.kind));

  await session.connect();
  assert.equal(session.getState().kind, 'Connected');

  failNext = true;
  await new Promise((r) => setTimeout(r, 40)); // let heartbeat tick fire
  // We must have transitioned into Reconnecting at least once.
  assert.ok(seen.includes('Reconnecting'), `seen: ${seen.join(', ')}`);

  failNext = false;
  await new Promise((r) => setTimeout(r, 60)); // let reconnect fire
  assert.equal(session.getState().kind, 'Connected');
});

test('reconnect gives up and transitions to Disconnected after cap', async () => {
  const store = createTokenStore({ path: join(tmp, 'test4.json') });
  await store.saveToken('udn-4', 'token-4');
  let alwaysFail = false;
  const stub = makeStub({
    handshake: () => ({}),
    ping: () => {
      if (alwaysFail) throw new TvError('TvNotReachable', 'stays broken');
    },
  });
  const session = createSession({
    udn: 'udn-4',
    ip: '10.0.0.4',
    port: 8001,
    logger: silentLogger,
    tokenStore: store,
    heartbeatIntervalMs: 10,
    reconnectDelaysMs: [5, 5, 5, 5, 5],
    createTransport: () => stub,
  });
  await session.connect();
  assert.equal(session.getState().kind, 'Connected');

  alwaysFail = true;
  // Wait long enough for heartbeat + all reconnect attempts (5×5 ms = 25 ms plus overhead).
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(session.getState().kind, 'Disconnected');
});

test('markOffline tears down the session and returns to Disconnected via markBackOnline', async () => {
  const store = createTokenStore({ path: join(tmp, 'test5.json') });
  await store.saveToken('udn-5', 'token-5');
  const stub = makeStub({ handshake: () => ({}) });
  const session = createSession({
    udn: 'udn-5',
    ip: '10.0.0.5',
    port: 8001,
    logger: silentLogger,
    tokenStore: store,
    heartbeatIntervalMs: 60_000,
    createTransport: () => stub,
  });
  await session.connect();
  await session.markOffline();
  assert.equal(session.getState().kind, 'Offline');
  assert.equal(stub.closed, true);

  session.markBackOnline();
  assert.equal(session.getState().kind, 'Disconnected');
});

test('connectHandshake rejection (e.g. unauthorized) leaves the session Disconnected', async () => {
  const store = createTokenStore({ path: join(tmp, 'test6.json') });
  const stub = makeStub({
    handshake: () => {
      throw new TvError('TvNotSupported', 'pairing declined on the TV');
    },
  });
  const session = createSession({
    udn: 'udn-6',
    ip: '10.0.0.6',
    port: 8001,
    logger: silentLogger,
    tokenStore: store,
    heartbeatIntervalMs: 60_000,
    createTransport: () => stub,
  });
  await session.connect();
  assert.equal(session.getState().kind, 'Disconnected');
  assert.equal(stub.closed, true);
});
