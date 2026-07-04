import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSamsungTv, parseDescriptionXml } from './description.js';

const samsungXml = `<?xml version="1.0" encoding="utf-8"?>
<root xmlns="urn:schemas-upnp-org:device-1-0">
  <device>
    <UDN>uuid:11111111-2222-3333-4444-555555555555</UDN>
    <friendlyName>Living Room [TV]</friendlyName>
    <manufacturer>Samsung Electronics</manufacturer>
    <modelName>UN65KS8500</modelName>
    <modelNumber>UN65KS8500</modelNumber>
  </device>
</root>`;

const sonosXml = `<?xml version="1.0" encoding="utf-8"?>
<root xmlns="urn:schemas-upnp-org:device-1-0">
  <device>
    <UDN>uuid:RINCON-XXXXXXXXXXXX01400</UDN>
    <friendlyName>Kitchen</friendlyName>
    <manufacturer>Sonos, Inc.</manufacturer>
    <modelName>Sonos One</modelName>
    <modelNumber>S18</modelNumber>
  </device>
</root>`;

test('parses a Samsung TV description and passes the Samsung filter', () => {
  const parsed = parseDescriptionXml(samsungXml);
  assert.ok(parsed, 'expected the Samsung XML to parse');
  assert.equal(parsed!.udn, '11111111-2222-3333-4444-555555555555');
  assert.equal(parsed!.name, 'Living Room [TV]');
  assert.equal(parsed!.manufacturer, 'Samsung Electronics');
  assert.equal(parsed!.model, 'UN65KS8500');
  assert.equal(isSamsungTv(parsed!), true);
});

test('parses a Sonos description and rejects it via the Samsung filter', () => {
  const parsed = parseDescriptionXml(sonosXml);
  assert.ok(parsed, 'expected the Sonos XML to parse');
  assert.equal(isSamsungTv(parsed!), false);
});

test('returns null when the description XML has no UDN', () => {
  const xml = `<?xml version="1.0"?><root><device><friendlyName>x</friendlyName></device></root>`;
  assert.equal(parseDescriptionXml(xml), null);
});

test('Samsung filter accepts a Samsung model prefix even without the manufacturer string', () => {
  assert.equal(
    isSamsungTv({
      udn: 'x',
      name: 'x',
      manufacturer: 'Unknown',
      modelName: 'QN65Q80TAFXZA',
      model: 'QN65Q80TAFXZA',
    }),
    true,
  );
});
