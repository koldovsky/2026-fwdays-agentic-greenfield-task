import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { createApp } from './app.js';

let app: FastifyInstance;
let staticRoot: string;
let baseUrl: string;

before(async () => {
  staticRoot = await mkdtemp(join(tmpdir(), 'mytv-spa-'));
  await writeFile(
    join(staticRoot, 'index.html'),
    '<!doctype html><title>mytv</title>',
  );

  app = await createApp({ staticRoot, serveSpa: true });
  await app.listen({ port: 0, host: '127.0.0.1' });

  const address = app.server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('test server did not bind to a TCP port');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await app.close();
  await rm(staticRoot, { recursive: true, force: true });
});

test('GET /api/health returns the ok envelope', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('GET /deep/route falls back to the SPA shell', async () => {
  const response = await fetch(`${baseUrl}/deep/route`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  const expected = await readFile(join(staticRoot, 'index.html'), 'utf8');
  assert.equal(await response.text(), expected);
});

test('GET /api/does-not-exist returns the JSON error envelope', async () => {
  const response = await fetch(`${baseUrl}/api/does-not-exist`);
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);

  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.code, 'not_found');
  assert.equal(typeof body.message, 'string');
  assert.equal(typeof body.correlationId, 'string');
  assert.equal('stack' in body, false);
});
