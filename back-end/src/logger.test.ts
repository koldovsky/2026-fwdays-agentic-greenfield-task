import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Writable } from 'node:stream';
import { createLogger } from './logger.js';

function captureLogger() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  return { logger: createLogger(stream), output: () => chunks.join('') };
}

test('redacts a top-level AccessToken', () => {
  const { logger, output } = captureLogger();
  logger.info({ AccessToken: 'S3CR3T' }, 'top-level token');
  assert.ok(!output().includes('S3CR3T'));
});

test('redacts a deeply nested AccessToken', () => {
  const { logger, output } = captureLogger();
  logger.info(
    { req: { body: { params: { AccessToken: 'N3ST3D' } } } },
    'nested token',
  );
  assert.ok(!output().includes('N3ST3D'));
});

test('redacts AccessToken inside a JSON-RPC params payload', () => {
  const { logger, output } = captureLogger();
  logger.info(
    {
      rpcId: 42,
      method: 'powerControl',
      params: { power: 'on', AccessToken: 'SESSION-T0K3N' },
      origin: 'https://10.0.0.42:1516',
    },
    'jsonrpc request',
  );
  assert.ok(!output().includes('SESSION-T0K3N'));
  // The rpcId + method should still be in the log for correlation.
  assert.ok(output().includes('"rpcId":42'));
  assert.ok(output().includes('powerControl'));
});

test('redacts a lower-case `token` key (Smart View pairing token)', () => {
  const { logger, output } = captureLogger();
  logger.info({ event: 'ms.channel.connect', data: { token: 'SMART-VIEW-T0K3N' } }, 'pairing ack');
  assert.ok(!output().includes('SMART-VIEW-T0K3N'));
});

test('elides a token=... query fragment inside a logged URL string', () => {
  const { logger, output } = captureLogger();
  logger.info(
    { url: 'ws://10.0.0.42:8001/api/v2/channels/samsung.remote.control?name=bXl0dg==&token=SECRET-URL-T0K3N' },
    'connecting',
  );
  assert.ok(!output().includes('SECRET-URL-T0K3N'));
  // The rest of the URL — including the other query param — must survive.
  assert.ok(output().includes('samsung.remote.control'));
  assert.ok(output().includes('name=bXl0dg=='));
});
