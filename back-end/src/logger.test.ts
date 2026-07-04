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
