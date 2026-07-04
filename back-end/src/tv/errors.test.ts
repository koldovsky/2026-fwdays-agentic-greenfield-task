import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapRpcErrorCode, mapTransportError, TvError, toHttpEnvelope } from './errors.js';

test('maps standard JSON-RPC error codes to domain codes', () => {
  assert.equal(mapRpcErrorCode(-32601), 'TvNotSupported');
  assert.equal(mapRpcErrorCode(-32602), 'TvInvalidOp');
});

test('maps Samsung server-error range to TvFailed / TvUnknown', () => {
  assert.equal(mapRpcErrorCode(-32000), 'TvFailed');
  assert.equal(mapRpcErrorCode(-32001), 'TvNotSupported');
  assert.equal(mapRpcErrorCode(-32002), 'TvFailed');
  assert.equal(mapRpcErrorCode(-32003), 'TvInvalidOp');
  assert.equal(mapRpcErrorCode(-32050), 'TvFailed');
  assert.equal(mapRpcErrorCode(-99999), 'TvUnknown');
});

test('every domain code has a fixed HTTP status matching design D5', () => {
  const cases: Array<[TvError, number]> = [
    [new TvError('TvNotReachable', 'x'), 502],
    [new TvError('TvNotSupported', 'x'), 501],
    [new TvError('TvFailed', 'x'), 500],
    [new TvError('TvInvalidOp', 'x'), 400],
    [new TvError('TvUnknown', 'x'), 500],
  ];
  for (const [err, expected] of cases) {
    assert.equal(err.httpStatus, expected, `expected ${err.code} → ${expected}`);
  }
});

test('mapTransportError produces a TvNotReachable envelope with no raw code leak', () => {
  const tv = mapTransportError(new Error('connect ECONNREFUSED'), 42);
  assert.equal(tv.code, 'TvNotReachable');
  assert.equal(tv.rpcId, 42);
  assert.equal(tv.rawCode, undefined);

  const envelope = toHttpEnvelope(tv, 'req-abc');
  assert.equal(envelope.status, 502);
  assert.equal(envelope.body.code, 'TvNotReachable');
  assert.equal(envelope.body.correlationId, 'req-abc');
  assert.equal(
    JSON.stringify(envelope.body).includes('-32'),
    false,
    'envelope must not carry any -32xxx substring',
  );
});
