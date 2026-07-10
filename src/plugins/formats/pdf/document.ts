// Engine-agnostic PDF document loader. It takes a pdfjs MODULE as a parameter and a neutral
// `PublicationSource`, and wires pdfjs's ranged-read transport to `source.read` — so book bytes are
// read by RANGE and NEVER through `fetch`/the Service Worker (ADR-005, the 14 MB book is never fully
// buffered). Parameterising the engine keeps this file free of any pdfjs module-eval side effect (the
// `?url` worker setup): the app passes the browser build (`./pdf-engine`); tests pass the Node `legacy`
// build, which runs in jsdom. Type-only pdfjs imports are erased, so importing THIS file evaluates no
// pdfjs canvas/DOM code.

import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PublicationSource } from '@/core/contracts'

/** The pdfjs ranged-read transport surface this loader subclasses + drives. */
export interface PdfRangeTransport {
  /** Hand pdfjs a previously-requested byte range (`begin` inclusive); `null` signals a failed read. */
  onDataRange(begin: number, chunk: Uint8Array | null): void
  /** pdfjs asks for the half-open byte range `[begin, end)`; the subclass services it from the source. */
  requestDataRange(begin: number, end: number): void
}

/** A pdfjs loading task — the slice we use (`promise` + `destroy`). */
export interface PdfLoadingTask {
  promise: Promise<PDFDocumentProxy>
  destroy(): Promise<void>
}

/**
 * The minimal pdfjs surface the loader needs, satisfied by BOTH the browser build (`pdfjs-dist`) and
 * the Node `legacy` build. `PDFDataRangeTransport` is a constructor we subclass to route ranges through
 * the source.
 */
export interface PdfEngine {
  getDocument(params: {
    range: PdfRangeTransport
    disableAutoFetch?: boolean
    disableStream?: boolean
    /** Disallow pdfjs's `eval`-based fast paths — it runs in-app on the credential origin with no CSP, so
     *  no document content may reach `eval`/`new Function` (the CVE-2024-4367 class, defense in depth). */
    isEvalSupported?: boolean
    /** Keep the document's own JavaScript (PDF "OpenAction"/field scripts) inert. */
    enableScripting?: boolean
  }): PdfLoadingTask
  PDFDataRangeTransport: new (length: number, initialData: Uint8Array | null) => PdfRangeTransport
}

/** A loaded PDF document plus a destroy handle that tears down its worker/transport. */
export interface PdfDocumentHandle {
  doc: PDFDocumentProxy
  destroy(): Promise<void>
}

/** Loads a PDF document from any pdfjs build, reading its bytes by range from a `PublicationSource`. */
export type PdfDocumentLoader = (source: PublicationSource) => Promise<PdfDocumentHandle>

/**
 * Open a `PublicationSource` as a pdfjs document, routing pdfjs's range requests through `source.read`
 * (no `fetch`, ADR-005). `disableAutoFetch`/`disableStream` keep pdfjs from trying to stream/prefetch
 * the whole file — it pulls exactly the ranges it parses. `isEvalSupported: false` + `enableScripting:
 * false` harden the in-app parse: untrusted document bytes never reach `eval`/`new Function` and the PDF's
 * own scripts stay inert (defense in depth — pdfjs runs on the credential origin with no CSP).
 */
export async function openPdfDocument(
  pdfjs: PdfEngine,
  source: PublicationSource,
): Promise<PdfDocumentHandle> {
  const size = await source.size()

  // pdfjs requests the half-open range [begin, end); serve it from the neutral source, clamped to size.
  class SourceRangeTransport extends pdfjs.PDFDataRangeTransport {
    override requestDataRange(begin: number, end: number): void {
      const clampedEnd = Math.min(end, size)
      const length = Math.max(0, clampedEnd - begin)
      void source.read(begin, length).then(
        (chunk) => this.onDataRange(begin, chunk),
        // A failed read hands pdfjs `null` so it can surface the error rather than hang.
        () => this.onDataRange(begin, null),
      )
    }
  }

  const transport = new SourceRangeTransport(size, null)
  const task = pdfjs.getDocument({
    range: transport,
    disableAutoFetch: true,
    disableStream: true,
    isEvalSupported: false,
    enableScripting: false,
  })
  const doc = await task.promise
  return { doc, destroy: () => task.destroy() }
}
