import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { EventEmitter, once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { createApp } from '../app.js';
import type { MdnsClient } from '../mdns.js';
import type { SsdpHit, SsdpTransport } from '../discovery/ssdp.js';
import type { DeviceDescription } from '../discovery/description.js';
import type { JsonRpcTransport } from '../tv/jsonrpc.js';
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
  udn: 'test-samsung-vol',
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
}

function makeStubTransport(): StubTransport {
  const stub: StubTransport = {
    calls: [],
    async call<T>(method: string, params: Record<string, unknown> = {}) {
      stub.calls.push({ method, params });
      return undefined as T;
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
let wsUrl: string;
let ssdp: StubSsdpTransport;
let stub: StubTransport;

before(async () => {
  staticRoot = await mkdtemp(join(tmpdir(), 'mytv-vol-'));
  await writeFile(join(staticRoot, 'index.html'), '<!doctype html><title>x</title>');
  const tokenDir = await mkdtemp(join(tmpdir(), 'mytv-vol-tokens-'));
  const tokenStore = createTokenStore({ path: join(tokenDir, 'tokens.json') });

  ssdp = new StubSsdpTransport();
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
  wsUrl = `ws://127.0.0.1:${address.port}/ws`;

  const firstAdded = once(app.discovery.registry as unknown as EventEmitter, 'added');
  ssdp.emitHit({
    location: SAMSUNG_LOCATION,
    st: 'urn:test',
    usn: 'uuid:test-samsung-vol::urn:samsung.com:device:MediaRenderer:1',
    source: 'msearch',
  });
  await firstAdded;
});

after(async () => {
  await app.close();
  await rm(staticRoot, { recursive: true, force: true });
});

test('GET /volume before any action returns { level: null, muted: false }', async () => {
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/volume`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { level: unknown; muted: boolean };
  assert.equal(body.level, null);
  assert.equal(body.muted, false);
});

test('POST /volume/delta while Disconnected returns 409 SessionNotConnected', async () => {
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/volume/delta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta: 1 }),
  });
  assert.equal(res.status, 409);
  const body = (await res.json()) as { code: string };
  assert.equal(body.code, 'SessionNotConnected');
  assert.equal(stub.calls.length, 0);
});

test('POST /mute while Disconnected returns 409 SessionNotConnected', async () => {
  // Matches the spec.md scenario "Session not Connected rejects the mute
  // toggle". Runs before `/connect`, so the session is still Disconnected.
  const before = stub.calls.length;
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/mute`, {
    method: 'POST',
  });
  assert.equal(res.status, 409);
  const body = (await res.json()) as { code: string };
  assert.equal(body.code, 'SessionNotConnected');
  assert.equal(stub.calls.length, before);
});

test('POST /volume/delta { delta: 3 } after connect sends three KEY_VOLUP in order', async () => {
  // Bring the session to Connected first.
  const connectRes = await fetch(`${baseUrl}/api/devices/${description.udn}/connect`, {
    method: 'POST',
  });
  assert.equal(connectRes.status, 200);

  const before = stub.calls.length;
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/volume/delta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta: 3 }),
  });
  assert.equal(res.status, 204);
  const recorded = stub.calls.slice(before);
  assert.equal(recorded.length, 3);
  for (const call of recorded) {
    assert.equal(call.method, 'ms.remote.control');
    assert.equal(call.params.DataOfCmd, 'KEY_VOLUP');
  }
});

test('POST /volume/delta { delta: 0 } is rejected 400 validation', async () => {
  const before = stub.calls.length;
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/volume/delta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta: 0 }),
  });
  assert.equal(res.status, 400);
  const body = (await res.json()) as { code: string };
  // Fastify schema validation → errorHandler `error.validation` branch → 'validation'.
  // Matches the spec.md "Delta of 0 rejected" scenario.
  assert.equal(body.code, 'validation');
  assert.equal(stub.calls.length, before);
});

test('POST /volume/delta { delta: 100 } is rejected 400 validation', async () => {
  const before = stub.calls.length;
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/volume/delta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta: 100 }),
  });
  assert.equal(res.status, 400);
  const body = (await res.json()) as { code: string };
  assert.equal(body.code, 'validation');
  assert.equal(stub.calls.length, before);
});

test('GET /volume for an unknown UDN returns default without allocating a tracker', async () => {
  const before = (app.discovery.volume?.snapshot() ?? []).length;
  const res = await fetch(`${baseUrl}/api/devices/does-not-exist/volume`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { level: unknown; muted: boolean };
  assert.equal(body.level, null);
  assert.equal(body.muted, false);
  // The tracker map size must not have grown from the unknown-UDN read.
  assert.equal((app.discovery.volume?.snapshot() ?? []).length, before);
});

test('POST /mute sends KEY_MUTE, flips tracker, and pushes a volume WebSocket event', async () => {
  const before = stub.calls.length;
  // Read the current tracker (may already be muted from an earlier test run — normalise via GET).
  const preGet = (await (await fetch(`${baseUrl}/api/devices/${description.udn}/volume`)).json()) as {
    muted: boolean;
  };
  const expectedNext = !preGet.muted;

  const socket = new WebSocket(wsUrl);
  const eventReceived = new Promise<{ udn: string; level: unknown; muted: boolean }>((resolve, reject) => {
    socket.once('error', reject);
    socket.on('message', (raw) => {
      const parsed = JSON.parse(raw.toString('utf8')) as Record<string, unknown>;
      if (
        parsed.event === 'volume' &&
        parsed.udn === description.udn &&
        typeof parsed.muted === 'boolean'
      ) {
        resolve({ udn: parsed.udn as string, level: parsed.level, muted: parsed.muted as boolean });
      }
    });
  });
  await once(socket, 'open');

  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/mute`, {
    method: 'POST',
  });
  assert.equal(res.status, 204);
  assert.equal(stub.calls.length, before + 1);
  assert.equal(stub.calls[stub.calls.length - 1]?.params.DataOfCmd, 'KEY_MUTE');

  const evt = await eventReceived;
  assert.equal(evt.udn, description.udn);
  assert.equal(evt.level, null);
  assert.equal(evt.muted, expectedNext);

  const post = (await (await fetch(`${baseUrl}/api/devices/${description.udn}/volume`)).json()) as {
    muted: boolean;
  };
  assert.equal(post.muted, expectedNext);
  socket.close();
});
