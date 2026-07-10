// The web PDF Navigator: drives pdfjs over a mounted element with page-based locators. PDF is rendered
// to a <canvas> by pdfjs (no book-authored HTML/JS runs, unlike EPUB), so it renders IN-APP — no
// cross-origin reader frame is needed. The pdfjs `PDFDocumentProxy` holds worker MessagePorts + live
// transport state, so it is `markRaw()`'d before being stored (ADR-001): Vue reactivity must never
// proxy-wrap pdfjs internals, or paging desyncs (the same rule foliate's navigator obeys).

import { markRaw } from 'vue'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { NavigatorOptions, Unsubscribe } from '@/core/contracts'
import type { Locator, ReadingPreferences } from '@/core/model'
import type { WebNavigator } from '@/platform/web'
import type { PdfDocumentHandle } from './document'
import { pageFromLocator, pdfPageLocator } from './page-locator'

type LocatorListener = (locator: Locator) => void
type ErrorListener = (error: unknown) => void

interface RenderTaskLike {
  promise: Promise<void>
  cancel(): void
}

/**
 * Create a {@link WebNavigator} over a loaded PDF. The document proxy is `markRaw()`'d on entry so the
 * reader's reactive layer never wraps it. Page navigation is pure index arithmetic ({@link pageFromLocator}
 * / {@link pdfPageLocator}); rendering paints the current page to a canvas in the mount (skipped where no
 * 2D context exists, e.g. jsdom — the locator stream still works for headless tests).
 */
export function createPdfNavigator(
  handle: PdfDocumentHandle,
  mount: HTMLElement,
  _options: NavigatorOptions,
): WebNavigator {
  // ADR-001: never let Vue proxy-wrap the pdfjs document (worker ports + live transport state).
  const doc: PDFDocumentProxy = markRaw(handle.doc)
  const numPages = Math.max(1, doc.numPages)

  const canvas = mount.ownerDocument.createElement('canvas')
  canvas.className = 'pdf-page'
  canvas.style.maxWidth = '100%'
  canvas.style.maxHeight = '100%'
  mount.replaceChildren(canvas)

  let currentPage = 1
  let destroyed = false
  let renderTask: RenderTaskLike | null = null
  const locatorListeners = new Set<LocatorListener>()
  const errorListeners = new Set<ErrorListener>()

  function emitLocator(): void {
    const locator = pdfPageLocator(currentPage, numPages)
    for (const listener of [...locatorListeners]) listener(locator)
  }

  function emitError(error: unknown): void {
    for (const listener of [...errorListeners]) listener(error)
  }

  async function render(page: number): Promise<void> {
    const context = canvas.getContext('2d')
    if (!context) return // no 2D canvas (jsdom) — navigation state still advances, just unpainted.
    renderTask?.cancel()
    try {
      const pdfPage = await doc.getPage(page)
      if (destroyed) return
      const viewport = pdfPage.getViewport({ scale: 1 })
      canvas.width = viewport.width
      canvas.height = viewport.height
      const task = pdfPage.render({ canvas, canvasContext: context, viewport }) as RenderTaskLike
      renderTask = task
      await task.promise
    } catch (error) {
      // A render cancelled by a fast page turn is expected; surface anything else to subscribers.
      if (!destroyed && !isCancelled(error)) emitError(error)
    }
  }

  async function goToPage(page: number): Promise<void> {
    const clamped = Math.min(Math.max(1, page), numPages)
    currentPage = clamped
    emitLocator()
    await render(clamped)
  }

  // Paint the first page on creation.
  void render(currentPage)

  return {
    async goTo(locator: Locator): Promise<void> {
      await goToPage(pageFromLocator(locator, numPages))
    },
    async next(): Promise<void> {
      if (currentPage < numPages) await goToPage(currentPage + 1)
    },
    async prev(): Promise<void> {
      if (currentPage > 1) await goToPage(currentPage - 1)
    },
    async seek(fraction: number): Promise<void> {
      const clampedFraction = Math.min(1, Math.max(0, fraction))
      await goToPage(Math.round(clampedFraction * (numPages - 1)) + 1)
    },
    currentLocator(): Locator {
      return pdfPageLocator(currentPage, numPages)
    },
    applyPreferences(_preferences: ReadingPreferences): void {
      // Fixed-layout PDF pages are rendered by pdfjs; reading-preference theming does not apply here.
    },
    on(event: 'locatorChanged' | 'error', callback: (arg: never) => void): Unsubscribe {
      if (event === 'locatorChanged') {
        const listener = callback as LocatorListener
        locatorListeners.add(listener)
        return () => locatorListeners.delete(listener)
      }
      const listener = callback as ErrorListener
      errorListeners.add(listener)
      return () => errorListeners.delete(listener)
    },
    pageCount(): number {
      return numPages
    },
    destroy(): void {
      destroyed = true
      renderTask?.cancel()
      renderTask = null
      locatorListeners.clear()
      errorListeners.clear()
      mount.replaceChildren()
      void handle.destroy()
    },
  }
}

function isCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === 'RenderingCancelledException'
}
