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
  udn: 'test-samsung-browser',
  name: 'Living Room',
  model: 'UN65KS8500',
  manufacturer: 'Samsung Electronics',
  modelName: 'UN65KS8500',
};

const SAMSUNG_LOCATION = 'http://127.0.0.1:9198/dmr';

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
let ssdp: StubSsdpTransport;
let stub: StubTransport;

before(async () => {
  staticRoot = await mkdtemp(join(tmpdir(), 'mytv-browser-'));
  await writeFile(join(staticRoot, 'index.html'), '<!doctype html><title>x</title>');
  const tokenDir = await mkdtemp(join(tmpdir(), 'mytv-browser-tokens-'));
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

  const firstAdded = once(app.discovery.registry as unknown as EventEmitter, 'added');
  ssdp.emitHit({
    location: SAMSUNG_LOCATION,
    st: 'urn:test',
    usn: 'uuid:test-samsung-browser::urn:samsung.com:device:MediaRenderer:1',
    source: 'msearch',
  });
  await firstAdded;
});

after(async () => {
  await app.close();
  await rm(staticRoot, { recursive: true, force: true });
});

async function post(body: string | object): Promise<Response> {
  return fetch(`${baseUrl}/api/devices/${description.udn}/browser`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('POST /browser while Disconnected returns 409 SessionNotConnected and sends no frame', async () => {
  const before = stub.calls.length;
  const res = await post({ url: 'https://www.google.com' });
  assert.equal(res.status, 409);
  const envelope = (await res.json()) as { code: string };
  assert.equal(envelope.code, 'SessionNotConnected');
  assert.equal(stub.calls.length, before);
});

test('POST /browser { url: "https://www.google.com" } after connect sends one ms.channel.emit frame with the expected payload', async () => {
  const connectRes = await fetch(`${baseUrl}/api/devices/${description.udn}/connect`, {
    method: 'POST',
  });
  assert.equal(connectRes.status, 200);

  const before = stub.calls.length;
  const res = await post({ url: 'https://www.google.com' });
  assert.equal(res.status, 204);

  const call = stub.calls[before];
  assert.equal(call?.method, 'ms.channel.emit');
  assert.deepEqual(call?.params, {
    event: 'ed.apps.launch',
    to: 'host',
    data: {
      appId: 'org.tizen.browser',
      action_type: 'NATIVE_LAUNCH',
      metaTag: 'https://www.google.com',
    },
  });
});

test('POST /browser with empty body returns 400 validation and sends no frame', async () => {
  const before = stub.calls.length;
  const res = await post({});
  assert.equal(res.status, 400);
  const envelope = (await res.json()) as { code: string };
  assert.equal(envelope.code, 'validation');
  assert.equal(stub.calls.length, before);
});

test('POST /browser with empty url returns 400 validation', async () => {
  const before = stub.calls.length;
  const res = await post({ url: '' });
  assert.equal(res.status, 400);
  const envelope = (await res.json()) as { code: string };
  assert.equal(envelope.code, 'validation');
  assert.equal(stub.calls.length, before);
});

test('POST /browser with a javascript: scheme returns 400 validation', async () => {
  const before = stub.calls.length;
  const res = await post({ url: 'javascript:alert(1)' });
  assert.equal(res.status, 400);
  const envelope = (await res.json()) as { code: string };
  assert.equal(envelope.code, 'validation');
  assert.equal(stub.calls.length, before);
});

test('POST /browser with a malformed url returns 400 validation', async () => {
  const before = stub.calls.length;
  const res = await post({ url: 'not a url' });
  assert.equal(res.status, 400);
  const envelope = (await res.json()) as { code: string };
  assert.equal(envelope.code, 'validation');
  assert.equal(stub.calls.length, before);
});

test('POST /browser with a URL longer than 2048 chars returns 400 validation', async () => {
  const before = stub.calls.length;
  const url = 'https://example.com/' + 'a'.repeat(3000);
  const res = await post({ url });
  assert.equal(res.status, 400);
  const envelope = (await res.json()) as { code: string };
  assert.equal(envelope.code, 'validation');
  assert.equal(stub.calls.length, before);
});
