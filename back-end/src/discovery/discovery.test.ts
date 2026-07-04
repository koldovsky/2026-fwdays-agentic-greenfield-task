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
import type { SsdpHit, SsdpTransport } from './ssdp.js';
import type { DeviceDescription } from './description.js';

class StubSsdpTransport extends EventEmitter implements SsdpTransport {
  searched: string[] = [];
  started = 0;
  stopped = 0;

  async start(): Promise<void> {
    this.started += 1;
  }

  async stop(): Promise<void> {
    this.stopped += 1;
  }

  search(st: string): void {
    this.searched.push(st);
  }

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

const SAMSUNG_LOCATION = 'http://192.168.1.42:9197/dmr';
const SONOS_LOCATION = 'http://192.168.1.77:1400/xml/device_description.xml';
const SECOND_SAMSUNG_LOCATION = 'http://192.168.1.55:9197/dmr';

const descriptions: Record<string, DeviceDescription | null> = {
  [SAMSUNG_LOCATION]: {
    udn: 'samsung-1',
    name: 'Living Room',
    model: 'UN65KS8500',
    manufacturer: 'Samsung Electronics',
    modelName: 'UN65KS8500',
  },
  [SONOS_LOCATION]: {
    udn: 'sonos-1',
    name: 'Kitchen',
    model: 'Sonos One',
    manufacturer: 'Sonos, Inc.',
    modelName: 'Sonos One',
  },
  [SECOND_SAMSUNG_LOCATION]: {
    udn: 'samsung-2',
    name: 'Bedroom',
    model: 'QN65Q80',
    manufacturer: 'Samsung Electronics',
    modelName: 'QN65Q80',
  },
};

async function stubFetchDescription(location: string): Promise<DeviceDescription | null> {
  return descriptions[location] ?? null;
}

let app: FastifyInstance;
let staticRoot: string;
let baseUrl: string;
let wsUrl: string;
let transport: StubSsdpTransport;

before(async () => {
  staticRoot = await mkdtemp(join(tmpdir(), 'mytv-discovery-'));
  await writeFile(join(staticRoot, 'index.html'), '<!doctype html><title>mytv</title>');

  transport = new StubSsdpTransport();

  app = await createApp({
    staticRoot,
    serveSpa: true,
    mdns: {
      client: stubMdnsClient(),
      pollIntervalMs: 0,
      networkInterfaces: () => ({}),
    },
    discovery: {
      transport,
      fetchDescription: stubFetchDescription,
      searchIntervalMs: 60_000,
      offlineSweepIntervalMs: 60_000,
    },
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('test server did not bind a TCP port');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
  wsUrl = `ws://127.0.0.1:${address.port}/ws`;

  // Emit the two initial hits (one Samsung, one Sonos). The registry
  // fires `added` for every Samsung — we await the first one to make
  // sure the queue has drained before we assert. The registry runtime
  // *is* an EventEmitter (Object.assign(emitter, ...)), even though the
  // public interface only exposes `on`/`off`.
  const firstAdded = once(app.discovery.registry as unknown as EventEmitter, 'added');
  transport.emitHit({ location: SAMSUNG_LOCATION, st: 'urn:test', usn: 'usn-1', source: 'msearch' });
  transport.emitHit({ location: SONOS_LOCATION, st: 'urn:test', usn: 'usn-2', source: 'msearch' });
  await firstAdded;
});

after(async () => {
  await app.close();
  await rm(staticRoot, { recursive: true, force: true });
});

test('discovery starts, filters out non-Samsung, GET /api/devices returns only Samsung', async () => {
  const response = await fetch(`${baseUrl}/api/devices`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as Array<Record<string, unknown>>;
  assert.equal(body.length, 1);
  const [device] = body;
  assert.equal(device!.udn, 'samsung-1');
  assert.equal(device!.name, 'Living Room');
  assert.equal(device!.model, 'UN65KS8500');
  assert.equal(device!.ip, '192.168.1.42');
  assert.equal(device!.port, 9197);
  assert.equal(device!.status, 'online');
});

test('GET /api/devices response body carries no AccessToken (BC / house-rule)', async () => {
  const response = await fetch(`${baseUrl}/api/devices`);
  const text = await response.text();
  assert.equal(/accesstoken/i.test(text), false);
});

test('discovery kicks off an initial M-SEARCH inside onReady', () => {
  // The stub records every search. onReady fires the initial M-SEARCH
  // before app.listen() resolves, so by now `searched` must be non-empty.
  assert.ok(transport.searched.length > 0);
});

test('WebSocket client receives a snapshot on connect then an added event for a new UDN', async () => {
  const socket = new WebSocket(wsUrl);
  try {
    const messages: string[] = [];
    const collected = new Promise<void>((resolve, reject) => {
      const onMessage = (data: Buffer | string): void => {
        const raw = typeof data === 'string' ? data : data.toString('utf8');
        messages.push(raw);
        // First message must be the snapshot. Once it arrives, kick off
        // the "new UDN" hit so the second message is the `added` event.
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (parsed.event === 'snapshot') {
          transport.emitHit({
            location: SECOND_SAMSUNG_LOCATION,
            st: 'urn:test',
            usn: 'usn-3',
            source: 'notify',
          });
        }
        if (parsed.event === 'added') {
          resolve();
        }
      };
      socket.once('error', reject);
      socket.on('message', onMessage);
    });
    await once(socket, 'open');
    await collected;

    const parsed = messages.map((m) => JSON.parse(m) as Record<string, unknown>);
    const snapshot = parsed.find((m) => m.event === 'snapshot');
    const added = parsed.find((m) => m.event === 'added');
    assert.ok(snapshot, 'expected a snapshot message');
    assert.equal(snapshot!.topic, 'devices');
    assert.ok(Array.isArray(snapshot!.devices));
    assert.ok(added, 'expected an added message');
    assert.equal(added!.topic, 'devices');
    const device = added!.device as Record<string, unknown>;
    assert.equal(device.udn, 'samsung-2');
  } finally {
    socket.close();
  }
});
