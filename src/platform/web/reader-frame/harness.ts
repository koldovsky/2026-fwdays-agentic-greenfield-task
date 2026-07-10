// The in-frame harness — the SEPARATE-ORIGIN renderer (ADR-013). This module runs ONLY inside the
// reader frame (served from `VITE_READER_ORIGIN`, a different origin than the app). The entire foliate
// engine lives here: importing `view.js` registers `foliate-view` in THIS frame's custom-element
// registry (and `view.open()` lazily registers `foliate-paginator`), so every spine `<iframe>` foliate
// creates is same-origin to THIS frame — its synchronous `contentDocument` access works — while
// `window.top` (the app) is cross-origin, so a malicious book script cannot read the app's
// `edda.creds.*` (the browser's same-origin policy denies it; that is the whole point of the change).
//
// The harness performs NO network I/O: book bytes arrive as a Transferable `ArrayBuffer` over the bridge
// (ADR-005). It speaks the neutral {@link ReaderCommand}/{@link ReaderEvent} protocol over a single
// `MessagePort` handed to it at the validated init handshake.

import { View } from 'foliate-js/view.js'
import type { FoliateLocation } from 'foliate-js/view.js'
import { MEDIA_TYPE_EPUB, type Locator, type Publication } from '@/core/model'
import { publicationSourceFromBytes } from '@/core/contracts'
import { openFoliateBook } from '@/plugins/formats/epub/book-loader'
import { toPublication } from '@/plugins/formats/epub/to-publication'
import { buildReadingCss, flowMode } from './reader-css'
import { clampFraction, toLocator } from './to-locator'
import { shouldAcceptInit, type ReaderCommand, type ReaderEvent } from './protocol'

const APP_ORIGIN: string | undefined = import.meta.env.VITE_APP_ORIGIN

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Resolve a goTo target the way the old in-app navigator did: a full in-content CFI pinpoints a
 *  position; a bare spine CFI only names a section, so fall back to the href. */
function goToTarget(locator: Locator): string | undefined {
  const cfi = locator.locations?.cfi
  return cfi?.includes('!') ? cfi : locator.href || cfi
}

/** Bind one handed `MessagePort` to a fresh foliate session mounted into `mount`. */
function bindPort(port: MessagePort, mount: HTMLElement): void {
  let view: View | null = null
  let book: Awaited<ReturnType<typeof openFoliateBook>> | null = null
  let publication: Publication | null = null
  let current: Locator | null = null
  let pageTotal: number | undefined
  let destroyed = false

  const post = (event: ReaderEvent): void => {
    port.postMessage(event)
  }

  const syncFromLocation = (detail: FoliateLocation | undefined): void => {
    if (!publication) return
    current = toLocator(detail, publication)
    if (typeof detail?.location?.total === 'number') pageTotal = detail.location.total
  }

  const reply = (id: number): void => {
    post(
      current
        ? { type: 'result', id, ok: true, locator: current, pageCount: pageTotal }
        : { type: 'result', id, ok: true, pageCount: pageTotal },
    )
  }

  const teardown = (): void => {
    if (destroyed) return
    destroyed = true
    try {
      view?.close()
    } catch (error) {
      console.error(error)
    }
    view?.remove()
    view = null
    try {
      book?.destroy()
    } catch (error) {
      console.error(error)
    }
    book = null
    port.close()
  }

  const handleOpen = async (command: Extract<ReaderCommand, { type: 'open' }>): Promise<void> => {
    // Build the foliate book from the transferred bytes IN-FRAME (no fetch). Wrapping the transferred
    // `ArrayBuffer` in a neutral in-memory `PublicationSource` keeps the loader's ranged reads — the same
    // zip reader an OPFS/`File` source uses (the 14 MB light-novel is never fully materialised per read).
    const source = publicationSourceFromBytes(new Uint8Array(command.buffer))
    book = await openFoliateBook(source)
    publication = toPublication(book)

    const created = new View()
    view = created
    mount.replaceChildren(created)
    created.addEventListener('relocate', (event) => {
      syncFromLocation((event as CustomEvent<FoliateLocation>).detail)
      if (current) post({ type: 'locatorChanged', locator: current, pageCount: pageTotal })
    })

    await created.open(book)
    const preferences = command.preferences
    if (preferences && Object.keys(preferences).length) {
      const css = buildReadingCss(preferences)
      if (css) created.renderer?.setStyles?.(css)
      created.renderer?.setAttribute('flow', flowMode(preferences))
    }
    await created.init({ showTextStart: false })
    if (created.lastLocation) syncFromLocation(created.lastLocation)

    const locator = current ?? publication.readingOrder[0] ?? { href: '', type: MEDIA_TYPE_EPUB }
    post({ type: 'ready', publication, locator, pageCount: pageTotal })
  }

  port.onmessage = async (event: MessageEvent<ReaderCommand>): Promise<void> => {
    // RISK 5: port messages carry `event.origin === ''` — origin was validated at the init handshake;
    // the port itself is the capability. Do NOT re-assert an origin here.
    const command = event.data
    try {
      switch (command.type) {
        case 'open':
          await handleOpen(command)
          reply(command.id)
          break
        case 'goTo': {
          const target = goToTarget(command.locator)
          if (target && view) await view.goTo(target)
          if (view?.lastLocation) syncFromLocation(view.lastLocation)
          reply(command.id)
          break
        }
        case 'next':
          if (view) await view.next()
          if (view?.lastLocation) syncFromLocation(view.lastLocation)
          reply(command.id)
          break
        case 'prev':
          if (view) await view.prev()
          if (view?.lastLocation) syncFromLocation(view.lastLocation)
          reply(command.id)
          break
        case 'seek':
          if (view) await view.goToFraction(clampFraction(command.fraction))
          if (view?.lastLocation) syncFromLocation(view.lastLocation)
          reply(command.id)
          break
        case 'applyPreferences': {
          // Idempotent replace (Risk 1): set the FULL stylesheet every time (not a delta), so repeated
          // theme/size/spacing changes actually re-flow. foliate replaces its injected styles wholesale.
          view?.renderer?.setStyles?.(buildReadingCss(command.preferences))
          view?.renderer?.setAttribute('flow', flowMode(command.preferences))
          reply(command.id)
          break
        }
        case 'destroy':
          teardown()
          post({ type: 'result', id: command.id, ok: true })
          break
      }
    } catch (error) {
      const message = errorMessage(error)
      post({ type: 'result', id: command.id, ok: false, message })
      // A failure during the initial open is fatal — surface it so the app proxy can fail closed.
      if (command.type === 'open') post({ type: 'error', message })
    }
  }
  port.start()
}

/**
 * Start the reader frame: listen for the app's validated init handshake (modern-web-guidance §1.5),
 * accept the transferred `MessagePort`, and bind a foliate session to `mount`. Only the first valid
 * handshake binds; later ones are ignored (one frame drives one book).
 */
export function startReaderFrame(mount: HTMLElement): void {
  let bound = false
  window.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (bound) return
    if (!shouldAcceptInit(event.origin, event.data, APP_ORIGIN)) return
    const port = event.ports[0]
    if (!port) return
    bound = true
    bindPort(port, mount)
  })
}
