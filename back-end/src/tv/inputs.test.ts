import assert from 'node:assert/strict';
import { test } from 'node:test';
import { INPUT_CATALOGUE, INPUT_KEYS } from './inputs.js';

test('INPUT_CATALOGUE includes at minimum KEY_SOURCE, KEY_HDMI1, KEY_TV', () => {
  const ids = new Set(INPUT_CATALOGUE.map((e) => e.id));
  assert.ok(ids.has('KEY_SOURCE'));
  assert.ok(ids.has('KEY_HDMI1'));
  assert.ok(ids.has('KEY_TV'));
});

test('every INPUT_CATALOGUE entry has a KEY_ id and a non-empty label', () => {
  for (const entry of INPUT_CATALOGUE) {
    assert.match(entry.id, /^KEY_/);
    assert.ok(entry.label.length > 0, `empty label for ${entry.id}`);
  }
});

test('INPUT_KEYS reflects INPUT_CATALOGUE ids in the same order', () => {
  assert.deepEqual(INPUT_KEYS, INPUT_CATALOGUE.map((e) => e.id));
});
