/**
 * Typed wrapper over the `HoneydoLiveActivity` local Expo module (ActivityKit bridge).
 *
 * The module is Apple-only and requires a Dev Client build (it can't run in Expo Go). This
 * wrapper resolves it optionally and degrades to no-ops when the module is absent — on
 * Android, in Expo Go, or on iOS < 16.2 — so the rest of the app can call it unconditionally
 * (TC-NATIVE-02). All timer/auth logic stays in JS + the server; the native side only
 * mirrors the running entry and forwards a "stop requested" signal.
 */
import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

/** Payload to start/replace the Live Activity for the running entry. */
export interface LiveActivityStart {
  entryId: string;
  title: string;
  /** ISO-8601 start timestamp; the OS renders elapsed from this. */
  startedAt: string;
}

/** Discrete update pushed on a title edit or running-state change. */
export interface LiveActivityUpdate {
  title: string;
  isRunning: boolean;
}

/** A stop tapped from the Live Activity, read from the shared App Group. */
export interface StopRequest {
  entryId: string;
  requestedAt: string;
}

interface HoneydoLiveActivityModule {
  readonly isSupported: boolean;
  start(input: LiveActivityStart): void;
  update(input: LiveActivityUpdate): void;
  end(): void;
  readPendingStop(): StopRequest | null;
  clearPendingStop(): void;
  addListener(
    eventName: 'onStopRequested',
    listener: (payload: StopRequest) => void,
  ): EventSubscription;
}

const native = requireOptionalNativeModule<HoneydoLiveActivityModule>('HoneydoLiveActivity');

/** True only when the native module is present and Live Activities are usable (iOS 16.2+). */
export const isLiveActivitySupported = native?.isSupported ?? false;

export const liveActivity = {
  isSupported: isLiveActivitySupported,

  start(input: LiveActivityStart): void {
    native?.start(input);
  },

  update(input: LiveActivityUpdate): void {
    native?.update(input);
  },

  end(): void {
    native?.end();
  },

  /** Any stop that fired while the app was backgrounded/terminated, for foreground reconcile. */
  readPendingStop(): StopRequest | null {
    return native?.readPendingStop() ?? null;
  },

  clearPendingStop(): void {
    native?.clearPendingStop();
  },

  /** Subscribe to in-place stops (iOS 17+). Returns a no-op subscription when unsupported. */
  addStopListener(listener: (payload: StopRequest) => void): EventSubscription {
    if (!native) return { remove() {} };
    return native.addListener('onStopRequested', listener);
  },
};
