import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NetworkInterfaceInfo } from 'node:os';
import { startMdns, type MdnsClient, type MdnsService } from './mdns.js';

interface StubClient extends MdnsClient {
  published: Array<{ name: string; type: string; port: number; host?: string; txt?: Record<string, string> }>;
  stoppedServices: number;
  destroyed: number;
}

function makeStubClient(): StubClient {
  const stub: StubClient = {
    published: [],
    stoppedServices: 0,
    destroyed: 0,
    publish(opts): MdnsService {
      stub.published.push(opts);
      return {
        stop: () => {
          stub.stoppedServices += 1;
        },
      };
    },
    destroy(): void {
      stub.destroyed += 1;
    },
  };
  return stub;
}

function iface(address: string): Record<string, NetworkInterfaceInfo[]> {
  return {
    eth0: [
      {
        address,
        netmask: '255.255.255.0',
        family: 'IPv4',
        mac: 'aa:bb:cc:dd:ee:ff',
        internal: false,
        cidr: `${address}/24`,
      },
    ],
  };
}

test('startMdns publishes with mytv defaults and reports advertising', async () => {
  const client = makeStubClient();
  const handle = startMdns(3000, {
    client,
    networkInterfaces: () => iface('10.0.0.5'),
    pollIntervalMs: 0,
  });

  assert.equal(handle.state, 'advertising');
  assert.equal(handle.hostname, 'mytv.local');
  assert.equal(handle.address, '10.0.0.5');
  assert.equal(handle.error, undefined);
  assert.equal(client.published.length, 1);
  const record = client.published[0]!;
  assert.equal(record.type, 'http');
  assert.equal(record.port, 3000);
  assert.equal(record.host, 'mytv.local');
  assert.deepEqual(record.txt, { path: '/' });

  await handle.stop();
  assert.equal(handle.state, 'stopped');
  assert.equal(client.stoppedServices, 1);
  assert.equal(client.destroyed, 1);
});

test('interface-set change re-advertises with the new address', async () => {
  const client = makeStubClient();
  let current = iface('10.0.0.5');
  const handle = startMdns(3000, {
    client,
    networkInterfaces: () => current,
    pollIntervalMs: 0,
  });
  assert.equal(client.published.length, 1);
  assert.equal(handle.address, '10.0.0.5');

  // Simulate an interface flap by swapping the returned interface set and
  // firing the poll callback directly (the 5 s interval is disabled).
  current = iface('10.0.0.42');
  handle.triggerInterfaceCheck();

  assert.equal(client.published.length, 2, 'expected a fresh advertise call');
  assert.equal(client.stoppedServices, 1, 'expected the previous service to be stopped first');
  assert.equal(handle.address, '10.0.0.42');
  assert.equal(handle.state, 'advertising');

  await handle.stop();
});

test('no re-advertise when the interface set is unchanged', async () => {
  const client = makeStubClient();
  const handle = startMdns(3000, {
    client,
    networkInterfaces: () => iface('10.0.0.5'),
    pollIntervalMs: 0,
  });
  handle.triggerInterfaceCheck();
  handle.triggerInterfaceCheck();
  assert.equal(client.published.length, 1);
  await handle.stop();
});

test('publish failure leaves the handle in error state without throwing', async () => {
  const failingClient: MdnsClient = {
    publish() {
      const err = new Error('bind EADDRINUSE 0.0.0.0:5353');
      (err as NodeJS.ErrnoException).code = 'EADDRINUSE';
      throw err;
    },
    destroy() {},
  };
  const handle = startMdns(3000, {
    client: failingClient,
    networkInterfaces: () => iface('10.0.0.5'),
    pollIntervalMs: 0,
  });
  assert.equal(handle.state, 'error');
  assert.match(handle.error ?? '', /EADDRINUSE/);
  assert.equal(handle.address, undefined);
  await handle.stop();
});
