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
}

interface StubHandlers {
  [method: string]: (params: Record<string, unknown>) => Promise<unknown> | unknown;
}

function makeStub(handlers: StubHandlers): StubTransport {
  const stub: StubTransport = {
    calls: [],
    closed: false,
    async call<T>(method: string, params: Record<string, unknown> = {}) {
      stub.calls.push({ method, params });
      const handler = handlers[method];
      if (!handler) throw new TvError('TvNotSupported', method);
      const result = await handler(params);
      return result as T;
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
let tokenPath: string;
before(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'mytv-session-'));
  tokenPath = join(tmp, 'tokens.json');
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
    port: 1516,
    logger: silentLogger,
    tokenStore: store,
    heartbeatIntervalMs: 60_000,
    createTransport: () => {
      stub = makeStub({
        getAccessToken: () => ({ AccessToken: 'freshly-paired-token' }),
        getSystemInfo: () => ({ ok: true }),
      });
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

test('connect using a stored token skips pairing', async () => {
  const store = createTokenStore({ path: join(tmp, 'test2.json') });
  await store.saveToken('udn-2', 'preloaded-token');
  const stub = makeStub({
    getSystemInfo: () => ({ ok: true }),
  });
  const session = createSession({
    udn: 'udn-2',
    ip: '10.0.0.2',
    port: 1516,
    logger: silentLogger,
    tokenStore: store,
    heartbeatIntervalMs: 60_000,
    createTransport: () => stub,
  });
  await session.connect();
  assert.equal(session.getState().kind, 'Connected');
  // Only the pair call is skipped — no `getAccessToken` should ever be issued.
  assert.equal(
    stub.calls.some((c) => c.method === 'getAccessToken'),
    false,
  );
});

test('heartbeat failure transitions Connected → Reconnecting; recovery returns to Connected', async () => {
  const store = createTokenStore({ path: join(tmp, 'test3.json') });
  await store.saveToken('udn-3', 'token-3');
  let failNext = false;
  const stub = makeStub({
    getSystemInfo: () => {
      if (failNext) throw new TvError('TvNotReachable', 'socket dropped');
      return { ok: true };
    },
  });
  const session = createSession({
    udn: 'udn-3',
    ip: '10.0.0.3',
    port: 1516,
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
    getSystemInfo: () => {
      if (alwaysFail) throw new TvError('TvNotReachable', 'stays broken');
      return { ok: true };
    },
  });
  const session = createSession({
    udn: 'udn-4',
    ip: '10.0.0.4',
    port: 1516,
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
  const stub = makeStub({
    getSystemInfo: () => ({ ok: true }),
  });
  const session = createSession({
    udn: 'udn-5',
    ip: '10.0.0.5',
    port: 1516,
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
