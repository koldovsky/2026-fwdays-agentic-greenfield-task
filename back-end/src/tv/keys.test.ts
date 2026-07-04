import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keyControlParams } from './keys.js';

test('keyControlParams produces the Smart View Click envelope for KEY_UP', () => {
  assert.deepEqual(keyControlParams('KEY_UP'), {
    Cmd: 'Click',
    DataOfCmd: 'KEY_UP',
    Option: 'false',
    TypeOfRemote: 'SendRemoteKey',
  });
});

test('keyControlParams produces the Smart View Click envelope for KEY_ENTER', () => {
  assert.deepEqual(keyControlParams('KEY_ENTER'), {
    Cmd: 'Click',
    DataOfCmd: 'KEY_ENTER',
    Option: 'false',
    TypeOfRemote: 'SendRemoteKey',
  });
});

test('keyControlParams produces the Smart View Click envelope for KEY_POWER', () => {
  assert.deepEqual(keyControlParams('KEY_POWER'), {
    Cmd: 'Click',
    DataOfCmd: 'KEY_POWER',
    Option: 'false',
    TypeOfRemote: 'SendRemoteKey',
  });
});
