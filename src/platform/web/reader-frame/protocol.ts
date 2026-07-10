// The app <-> reader-frame bridge protocol (ADR-013). Shared by the app-side navigator proxy
// (`src/plugins/formats/epub/navigator-proxy.ts`) and the in-frame harness (`./harness.ts`).
//
// Every payload here is plain, structured-cloneable, NEUTRAL data — `Locator` / `Publication` /
// `ReadingPreferences` / book bytes. No DOM nodes, no live renderer handles, and NEVER any credential:
// the app holds `edda.creds.*`; the frame never receives it. Book bytes cross ONCE as a Transferable
// `ArrayBuffer` (zero-copy, ADR-005 — bridged, never SW-intercepted), carried by the `open` command.

import type { Locator, Publication, ReadingPreferences } from '@/core/model'

/**
 * The one window-level handshake message the app posts to the frame's `contentWindow` (with an explicit
 * `targetOrigin = READER_ORIGIN`, never `*`), transferring a single `MessagePort`. Thereafter all traffic
 * is over that point-to-point port (the capability) and is no longer origin-checked — see
 * {@link shouldAcceptInit}.
 */
export const READER_INIT = 'edda:reader-frame:init'

export interface ReaderInitMessage {
  readonly type: typeof READER_INIT
}

/**
 * SECURITY (modern-web-guidance §1.5): the frame accepts the transferred port ONLY when the handshake
 * arrives from the configured app origin and is the expected init message. `appOrigin` unset ⇒ reject
 * everything (fail closed — an unconfigured frame binds to nothing). Origin is validated HERE, at the
 * window handshake; port messages thereafter carry `origin === ''` and are trusted as the capability.
 */
export function shouldAcceptInit(
  origin: string,
  data: unknown,
  appOrigin: string | undefined,
): boolean {
  if (!appOrigin || origin !== appOrigin) return false
  return (
    typeof data === 'object' && data !== null && (data as { type?: unknown }).type === READER_INIT
  )
}

/** App -> frame commands over the MessagePort. Each carries a correlation `id` for its `result`. */
export type ReaderCommand =
  | {
      readonly type: 'open'
      readonly id: number
      readonly buffer: ArrayBuffer
      readonly preferences?: ReadingPreferences
    }
  | { readonly type: 'goTo'; readonly id: number; readonly locator: Locator }
  | { readonly type: 'next'; readonly id: number }
  | { readonly type: 'prev'; readonly id: number }
  | { readonly type: 'seek'; readonly id: number; readonly fraction: number }
  | {
      readonly type: 'applyPreferences'
      readonly id: number
      readonly preferences: ReadingPreferences
    }
  | { readonly type: 'destroy'; readonly id: number }

/** Frame -> app events over the MessagePort. */
export type ReaderEvent =
  | {
      readonly type: 'ready'
      readonly publication: Publication
      readonly locator: Locator
      readonly pageCount?: number
    }
  | { readonly type: 'locatorChanged'; readonly locator: Locator; readonly pageCount?: number }
  | { readonly type: 'pageCount'; readonly pageCount: number }
  | { readonly type: 'error'; readonly message: string }
  | {
      readonly type: 'result'
      readonly id: number
      readonly ok: true
      readonly locator?: Locator
      readonly pageCount?: number
    }
  | { readonly type: 'result'; readonly id: number; readonly ok: false; readonly message: string }
