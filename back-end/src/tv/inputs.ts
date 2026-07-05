import { EventEmitter } from 'node:events';
import { HttpError } from '../errors.js';
import type { SessionManager } from './manager.js';
import { keyControlParams, type SamsungKeyCode } from './keys.js';

/**
 * The `SamsungKeyCode` subset that represents an input-selection key
 * on Samsung's Tizen 2016+ remote vocabulary. Kept separate from the
 * C6/`SAMSUNG_KEY_CODES` public list and the C7/`VOLUME_KEY_CODES`
 * list so each capability's route can only accept the keys it owns.
 * The type alias below narrows `SamsungKeyCode` to just these values.
 */
export type SamsungInputKey =
  | 'KEY_SOURCE'
  | 'KEY_HDMI'
  | 'KEY_HDMI1'
  | 'KEY_HDMI2'
  | 'KEY_HDMI3'
  | 'KEY_HDMI4'
  | 'KEY_TV'
  | 'KEY_AV1'
  | 'KEY_COMPONENT1';

// Compile-time guard: every SamsungInputKey is also a SamsungKeyCode so
// `keyControlParams` accepts them without a cast.
const _typeCheck: SamsungInputKey extends SamsungKeyCode ? true : false = true;
void _typeCheck;

export interface InputCatalogueEntry {
  id: SamsungInputKey;
  label: string;
}

/**
 * Curated catalogue of Samsung input-selection keys. Static per install —
 * Smart View WS cannot report which inputs a given TV physically has, so
 * we show the union of common Samsung inputs and let the TV ignore ones
 * it doesn't support (a no-op on the wire). Order matters: it's the
 * order rows appear in the picker.
 */
export const INPUT_CATALOGUE: readonly InputCatalogueEntry[] = [
  { id: 'KEY_SOURCE', label: 'Source picker' },
  { id: 'KEY_HDMI1', label: 'HDMI 1' },
  { id: 'KEY_HDMI2', label: 'HDMI 2' },
  { id: 'KEY_HDMI3', label: 'HDMI 3' },
  { id: 'KEY_HDMI4', label: 'HDMI 4' },
  { id: 'KEY_HDMI', label: 'HDMI (cycle)' },
  { id: 'KEY_TV', label: 'TV tuner' },
  { id: 'KEY_AV1', label: 'AV 1' },
  { id: 'KEY_COMPONENT1', label: 'Component 1' },
];

export const INPUT_KEYS: readonly SamsungInputKey[] = INPUT_CATALOGUE.map(
  (entry) => entry.id,
);

export interface InputSwitchEvent {
  udn: string;
  key: SamsungInputKey;
}

export interface InputsModule {
  /** Returns the static catalogue verbatim. */
  list(): readonly InputCatalogueEntry[];
  /**
   * Enqueue one `ms.remote.control` frame carrying `key` on the per-TV
   * FIFO. Emits `switched` on success. Throws `HttpError.notFound` if
   * the UDN is unknown, `HttpError(409, "SessionNotConnected", …)` if
   * the session is not `Connected`.
   */
  switch(udn: string, key: SamsungInputKey): Promise<void>;
  on(event: 'switched', listener: (e: InputSwitchEvent) => void): this;
  off(event: 'switched', listener: (e: InputSwitchEvent) => void): this;
}

export function createInputsModule(sessionManager: SessionManager): InputsModule {
  const emitter = new EventEmitter();

  async function switchInput(udn: string, key: SamsungInputKey): Promise<void> {
    const session = sessionManager.get(udn) ?? sessionManager.ensure(udn);
    if (!session) throw HttpError.notFound(`unknown UDN: ${udn}`);
    if (session.getState().kind !== 'Connected') {
      throw new HttpError(409, 'SessionNotConnected', 'session is not connected');
    }
    await session.enqueue((transport) =>
      transport.call('ms.remote.control', keyControlParams(key)),
    );
    emitter.emit('switched', { udn, key } satisfies InputSwitchEvent);
  }

  return Object.assign(emitter, {
    list(): readonly InputCatalogueEntry[] {
      return INPUT_CATALOGUE;
    },
    switch: switchInput,
  }) as InputsModule;
}
