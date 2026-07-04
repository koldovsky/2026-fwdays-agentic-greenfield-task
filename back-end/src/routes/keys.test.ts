import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { EventEmitter, once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { createApp } from '../app.js';
import type { MdnsClient } from '../mdns.js';
import type { SsdpHit, SsdpTransport } from '../discovery/ssdp.js';
import type { DeviceDescription } from '../discovery/description.js';
import type { JsonRpcTransport } from '../tv/jsonrpc.js';
import { TvError } from '../tv/errors.js';
import { createTokenStore } from '../tv/token-store.js';

class StubSsdpTransport extends EventEmitter implements SsdpTransport {
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  search(): void {}
  emitHit(hit: SsdpHit): void {
    this.emit('hit', hit);
  }
}

function stubMdnsClient(): MdnsClient {
  return {
    publish: () => ({ stop: () => {} }),
    destroy: () => {},
  };
}

const description: DeviceDescription = {
  udn: 'test-samsung-keys',
  name: 'Living Room',
  model: 'UN65KS8500',
  manufacturer: 'Samsung Electronics',
  modelName: 'UN65KS8500',
};

const SAMSUNG_LOCATION = 'http://127.0.0.1:9197/dmr';

async function stubFetchDescription(location: string): Promise<DeviceDescription | null> {
  return location === SAMSUNG_LOCATION ? description : null;
}

interface StubTransport extends JsonRpcTransport {
  calls: Array<{ method: string; params: Record<string, unknown> }>;
  callImpl: (method: string, params: Record<string, unknown>) => Promise<unknown>;
}

function makeStubTransport(): StubTransport {
  const stub: StubTransport = {
    calls: [],
    callImpl: async () => undefined,
    async call<T>(method: string, params: Record<string, unknown> = {}) {
      stub.calls.push({ method, params });
      return (await stub.callImpl(method, params)) as T;
    },
    async connectHandshake() {
      return { token: 'stub-token' };
    },
    async ping() {},
    async close() {},
  };
  return stub;
}

let app: FastifyInstance;
let staticRoot: string;
let baseUrl: string;
let ssdp: StubSsdpTransport;
let stub: StubTransport;

before(async () => {
  staticRoot = await mkdtemp(join(tmpdir(), 'mytv-keys-'));
  await writeFile(join(staticRoot, 'index.html'), '<!doctype html><title>x</title>');
  const tokenDir = await mkdtemp(join(tmpdir(), 'mytv-keys-tokens-'));
  const tokenStore = createTokenStore({ path: join(tokenDir, 'tokens.json') });

  ssdp = new StubSsdpTransport();
  // One stub transport shared across the whole session lifetime — every
  // `createTransport` call returns THIS instance so `stub.calls` records
  // the whole per-TV history in the order the queue drains it.
  stub = makeStubTransport();

  app = await createApp({
    staticRoot,
    serveSpa: true,
    mdns: {
      client: stubMdnsClient(),
      pollIntervalMs: 0,
      networkInterfaces: () => ({}),
    },
    discovery: {
      transport: ssdp,
      fetchDescription: stubFetchDescription,
      searchIntervalMs: 60_000,
      offlineSweepIntervalMs: 60_000,
    },
    sessions: {
      tokenStore,
      createTransport: () => stub,
      sessionOptions: {
        heartbeatIntervalMs: 60_000,
        handshakeTimeoutMs: 200,
        pingTimeoutMs: 100,
      },
    },
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('test server did not bind a TCP port');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;

  // Seed the registry so the manager can look up the UDN.
  const firstAdded = once(app.discovery.registry as unknown as EventEmitter, 'added');
  ssdp.emitHit({
    location: SAMSUNG_LOCATION,
    st: 'urn:test',
    usn: 'uuid:test-samsung-keys::urn:samsung.com:device:MediaRenderer:1',
    source: 'msearch',
  });
  await firstAdded;
});

after(async () => {
  await app.close();
  await rm(staticRoot, { recursive: true, force: true });
});

test('POST /devices/:udn/key returns 409 SessionNotConnected before connect', async () => {
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'KEY_UP' }),
  });
  assert.equal(res.status, 409);
  const body = (await res.json()) as { code: string };
  assert.equal(body.code, 'SessionNotConnected');
  // The stub must not have been called — the guard happens before enqueue.
  assert.equal(stub.calls.length, 0);
});

test('POST /devices/:udn/key returns 400 on unknown key even after connect', async () => {
  // Drive the session to Connected first — the validator runs before the
  // route body, so the connected-ness check is irrelevant here.
  const connectRes = await fetch(`${baseUrl}/api/devices/${description.udn}/connect`, {
    method: 'POST',
  });
  assert.equal(connectRes.status, 200);

  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'KEY_MAKE_ME_A_SANDWICH' }),
  });
  assert.equal(res.status, 400);
  const body = (await res.json()) as { code: string };
  assert.equal(body.code, 'validation');
});

test('POST /devices/:udn/key sends one ms.remote.control call on 204', async () => {
  const before = stub.calls.length;
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'KEY_UP' }),
  });
  assert.equal(res.status, 204);
  assert.equal(stub.calls.length, before + 1);
  const call = stub.calls[before];
  assert.equal(call?.method, 'ms.remote.control');
  assert.deepEqual(call?.params, {
    Cmd: 'Click',
    DataOfCmd: 'KEY_UP',
    Option: 'false',
    TypeOfRemote: 'SendRemoteKey',
  });
});

test('TvError thrown from the transport is surfaced as its domain envelope, not "internal"', async () => {
  // Simulate the socket dropping between the state-check guard and the
  // enqueued Smart View call — the reviewer's medium finding: without a
  // dedicated TvError branch in `errorHandler`, the client would see the
  // generic `code: "internal"` instead of the mapped domain code, which
  // violates the "TV failure surfaces to caller" spec scenario and the
  // "never leak raw wire-level codes/events" house rule.
  stub.callImpl = async () => {
    throw new TvError('TvNotReachable', 'socket is not open');
  };
  try {
    const res = await fetch(`${baseUrl}/api/devices/${description.udn}/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'KEY_UP' }),
    });
    assert.equal(res.status, 502); // TvNotReachable → 502 per tv/errors.ts HTTP_STATUS
    const body = (await res.json()) as { code: string; correlationId: string };
    assert.equal(body.code, 'TvNotReachable');
    assert.notEqual(body.code, 'internal');
    assert.equal(typeof body.correlationId, 'string');
    assert.ok(body.correlationId.length > 0);
  } finally {
    stub.callImpl = async () => undefined;
  }
});

test('three rapid POSTs land on the transport in order', async () => {
  const before = stub.calls.length;
  const responses = await Promise.all([
    fetch(`${baseUrl}/api/devices/${description.udn}/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'KEY_DOWN' }),
    }),
    fetch(`${baseUrl}/api/devices/${description.udn}/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'KEY_DOWN' }),
    }),
    fetch(`${baseUrl}/api/devices/${description.udn}/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'KEY_ENTER' }),
    }),
  ]);
  for (const res of responses) assert.equal(res.status, 204);
  const recorded = stub.calls.slice(before).map((c) => c.params.DataOfCmd);
  assert.deepEqual(recorded, ['KEY_DOWN', 'KEY_DOWN', 'KEY_ENTER']);
});
