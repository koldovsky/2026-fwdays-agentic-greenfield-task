import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDeviceRegistry, type Device } from './registry.js';

test('upsert with same UDN and new IP updates the IP without duplicating rows', () => {
  const registry = createDeviceRegistry();
  registry.upsert(
    { udn: 'abc', name: 'Living Room', model: 'UN65', ip: '192.168.1.42', port: 8001 },
    1_000,
  );
  registry.upsert(
    { udn: 'abc', name: 'Living Room', model: 'UN65', ip: '192.168.1.99', port: 8001 },
    2_000,
  );

  const snap = registry.snapshot();
  assert.equal(snap.length, 1);
  assert.equal(snap[0]!.udn, 'abc');
  assert.equal(snap[0]!.ip, '192.168.1.99');
  assert.equal(snap[0]!.lastSeen, 2_000);
});

test('upsert emits `added` on new UDN and `updated` on re-upsert', () => {
  const registry = createDeviceRegistry();
  const events: Array<{ kind: string; udn: string }> = [];
  registry.on('added', (d: Device) => events.push({ kind: 'added', udn: d.udn }));
  registry.on('updated', (d: Device) => events.push({ kind: 'updated', udn: d.udn }));

  registry.upsert({ udn: 'abc', name: 'n', model: null, ip: '1.1.1.1', port: 80 });
  registry.upsert({ udn: 'abc', name: 'n', model: null, ip: '1.1.1.2', port: 80 });

  assert.deepEqual(events, [
    { kind: 'added', udn: 'abc' },
    { kind: 'updated', udn: 'abc' },
  ]);
});

test('markOfflineOlderThan flips status and emits `offline`', () => {
  const registry = createDeviceRegistry();
  const offlineEvents: Device[] = [];
  registry.on('offline', (d) => offlineEvents.push(d));

  registry.upsert(
    { udn: 'stale', name: 'n', model: null, ip: '1.1.1.1', port: 80 },
    /* now = */ 0,
  );
  registry.upsert(
    { udn: 'fresh', name: 'n', model: null, ip: '1.1.1.2', port: 80 },
    /* now = */ 100_000,
  );

  const flipped = registry.markOfflineOlderThan(60_000, /* now = */ 120_000);

  assert.equal(flipped.length, 1);
  assert.equal(flipped[0]!.udn, 'stale');
  assert.equal(offlineEvents.length, 1);
  assert.equal(offlineEvents[0]!.udn, 'stale');

  const snap = registry.snapshot();
  const stale = snap.find((d) => d.udn === 'stale')!;
  const fresh = snap.find((d) => d.udn === 'fresh')!;
  assert.equal(stale.status, 'offline');
  assert.equal(fresh.status, 'online');
});

test('a second sweep does not re-emit `offline` for the same device', () => {
  const registry = createDeviceRegistry();
  const offlineEvents: Device[] = [];
  registry.on('offline', (d) => offlineEvents.push(d));

  registry.upsert({ udn: 'x', name: 'n', model: null, ip: '1.1.1.1', port: 80 }, 0);
  registry.markOfflineOlderThan(60_000, 120_000);
  registry.markOfflineOlderThan(60_000, 180_000);

  assert.equal(offlineEvents.length, 1);
});
