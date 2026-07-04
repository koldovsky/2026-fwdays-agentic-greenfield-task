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
