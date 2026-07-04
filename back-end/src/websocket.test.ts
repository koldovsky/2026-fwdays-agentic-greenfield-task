import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { createApp } from './app.js';

let app: FastifyInstance;
let staticRoot: string;
let wsUrl: string;

before(async () => {
  staticRoot = await mkdtemp(join(tmpdir(), 'mytv-spa-'));
  app = await createApp({ staticRoot, serveSpa: false });
  await app.listen({ port: 0, host: '127.0.0.1' });

  const address = app.server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('test server did not bind to a TCP port');
  }
  wsUrl = `ws://127.0.0.1:${address.port}/ws`;
});

after(async () => {
  await app.close();
  await rm(staticRoot, { recursive: true, force: true });
});

test('WebSocket /ws exchanges ping/pong and closes cleanly', async () => {
  const socket = new WebSocket(wsUrl);

  const pong = await new Promise<string>((resolve, reject) => {
    socket.on('open', () => socket.send('ping'));
    socket.on('message', (data) => resolve(data.toString()));
    socket.on('error', reject);
  });
  assert.equal(pong, 'pong');

  const closeCode = await new Promise<number>((resolve) => {
    socket.on('close', (code) => resolve(code));
    socket.close(1000);
  });
  assert.equal(closeCode, 1000);
});
