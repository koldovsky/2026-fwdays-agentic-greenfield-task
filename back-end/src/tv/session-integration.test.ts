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
import { createTokenStore } from './token-store.js';
import { TvError } from './errors.js';
import type { JsonRpcTransport } from './jsonrpc.js';

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

const SAMSUNG_LOCATION = 'http://10.0.0.42:9197/dmr';

const description: DeviceDescription = {
  udn: 'test-samsung-1',
  name: 'Living Room',
  model: 'UN65KS8500',
  manufacturer: 'Samsung Electronics',
  modelName: 'UN65KS8500',
};

async function stubFetchDescription(location: string): Promise<DeviceDescription | null> {
  return location === SAMSUNG_LOCATION ? description : null;
}

interface TvBehavior {
  failHeartbeat: boolean;
  systemInfoCalls: number;
}

let app: FastifyInstance;
let staticRoot: string;
let baseUrl: string;
let wsUrl: string;
let behavior: TvBehavior;
let ssdp: StubSsdpTransport;

before(async () => {
  staticRoot = await mkdtemp(join(tmpdir(), 'mytv-session-int-'));
  await writeFile(join(staticRoot, 'index.html'), '<!doctype html><title>x</title>');
  const tokenDir = await mkdtemp(join(tmpdir(), 'mytv-session-tokens-'));
  const tokenStore = createTokenStore({ path: join(tokenDir, 'tokens.json') });

  behavior = { failHeartbeat: false, systemInfoCalls: 0 };
  ssdp = new StubSsdpTransport();

  function createStubTransport(): JsonRpcTransport {
    return {
      async call<T>(method: string): Promise<T> {
        if (method === 'getAccessToken') {
          // Fresh transport per session — always hand out a token.
          return { AccessToken: 'integration-token' } as T;
        }
        if (method === 'getSystemInfo') {
          behavior.systemInfoCalls += 1;
          if (behavior.failHeartbeat) throw new TvError('TvNotReachable', 'boom');
          return { ok: true } as T;
        }
        throw new TvError('TvNotSupported', method);
      },
      async close() {},
    };
  }

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
      createTransport: () => createStubTransport(),
      sessionOptions: {
        heartbeatIntervalMs: 25,
        reconnectDelaysMs: [5, 5, 5, 5, 5],
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

  // Seed the registry with a device so the manager can find its ip/port.
  const firstAdded = once(app.discovery.registry as unknown as EventEmitter, 'added');
  ssdp.emitHit({ location: SAMSUNG_LOCATION, st: 'urn:test', usn: 'usn-1', source: 'msearch' });
  await firstAdded;
});

after(async () => {
  await app.close();
  await rm(staticRoot, { recursive: true, force: true });
});

test('GET /api/devices/:udn/session returns Disconnected before any connect', async () => {
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/session`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { state: string };
  assert.equal(body.state, 'Disconnected');
});

test('POST /api/devices/:udn/connect drives the session to Connected', async () => {
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/connect`, {
    method: 'POST',
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { state: string };
  assert.equal(body.state, 'Connected');

  // Cross-check the GET matches.
  const res2 = await fetch(`${baseUrl}/api/devices/${description.udn}/session`);
  const body2 = (await res2.json()) as { state: string };
  assert.equal(body2.state, 'Connected');
});

test('WebSocket receives session events for every transition (and Reconnecting is collapsed to Connecting)', async () => {
  // A fresh device we haven't touched yet.
  const otherLocation = 'http://10.0.0.55:9197/dmr';
  const otherDesc: DeviceDescription = {
    ...description,
    udn: 'test-samsung-2',
    name: 'Bedroom',
  };
  // Add the second device to the registry so we can connect it.
  const firstAdded = once(app.discovery.registry as unknown as EventEmitter, 'added');
  const originalStub = stubFetchDescription;
  // Very small extension: the fetchDescription passed at boot only knows
  // SAMSUNG_LOCATION; upsert the second device directly through the
  // registry, matching what the discovery layer would do.
  void originalStub;
  app.discovery.registry.upsert({
    udn: otherDesc.udn,
    name: otherDesc.name,
    model: otherDesc.model,
    ip: '10.0.0.55',
    port: 9197,
  });
  await firstAdded;

  const socket = new WebSocket(wsUrl);
  const messages: Array<Record<string, unknown>> = [];
  const done = new Promise<void>((resolve, reject) => {
    socket.once('error', reject);
    socket.on('message', (raw) => {
      const parsed = JSON.parse(raw.toString('utf8')) as Record<string, unknown>;
      messages.push(parsed);
      if (parsed.event === 'snapshot') {
        // Kick off a connect on the second device from inside the handler.
        void fetch(`${baseUrl}/api/devices/${otherDesc.udn}/connect`, { method: 'POST' });
      }
      if (
        parsed.event === 'session' &&
        parsed.udn === otherDesc.udn &&
        parsed.state === 'Connected'
      ) {
        resolve();
      }
    });
  });
  await once(socket, 'open');
  await done;
  socket.close();

  const sessionEvents = messages.filter((m) => m.event === 'session' && m.udn === otherDesc.udn);
  // Must see at least Connecting followed by Connected — Reconnecting must NEVER appear.
  const states = sessionEvents.map((m) => m.state);
  assert.ok(states.includes('Connecting'), `expected Connecting in ${JSON.stringify(states)}`);
  assert.ok(states.includes('Connected'), `expected Connected in ${JSON.stringify(states)}`);
  assert.ok(!states.includes('Reconnecting'), 'Reconnecting must NEVER leak to clients');
});

test('heartbeat failure that never recovers ends in Disconnected (retry cap)', async () => {
  // Use the second device we just added — it's currently Connected from the previous test.
  const udn = 'test-samsung-2';
  const beforeCalls = behavior.systemInfoCalls;
  behavior.failHeartbeat = true;
  // Give the heartbeat + retries plenty of ticks to exhaust the cap.
  await new Promise((r) => setTimeout(r, 400));
  const res = await fetch(`${baseUrl}/api/devices/${udn}/session`);
  const body = (await res.json()) as { state: string };
  assert.equal(body.state, 'Disconnected');
  assert.ok(
    behavior.systemInfoCalls > beforeCalls,
    'heartbeat must have fired before giving up',
  );
  behavior.failHeartbeat = false;
});

test('no HTTP response body contains AccessToken', async () => {
  const routes = [
    `/api/devices`,
    `/api/devices/${description.udn}/session`,
  ];
  for (const path of routes) {
    const res = await fetch(`${baseUrl}${path}`);
    const text = await res.text();
    assert.equal(
      /accesstoken/i.test(text),
      false,
      `${path} must not carry accesstoken: ${text}`,
    );
    assert.equal(
      text.includes('integration-token'),
      false,
      `${path} must not leak the persisted token literal: ${text}`,
    );
  }
});
