import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import type { JsonRpcTransport } from './jsonrpc.js';
import type { Session } from './session.js';
import type { SessionManager, SessionSnapshot } from './manager.js';
import type { SessionState } from './types.js';
import { createVolumeModule, validateDelta } from './volume.js';

interface StubTransport extends JsonRpcTransport {
  calls: Array<{ method: string; params: Record<string, unknown> }>;
}

function makeStubTransport(): StubTransport {
  const stub: StubTransport = {
    calls: [],
    async call<T>(method: string, params: Record<string, unknown> = {}) {
      stub.calls.push({ method, params });
      return undefined as T;
    },
    async connectHandshake() {
      return {};
    },
    async ping() {},
    async close() {},
  };
  return stub;
}

interface StubSession extends Session {}

function makeStubSession(udn: string, transport: StubTransport): StubSession {
  const emitter = new EventEmitter();
  let state: SessionState = { kind: 'Connected', since: Date.now() };
  const session = Object.assign(emitter, {
    udn,
    async connect() {},
    async disconnect() {
      state = { kind: 'Disconnected' };
      emitter.emit('state', state);
    },
    async markOffline() {
      state = { kind: 'Offline' };
      emitter.emit('state', state);
    },
    markBackOnline() {
      state = { kind: 'Disconnected' };
      emitter.emit('state', state);
    },
    getState: () => state,
    setState(next: SessionState) {
      state = next;
      emitter.emit('state', next);
    },
    enqueue<T>(fn: (t: JsonRpcTransport) => Promise<T>): Promise<T> {
      return fn(transport);
    },
  }) as StubSession & { setState: (s: SessionState) => void };
  return session;
}

function makeStubManager(sessions: Map<string, StubSession>): SessionManager {
  const emitter = new EventEmitter();
  const manager = Object.assign(emitter, {
    ensure(udn: string) {
      return sessions.get(udn);
    },
    get(udn: string) {
      return sessions.get(udn);
    },
    snapshot(): SessionSnapshot[] {
      return [...sessions.entries()].map(([udn, s]) => ({ udn, state: s.getState() }));
    },
    async close() {},
  }) as SessionManager;
  // Wire each session's `state` event out to the manager's own emitter so
  // the volume module sees Connected/Disconnected transitions. The
  // manager was built via Object.assign(emitter, {...}) so the runtime
  // has EventEmitter methods even though the exported type omits them.
  const emit = (event: string, ...args: unknown[]): boolean =>
    (manager as unknown as EventEmitter).emit(event, ...args);
  for (const [udn, session] of sessions) {
    session.on('state', (state: SessionState) => {
      emit('state', { udn, state });
    });
  }
  return manager;
}

test('validateDelta rejects non-integers, zero, and out-of-range', () => {
  assert.throws(() => validateDelta(0), /non-zero/);
  assert.throws(() => validateDelta(1.5), /integer/);
  assert.throws(() => validateDelta('1'), /integer/);
  assert.throws(() => validateDelta(26), /magnitude/);
  assert.throws(() => validateDelta(-26), /magnitude/);
  assert.equal(validateDelta(1), 1);
  assert.equal(validateDelta(-1), -1);
  assert.equal(validateDelta(25), 25);
  assert.equal(validateDelta(-25), -25);
});

test('delta(+1) enqueues one KEY_VOLUP ms.remote.control frame', async () => {
  const transport = makeStubTransport();
  const session = makeStubSession('udn-a', transport);
  const manager = makeStubManager(new Map([['udn-a', session]]));
  const vol = createVolumeModule(manager);

  await vol.delta('udn-a', 1);
  assert.equal(transport.calls.length, 1);
  assert.equal(transport.calls[0]?.method, 'ms.remote.control');
  assert.equal(transport.calls[0]?.params.DataOfCmd, 'KEY_VOLUP');
});

test('delta(-1) enqueues one KEY_VOLDOWN', async () => {
  const transport = makeStubTransport();
  const session = makeStubSession('udn-a', transport);
  const manager = makeStubManager(new Map([['udn-a', session]]));
  const vol = createVolumeModule(manager);

  await vol.delta('udn-a', -1);
  assert.equal(transport.calls.length, 1);
  assert.equal(transport.calls[0]?.params.DataOfCmd, 'KEY_VOLDOWN');
});

test('delta(3) enqueues three KEY_VOLUP in order', async () => {
  const transport = makeStubTransport();
  const session = makeStubSession('udn-a', transport);
  const manager = makeStubManager(new Map([['udn-a', session]]));
  const vol = createVolumeModule(manager);

  await vol.delta('udn-a', 3);
  assert.equal(transport.calls.length, 3);
  for (const call of transport.calls) {
    assert.equal(call.params.DataOfCmd, 'KEY_VOLUP');
  }
});

test('toggleMute enqueues KEY_MUTE and flips tracker; two toggles restore', async () => {
  const transport = makeStubTransport();
  const session = makeStubSession('udn-a', transport);
  const manager = makeStubManager(new Map([['udn-a', session]]));
  const vol = createVolumeModule(manager);

  assert.equal(vol.get('udn-a').muted, false);
  await vol.toggleMute('udn-a');
  assert.equal(transport.calls.length, 1);
  assert.equal(transport.calls[0]?.params.DataOfCmd, 'KEY_MUTE');
  assert.equal(vol.get('udn-a').muted, true);

  await vol.toggleMute('udn-a');
  assert.equal(transport.calls.length, 2);
  assert.equal(vol.get('udn-a').muted, false);
});

test('POST while Disconnected throws SessionNotConnected without enqueuing', async () => {
  const transport = makeStubTransport();
  const session = makeStubSession('udn-a', transport) as StubSession & {
    setState: (s: SessionState) => void;
  };
  session.setState({ kind: 'Disconnected' });
  const manager = makeStubManager(new Map([['udn-a', session]]));
  const vol = createVolumeModule(manager);

  await assert.rejects(vol.delta('udn-a', 1), /not connected/);
  await assert.rejects(vol.toggleMute('udn-a'), /not connected/);
  assert.equal(transport.calls.length, 0);
});

test('level is null in every emitted snapshot', async () => {
  const transport = makeStubTransport();
  const session = makeStubSession('udn-a', transport);
  const manager = makeStubManager(new Map([['udn-a', session]]));
  const vol = createVolumeModule(manager);

  const seen: Array<{ udn: string; level: unknown; muted: boolean }> = [];
  vol.on('changed', (snap) => {
    seen.push({ udn: snap.udn, level: snap.state.level, muted: snap.state.muted });
  });

  await vol.toggleMute('udn-a');
  await vol.delta('udn-a', 2);
  assert.ok(seen.length >= 2);
  for (const s of seen) assert.equal(s.level, null);
});

test('session Connected emits an initial snapshot; Disconnected resets muted to false', async () => {
  const transport = makeStubTransport();
  const session = makeStubSession('udn-a', transport) as StubSession & {
    setState: (s: SessionState) => void;
  };
  session.setState({ kind: 'Disconnected' });
  const manager = makeStubManager(new Map([['udn-a', session]]));
  const vol = createVolumeModule(manager);

  const seen: Array<{ udn: string; state: { muted: boolean } }> = [];
  vol.on('changed', (snap) => seen.push({ udn: snap.udn, state: { muted: snap.state.muted } }));

  session.setState({ kind: 'Connected', since: Date.now() });
  await vol.toggleMute('udn-a');
  assert.equal(vol.get('udn-a').muted, true);

  // Drop the session; the tracker must reset so a reconnect starts fresh.
  session.setState({ kind: 'Disconnected' });
  assert.equal(vol.get('udn-a').muted, false);
  // The disconnect must also have emitted a `changed` event.
  const lastMuted = seen[seen.length - 1]?.state.muted;
  assert.equal(lastMuted, false);
});
