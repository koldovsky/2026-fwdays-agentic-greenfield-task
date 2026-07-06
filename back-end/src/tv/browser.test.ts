import assert from 'node:assert/strict';
import { test } from 'node:test';
import { launchBrowserParams } from './browser.js';

test('launchBrowserParams produces the Smart View ed.apps.launch envelope for google.com', () => {
  assert.deepEqual(launchBrowserParams('https://www.google.com'), {
    event: 'ed.apps.launch',
    to: 'host',
    data: {
      appId: 'org.tizen.browser',
      action_type: 'NATIVE_LAUNCH',
      metaTag: 'https://www.google.com',
    },
  });
});

test('changing only the URL only mutates data.metaTag', () => {
  const a = launchBrowserParams('https://www.google.com');
  const b = launchBrowserParams('http://192.168.1.10/dashboard');
  const dataA = (a as { data: Record<string, unknown> }).data;
  const dataB = (b as { data: Record<string, unknown> }).data;
  assert.equal((a as { event: string }).event, (b as { event: string }).event);
  assert.equal((a as { to: string }).to, (b as { to: string }).to);
  assert.equal(dataA.appId, dataB.appId);
  assert.equal(dataA.action_type, dataB.action_type);
  assert.notEqual(dataA.metaTag, dataB.metaTag);
  assert.equal(dataA.metaTag, 'https://www.google.com');
  assert.equal(dataB.metaTag, 'http://192.168.1.10/dashboard');
});
