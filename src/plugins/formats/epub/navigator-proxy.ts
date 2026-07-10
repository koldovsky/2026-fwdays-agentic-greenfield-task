// The app-side EPUB Navigator PROXY (ADR-013). The renderer runs on a SEPARATE origin (the reader
// frame); this proxy implements the neutral {@link WebNavigator} the reader chrome already drives, by
// forwarding each call over an app<->frame postMessage bridge and re-emitting `locatorChanged`. It holds
// the cross-origin `<iframe>` and the `MessagePort`s in CLOSURE variables (never object properties) so
// the consumer can `markRaw()` it (ADR-001) — Vue reactivity must never wrap the iframe or the ports.
//
// Security (modern-web-guidance §1.5):
//  - The reader origin is read from `VITE_READER_ORIGIN`. If it is unset — or equal to the app origin —
//    the proxy FAILS CLOSED: it throws and renders NOTHING on the app origin (never a same-origin
//    fallback to the credential-reachable path).
//  - The init handshake is posted with `targetOrigin = READER_ORIGIN` (never `*`), transferring one port.
//  - There is NO app-side window `message` listener. The frame replies ONLY over the capability
//    `MessagePort` (handed to READER_ORIGIN alone). A window listener would be a spoof seam: foliate frames
//    each spine document same-origin to the READER origin, so a book script could `window.top.postMessage`
//    a forged `locatorChanged`/`error`/… that an `origin === READER_ORIGIN` check would wave through. The
//    port — which book script cannot reach — is the sole inbound channel; its messages carry
//    `origin === ''` (Risk 5) and ARE the capability.
//  - Book bytes cross ONCE as a Transferable `ArrayBuffer` (ADR-005: bridged, never SW-intercepted); no
//    credential ever crosses — the app keeps `edda.creds.*` on its own origin.

import type { Locator, Publication, ReadingPreferences } from '@/core/model'
import { MEDIA_TYPE_EPUB } from '@/core/model'
import type { NavigatorOptions, PublicationSource, Unsubscribe } from '@/core/contracts'
import type { WebNavigator } from '@/platform/web'
import {
  READER_INIT,
  type ReaderCommand,
  type ReaderEvent,
} from '@/platform/web/reader-frame/protocol'

const READY_TIMEOUT_MS = 30_000

/** The two typed events the proxy re-emits. (Initial render is the factory promise resolving, not an event.) */
type ProxyEvent = 'locatorChanged' | 'error'

/** A successful command acknowledgement (the only `result` a pending waiter resolves with). */
type ResultOk = Extract<ReaderEvent, { type: 'result'; ok: true }>

/** A command minus its correlation `id` — distributive so each variant keeps its own fields. */
type ReaderCommandInput = ReaderCommand extends infer T
  ? T extends { id: number }
    ? Omit<T, 'id'>
    : never
  : never

/**
 * Read a {@link PublicationSource} fully into a FRESH, detachable `ArrayBuffer` safe to transfer. Slicing
 * the exact `[byteOffset, byteOffset + byteLength)` view range yields a standalone buffer (Risk 3): it is
 * not a view into a shared buffer (which would throw `DataCloneError` on transfer) and transferring it
 * never neuters the source's own backing memory.
 */
async function sourceToTransferBuffer(source: PublicationSource): Promise<ArrayBuffer> {
  const size = await source.size()
  const bytes = await source.read(0, size)
  // Copy into a freshly allocated `ArrayBuffer` (not `bytes.buffer`, which is `ArrayBufferLike` and may be
  // a view into a shared/larger buffer): a standalone buffer is detachable and transfers without
  // `DataCloneError`, and the transfer never neuters the source's own backing memory (Risk 3).
  const transferable = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(transferable).set(bytes)
  return transferable
}

/**
 * Create an EPUB Navigator proxy over `mount`. Embeds the cross-origin reader frame, hands it one
 * `MessagePort`, transfers the book bytes, and resolves once the frame reports `ready`. The returned
 * object is a plain instance (non-reactive) — the consumer `markRaw()`s it.
 */
export async function createEpubNavigatorProxy(
  publication: Publication,
  mount: HTMLElement,
  options: NavigatorOptions,
): Promise<WebNavigator> {
  const readerOrigin = import.meta.env.VITE_READER_ORIGIN
  if (!readerOrigin) {
    // Fail closed (ADR-013): no same-origin fallback to the credential-reachable path.
    throw new Error('Reader origin is not configured')
  }
  if (new URL(readerOrigin).origin === window.location.origin) {
    // Fail closed (ADR-013): a reader origin equal to the app origin would collapse the isolation —
    // book content back on the credential-bearing origin. Never render same-origin.
    throw new Error('Reader origin must differ from the app origin')
  }

  const buffer = await sourceToTransferBuffer(options.source)

  const channel = new MessageChannel()
  const port = channel.port1

  const listeners = new Map<ProxyEvent, Set<(detail: unknown) => void>>()
  const pending = new Map<
    number,
    { resolve: (event: ResultOk | null) => void; reject: (error: Error) => void }
  >()
  let nextId = 1
  let current: Locator = publication.readingOrder[0] ?? { href: '', type: MEDIA_TYPE_EPUB }
  let pageTotal: number | undefined
  let destroyed = false
  let isReady = false

  const emit = (event: ProxyEvent, detail: unknown): void => {
    if (destroyed) return
    for (const callback of listeners.get(event) ?? []) {
      try {
        callback(detail)
      } catch (error) {
        console.error(error)
      }
    }
  }

  let resolveReady!: () => void
  let rejectReady!: (error: Error) => void
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })
  const readyTimer = setTimeout(
    () => rejectReady(new Error('The reader frame did not respond in time.')),
    READY_TIMEOUT_MS,
  )

  // Dispatches each frame event (arriving over the capability port — the sole inbound channel) to the
  // app: ready / locatorChanged / pageCount / error, and command `result` acknowledgements.
  const handleEvent = (event: ReaderEvent): void => {
    switch (event.type) {
      case 'ready':
        current = event.locator
        if (event.pageCount !== undefined) pageTotal = event.pageCount
        isReady = true
        clearTimeout(readyTimer)
        resolveReady()
        break
      case 'locatorChanged':
        current = event.locator
        if (event.pageCount !== undefined) pageTotal = event.pageCount
        emit('locatorChanged', current)
        break
      case 'pageCount':
        pageTotal = event.pageCount
        break
      case 'error': {
        const error = new Error(event.message)
        if (!isReady) {
          clearTimeout(readyTimer)
          rejectReady(error)
        } else {
          emit('error', error)
        }
        break
      }
      case 'result': {
        const waiter = pending.get(event.id)
        if (!waiter) break
        pending.delete(event.id)
        if (event.ok) waiter.resolve(event)
        else waiter.reject(new Error(event.message))
        break
      }
    }
  }

  port.onmessage = (event: MessageEvent<ReaderEvent>): void => {
    // RISK 5: port messages carry `event.origin === ''` — the port IS the capability (handed only to
    // READER_ORIGIN). Do NOT assert an origin here; origin was validated at the window handshake.
    handleEvent(event.data)
  }
  port.start()

  const post = (command: ReaderCommand, transfer?: Transferable[]): void => {
    if (transfer) port.postMessage(command, transfer)
    else port.postMessage(command)
  }

  /** Send a command and await its `result`. A command issued (or left in flight) after teardown is MOOT,
   *  not a failure — it resolves silently, so the reader's fire-and-forget `void navigator.next()` never
   *  produces a spurious unhandled rejection when the route changes mid-page-turn. A genuine frame-side
   *  failure (`result.ok === false`) still rejects. */
  const send = (command: ReaderCommandInput): Promise<void> => {
    if (destroyed) return Promise.resolve()
    const id = nextId++
    return new Promise<void>((resolve, reject) => {
      pending.set(id, {
        resolve: (event) => {
          if (event?.locator) current = event.locator
          if (event?.pageCount !== undefined) pageTotal = event.pageCount
          resolve()
        },
        reject,
      })
      post({ ...command, id } as ReaderCommand)
    })
  }

  const iframe = document.createElement('iframe')
  iframe.title = 'Book content'
  // The cross-origin URL is the isolation; NO `sandbox` attribute (an opaque sandbox would force
  // foliate's spine iframes to a fresh opaque origin and break its synchronous `contentDocument`).
  iframe.src = readerOrigin
  Object.assign(iframe.style, { width: '100%', height: '100%', border: '0', display: 'block' })

  iframe.addEventListener(
    'load',
    () => {
      if (destroyed) return
      // Hand the frame its port with an EXPLICIT targetOrigin (never `*`), then transfer the book bytes.
      iframe.contentWindow?.postMessage({ type: READER_INIT }, readerOrigin, [channel.port2])
      const id = nextId++
      const open: ReaderCommand = { type: 'open', id, buffer, preferences: options.preferences }
      post(open, [buffer])
    },
    { once: true },
  )

  mount.replaceChildren(iframe)

  let teardownDone = false
  const teardown = (): void => {
    if (teardownDone) return
    teardownDone = true
    destroyed = true
    clearTimeout(readyTimer)
    try {
      // Best-effort destroy on the frame; the iframe removal below is the real teardown.
      port.postMessage({ type: 'destroy', id: nextId++ } satisfies ReaderCommand)
    } catch {
      // port may already be closed — ignore.
    }
    // In-flight commands are moot once the reader is torn down — resolve them silently (not reject), so
    // the reader's fire-and-forget paging never logs a spurious unhandled rejection on route change.
    for (const waiter of pending.values()) waiter.resolve(null)
    pending.clear()
    try {
      port.close()
    } catch {
      // ignore
    }
    iframe.remove()
    listeners.clear()
  }

  /** Subscribe to a typed event; the callback's `detail` is the event's payload type (D2 overloads). */
  function on(event: 'locatorChanged', callback: (locator: Locator) => void): Unsubscribe
  function on(event: 'error', callback: (error: unknown) => void): Unsubscribe
  function on(event: ProxyEvent, callback: (detail: never) => void): Unsubscribe {
    const set = listeners.get(event) ?? new Set<(detail: unknown) => void>()
    set.add(callback as (detail: unknown) => void)
    listeners.set(event, set)
    return () => {
      set.delete(callback as (detail: unknown) => void)
    }
  }

  try {
    await ready
  } catch (error) {
    teardown()
    throw error
  }

  return {
    async goTo(locator: Locator): Promise<void> {
      await send({ type: 'goTo', locator })
    },
    async next(): Promise<void> {
      await send({ type: 'next' })
    },
    async prev(): Promise<void> {
      await send({ type: 'prev' })
    },
    async seek(fraction: number): Promise<void> {
      await send({ type: 'seek', fraction })
    },
    pageCount(): number | undefined {
      return pageTotal
    },
    currentLocator(): Locator {
      return current
    },
    applyPreferences(preferences: ReadingPreferences): void {
      // Fire-and-forget (the interface returns void); swallow rejection if torn down mid-flight.
      void send({ type: 'applyPreferences', preferences }).catch(() => {})
    },
    on,
    destroy(): void {
      teardown()
    },
  }
}
