import { EventEmitter } from 'node:events';
import { HttpError } from '../errors.js';
import type { SessionManager } from './manager.js';
import { keyControlParams, type SamsungKeyCode } from './keys.js';
import type { SessionState } from './types.js';

/**
 * Per-TV volume tracker.
 *
 * Samsung's Smart View WebSocket (the transport this repo pivoted to in
 * `smart-view-ws-transport`) is remote-key-only — there is no way to read
 * actual level or actual mute state over the WS. So `level` is always
 * `null` and `muted` is a purely optimistic server-side flag that flips
 * on every successful `POST /mute`. See design.md D1/D2 for the full
 * rationale, and Non-Goals for what would be needed (UPnP
 * `RenderingControl` or SmartThings) to make level real.
 */
export interface VolumeState {
  level: null;
  muted: boolean;
}

export interface VolumeSnapshot {
  udn: string;
  state: VolumeState;
}

export const DELTA_MAX_MAGNITUDE = 25;

/**
 * Guard for `POST /volume/delta`. Non-zero integer in [-25, 25].
 * Anything else → throws `HttpError.badRequest` (mapped to a 400 with
 * `code: "validation"` by `errorHandler`). Same 400-before-touching-the-TV
 * discipline as `remote-control-keys`.
 */
export function validateDelta(delta: unknown): number {
  if (typeof delta !== 'number' || !Number.isInteger(delta)) {
    throw HttpError.badRequest('delta must be an integer');
  }
  if (delta === 0) {
    throw HttpError.badRequest('delta must be non-zero');
  }
  if (Math.abs(delta) > DELTA_MAX_MAGNITUDE) {
    throw HttpError.badRequest(`delta magnitude must be <= ${DELTA_MAX_MAGNITUDE}`);
  }
  return delta;
}

export interface VolumeModule {
  get(udn: string): VolumeState;
  /** Enqueue `abs(delta)` KEY_VOLUP/DOWN frames on the per-TV FIFO. */
  delta(udn: string, delta: number): Promise<void>;
  /** Enqueue one KEY_MUTE frame, flip the optimistic tracker, emit `changed`. */
  toggleMute(udn: string): Promise<void>;
  snapshot(): VolumeSnapshot[];
  on(event: 'changed', listener: (snapshot: VolumeSnapshot) => void): this;
  off(event: 'changed', listener: (snapshot: VolumeSnapshot) => void): this;
  close(): void;
}

const DEFAULT_STATE: VolumeState = { level: null, muted: false };

export function createVolumeModule(sessionManager: SessionManager): VolumeModule {
  const emitter = new EventEmitter();
  const states = new Map<string, VolumeState>();

  function ensureState(udn: string): VolumeState {
    let state = states.get(udn);
    if (!state) {
      state = { ...DEFAULT_STATE };
      states.set(udn, state);
    }
    return state;
  }

  function emit(udn: string, state: VolumeState): void {
    emitter.emit('changed', { udn, state } satisfies VolumeSnapshot);
  }

  async function sendKey(udn: string, key: SamsungKeyCode): Promise<void> {
    const session = sessionManager.get(udn) ?? sessionManager.ensure(udn);
    if (!session) throw HttpError.notFound(`unknown UDN: ${udn}`);
    if (session.getState().kind !== 'Connected') {
      throw new HttpError(409, 'SessionNotConnected', 'session is not connected');
    }
    await session.enqueue((transport) =>
      transport.call('ms.remote.control', keyControlParams(key)),
    );
  }

  async function delta(udn: string, deltaValue: number): Promise<void> {
    const magnitude = Math.abs(deltaValue);
    const key: SamsungKeyCode = deltaValue > 0 ? 'KEY_VOLUP' : 'KEY_VOLDOWN';
    for (let i = 0; i < magnitude; i += 1) {
      // Each iteration awaits so the per-TV FIFO queue enqueues in order.
      await sendKey(udn, key);
    }
    // Level is unknowable over Smart View — re-emit so the WS reflects any
    // side-effects a listener may want (currently just "still null, still
    // whatever muted is"). Cheap and keeps the event contract uniform.
    emit(udn, ensureState(udn));
  }

  async function toggleMute(udn: string): Promise<void> {
    await sendKey(udn, 'KEY_MUTE');
    const state = ensureState(udn);
    state.muted = !state.muted;
    emit(udn, state);
  }

  const onSessionState = ({ udn, state }: { udn: string; state: SessionState }): void => {
    if (state.kind === 'Connected') {
      emit(udn, ensureState(udn));
    } else if (state.kind === 'Disconnected' || state.kind === 'Offline') {
      // Clear the tracker so a fresh Connect starts from `muted: false`.
      // Level is always null so there's nothing else to reset.
      states.delete(udn);
      emit(udn, { ...DEFAULT_STATE });
    }
  };

  sessionManager.on('state', onSessionState);

  return Object.assign(emitter, {
    get(udn: string): VolumeState {
      // Read-only: return the default for an unknown UDN without
      // inserting into the map. The tracker is populated lazily by
      // `sendKey`'s call to `ensureState` after a mutation, keyed by
      // real session activity.
      const state = states.get(udn);
      return state ? { ...state } : { ...DEFAULT_STATE };
    },
    delta,
    toggleMute,
    snapshot(): VolumeSnapshot[] {
      return [...states.entries()].map(([udn, state]) => ({
        udn,
        state: { ...state },
      }));
    },
    close(): void {
      sessionManager.off('state', onSessionState);
      states.clear();
    },
  }) as VolumeModule;
}
