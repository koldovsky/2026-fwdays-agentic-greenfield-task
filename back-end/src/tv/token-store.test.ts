import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTokenStore } from './token-store.js';

let tmp: string;
let path: string;

before(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'mytv-tokens-'));
  path = join(tmp, 'nested', 'tokens.json');
});
after(async () => {
  await rm(tmp, { recursive: true, force: true });
});

test('saveToken writes JSON with mode 0600 and round-trips through loadTokens', async () => {
  const store = createTokenStore({ path });
  await store.saveToken('udn-1', 'token-abc');
  await store.saveToken('udn-2', 'token-xyz');

  const st = await stat(path);
  // Only the low 12 permission bits are relevant.
  assert.equal(st.mode & 0o777, 0o600);

  const fresh = createTokenStore({ path });
  const loaded = await fresh.loadTokens();
  assert.deepEqual(loaded, { 'udn-1': 'token-abc', 'udn-2': 'token-xyz' });
});

test('loadTokens returns {} when the file does not exist', async () => {
  const store = createTokenStore({ path: join(tmp, 'missing.json') });
  const loaded = await store.loadTokens();
  assert.deepEqual(loaded, {});
});
