import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shouldFetch } from './index.js';

test('Samsung-shaped USN passes', () => {
  assert.equal(
    shouldFetch({ usn: 'uuid:abc::urn:samsung.com:device:MediaRenderer:1', st: 'urn:test' }),
    true,
  );
});

test('Samsung-shaped SERVER header passes', () => {
  assert.equal(
    shouldFetch({ usn: 'uuid:abc', st: 'urn:test', server: 'Linux/1.0 UPnP/1.0 Samsung/1.0' }),
    true,
  );
});

test('Sonos-shaped headers fail', () => {
  assert.equal(
    shouldFetch({
      usn: 'uuid:RINCON_123::urn:schemas-upnp-org:device:ZonePlayer:1',
      st: 'urn:schemas-upnp-org:device:ZonePlayer:1',
      server: 'Linux UPnP/1.0 Sonos/60.1',
    }),
    false,
  );
});

test('printer-shaped headers fail', () => {
  assert.equal(
    shouldFetch({
      usn: 'uuid:printer-1::urn:schemas-upnp-org:device:Printer:1',
      st: 'urn:schemas-upnp-org:device:Printer:1',
      server: 'HP-ChaiSOE/1.0 UPnP/1.0',
    }),
    false,
  );
});

test('empty-header hit fails safely (falls through to post-fetch filter)', () => {
  assert.equal(shouldFetch({}), true);
  assert.equal(shouldFetch({ usn: '', st: '' }), true);
});
