import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { EventEmitter, once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { WebSocket, WebSocketServer } from 'ws';
import { createApp } from '../app.js';
import type { MdnsClient } from '../mdns.js';
import type { SsdpHit, SsdpTransport } from '../discovery/ssdp.js';
import type { DeviceDescription } from '../discovery/description.js';
import { createTokenStore } from './token-store.js';

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

// The fake TV below listens on 127.0.0.1 — the registered device's IP
// must match that (only the *port* is redirected via
// MYTV_CONTROL_PORT_<UDN>; the manager still dials `device.ip` as-is).
const SAMSUNG_LOCATION = 'http://127.0.0.1:9197/dmr';

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

/**
 * Fake Samsung Smart View TV. Accepts WebSocket connections on
 * `127.0.0.1:<port>` and, unless `offline`, immediately acks with
 * `ms.channel.connect` carrying a token — per design.md D2's pairing
 * handshake — so the *real* `createHttpsTransport` drives the *real*
 * state machine end-to-end (design.md D7), not a hand-rolled stub.
 */
async function createFakeTv(): Promise<{
  port: number;
  setOffline(value: boolean): void;
  close(): Promise<void>;
}> {
  let offline = false;
  const server: WebSocketServer = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await new Promise<void>((resolve) => server.once('listening', resolve));
  server.on('connection', (ws) => {
    if (offline) {
      ws.close();
      return;
    }
    ws.send(JSON.stringify({ event: 'ms.channel.connect', data: { token: 'integration-token' } }));
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('fake TV did not bind a TCP port');
  }
  return {
    port: address.port,
    setOffline(value: boolean) {
      offline = value;
      if (value) {
        for (const client of server.clients) client.close();
      }
    },
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

let app: FastifyInstance;
let staticRoot: string;
let baseUrl: string;
let wsUrl: string;
let ssdp: StubSsdpTransport;
let fakeTv: Awaited<ReturnType<typeof createFakeTv>>;

before(async () => {
  staticRoot = await mkdtemp(join(tmpdir(), 'mytv-session-int-'));
  await writeFile(join(staticRoot, 'index.html'), '<!doctype html><title>x</title>');
  const tokenDir = await mkdtemp(join(tmpdir(), 'mytv-session-tokens-'));
  const tokenStore = createTokenStore({ path: join(tokenDir, 'tokens.json') });

  fakeTv = await createFakeTv();
  // The session manager ignores the registry's `device.port` for the
  // control connection (design.md D3) — point the test UDN at the fake
  // TV via the per-UDN env override instead.
  process.env[`MYTV_CONTROL_PORT_${description.udn}`] = String(fakeTv.port);

  ssdp = new StubSsdpTransport();

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
      sessionOptions: {
        heartbeatIntervalMs: 25,
        reconnectDelaysMs: [5, 5, 5, 5, 5],
        pingTimeoutMs: 20,
        handshakeTimeoutMs: 50,
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

  // Seed the registry with a device so the manager can find its ip/udn.
  const firstAdded = once(app.discovery.registry as unknown as EventEmitter, 'added');
  ssdp.emitHit({
    location: SAMSUNG_LOCATION,
    st: 'urn:test',
    usn: 'uuid:test-samsung-1::urn:samsung.com:device:MediaRenderer:1',
    source: 'msearch',
  });
  await firstAdded;
});

after(async () => {
  await app.close();
  await fakeTv.close();
  await rm(staticRoot, { recursive: true, force: true });
  delete process.env[`MYTV_CONTROL_PORT_${description.udn}`];
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
  // Reset to Disconnected so we can observe a fresh Connecting → Connected
  // cycle over the WS (the device is already Connected from the previous test).
  await fetch(`${baseUrl}/api/devices/${description.udn}/disconnect`, { method: 'POST' });

  const socket = new WebSocket(wsUrl);
  const messages: Array<Record<string, unknown>> = [];
  const done = new Promise<void>((resolve, reject) => {
    socket.once('error', reject);
    socket.on('message', (raw) => {
      const parsed = JSON.parse(raw.toString('utf8')) as Record<string, unknown>;
      messages.push(parsed);
      if (parsed.event === 'snapshot') {
        // Kick off a fresh connect from inside the handler.
        void fetch(`${baseUrl}/api/devices/${description.udn}/connect`, { method: 'POST' });
      }
      if (
        parsed.event === 'session' &&
        parsed.udn === description.udn &&
        parsed.state === 'Connected'
      ) {
        resolve();
      }
    });
  });
  await once(socket, 'open');
  await done;
  socket.close();

  const sessionEvents = messages.filter((m) => m.event === 'session' && m.udn === description.udn);
  // Must see at least Connecting followed by Connected — Reconnecting must NEVER appear.
  const states = sessionEvents.map((m) => m.state);
  assert.ok(states.includes('Connecting'), `expected Connecting in ${JSON.stringify(states)}`);
  assert.ok(states.includes('Connected'), `expected Connected in ${JSON.stringify(states)}`);
  assert.ok(!states.includes('Reconnecting'), 'Reconnecting must NEVER leak to clients');
});

test('heartbeat failure that never recovers ends in Disconnected (retry cap)', async () => {
  // The device is Connected from the previous test. Simulate the TV going
  // away: close the live socket and refuse every reconnect attempt.
  fakeTv.setOffline(true);
  // Give the heartbeat + retries plenty of ticks to exhaust the cap.
  await new Promise((r) => setTimeout(r, 500));
  const res = await fetch(`${baseUrl}/api/devices/${description.udn}/session`);
  const body = (await res.json()) as { state: string };
  assert.equal(body.state, 'Disconnected');
  fakeTv.setOffline(false);
});

test('no HTTP response body contains the pairing token', async () => {
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
