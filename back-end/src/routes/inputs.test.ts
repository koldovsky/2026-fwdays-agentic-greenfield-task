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
import { INPUT_CATALOGUE } from '../tv/inputs.js';

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
  udn: 'test-samsung-inputs',
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
  staticRoot = await mkdtemp(join(tmpdir(), 'mytv-inputs-'));
  await writeFile(join(staticRoot, 'index.html'), '<!doctype html><title>x</title>');
  const tokenDir = await mkdtemp(join(tmpdir(), 'mytv-inputs-tokens-'));
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
    usn: 'uuid:test-samsung-inputs::urn:samsung.com:device:MediaRenderer:1',
    source: 'msearch',
  });
  await firstAdded;
});

after(async () => {
  await app.close();
  await rm(staticRoot, { recursive: true, force: true });
});

test('GET /inputs returns the static catalogue regardless of session state', async () => {
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/inputs`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { inputs: Array<{ id: string; label: string }> };
  assert.deepEqual(body.inputs, [...INPUT_CATALOGUE]);
  // Response body must have no activeId (Smart View can't report it).
  assert.equal('activeId' in body, false);
});

test('POST /input while Disconnected returns 409 SessionNotConnected', async () => {
  const before = stub.calls.length;
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'KEY_HDMI1' }),
  });
  assert.equal(res.status, 409);
  const body = (await res.json()) as { code: string };
  assert.equal(body.code, 'SessionNotConnected');
  assert.equal(stub.calls.length, before);
});

test('POST /input { key: "KEY_HDMI1" } after connect sends the frame + emits an `input` WS event', async () => {
  const connectRes = await fetch(`${baseUrl}/api/devices/${description.udn}/connect`, {
    method: 'POST',
  });
  assert.equal(connectRes.status, 200);

  const socket = new WebSocket(wsUrl);
  const eventReceived = new Promise<{ udn: string; key: string }>((resolve, reject) => {
    socket.once('error', reject);
    socket.on('message', (raw) => {
      const parsed = JSON.parse(raw.toString('utf8')) as Record<string, unknown>;
      if (parsed.event === 'input' && parsed.udn === description.udn) {
        resolve({ udn: parsed.udn as string, key: parsed.key as string });
      }
    });
  });
  await once(socket, 'open');

  const before = stub.calls.length;
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'KEY_HDMI1' }),
  });
  assert.equal(res.status, 204);

  const call = stub.calls[before];
  assert.equal(call?.method, 'ms.remote.control');
  assert.equal(call?.params.DataOfCmd, 'KEY_HDMI1');

  const evt = await eventReceived;
  assert.equal(evt.udn, description.udn);
  assert.equal(evt.key, 'KEY_HDMI1');
  socket.close();
});

test('POST /input with an unknown key returns 400 validation', async () => {
  const before = stub.calls.length;
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'KEY_MADE_UP' }),
  });
  assert.equal(res.status, 400);
  const body = (await res.json()) as { code: string };
  assert.equal(body.code, 'validation');
  // No new frame was sent.
  assert.equal(stub.calls.length, before);
});

test('POST /input rejects a non-KEY string that happens to be a real Samsung key of a different capability', async () => {
  // KEY_UP is a valid SamsungKeyCode but not a SamsungInputKey — /input
  // must reject it so the capability boundary from C6 stays intact.
  const before = stub.calls.length;
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'KEY_UP' }),
  });
  assert.equal(res.status, 400);
  const body = (await res.json()) as { code: string };
  assert.equal(body.code, 'validation');
  assert.equal(stub.calls.length, before);
});
