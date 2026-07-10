// PDF FormatHandler over pdfjs-dist (ADR-004; mupdf-wasm avoided — AGPL). Install-on-demand: this whole
// folder is a lazy first-party chunk reached only via `registry.install('format.pdf')` → dynamic
// `import()` (ADR-010 — "install" loads a bundled chunk, never remote code).
//
// The pdfjs engine is INJECTED (a `PdfDocumentLoader`): the app uses the browser build via the default
// loader's dynamic `import('./pdf-engine')` (so the pdfjs/worker chunk stays code-split AND module-eval
// of the browser build's `DOMMatrix`/canvas globals is deferred to first `open`); tests inject the Node
// `legacy` build, which parses real PDFs in jsdom. Book bytes are read by RANGE through the
// `PublicationSource` and never via `fetch`/the Service Worker (ADR-005).

import type {
  FormatCapabilities,
  NavigatorOptions,
  PublicationSource,
  SniffInput,
} from '@/core/contracts'
import { MEDIA_TYPE_PDF, type Publication } from '@/core/model'
import { sniffMagic } from '@/core/sniff'
import type { WebFormatHandler, WebNavigator } from '@/platform/web'
import { PDF_CAPABILITIES, PDF_FORMAT_ID } from './capabilities'
import type { PdfDocumentLoader } from './document'
import { pdfToPublication } from './to-publication'
import { createPdfNavigator } from './pdf-navigator'

// Re-exported as part of the handler's public surface (tests + the manifest read these).
export { PDF_CAPABILITIES, PDF_FORMAT_ID }
export type { PdfDocumentLoader } from './document'

/** The default loader: dynamic-imports the browser pdfjs binding only when a PDF is actually opened. */
const defaultLoadDocument: PdfDocumentLoader = async (source) => {
  const { loadPdfDocument } = await import('./pdf-engine')
  return loadPdfDocument(source)
}

/**
 * The PDF `WebFormatHandler`. The neutral surface (`id`/`mediaTypes`/`capabilities`/`sniff`/`open`) is
 * the native client's conformance target; `createNavigator` (with its `HTMLElement` mount) is the one
 * web-only member.
 */
export class PdfFormatHandler implements WebFormatHandler {
  readonly id = PDF_FORMAT_ID
  readonly mediaTypes = [MEDIA_TYPE_PDF] as const
  readonly capabilities: FormatCapabilities = PDF_CAPABILITIES

  readonly #loadDocument: PdfDocumentLoader

  /** `loadDocument` is injectable so tests can drive the Node `legacy` pdfjs build (jsdom-safe). */
  constructor(loadDocument: PdfDocumentLoader = defaultLoadDocument) {
    this.#loadDocument = loadDocument
  }

  /** Claim PDF input by media type, extension, or `%PDF` head bytes; reject everything else. */
  sniff(input: SniffInput): number {
    if (input.mediaType && input.mediaType.toLowerCase() === MEDIA_TYPE_PDF) return 1
    if (input.extension && input.extension.toLowerCase().replace(/^\./, '') === 'pdf') return 0.9
    if (input.headBytes && sniffMagic(input.headBytes) === MEDIA_TYPE_PDF) return 0.8
    return 0
  }

  /**
   * Parse a `PublicationSource` (OPFS file / drained stream / in-memory buffer) into a neutral
   * fixed-layout `Publication`. The pdfjs document is destroyed once its metadata/outline are mapped —
   * the live document for rendering is opened fresh in {@link createNavigator}.
   */
  async open(source: PublicationSource): Promise<Publication> {
    const handle = await this.#loadDocument(source)
    try {
      return await pdfToPublication(handle.doc)
    } finally {
      await handle.destroy()
    }
  }

  /** Create the web Navigator: opens a live pdfjs document and renders pages to a canvas in `mount`. */
  async createNavigator(
    _publication: Publication,
    mount: HTMLElement,
    options: NavigatorOptions,
  ): Promise<WebNavigator> {
    const handle = await this.#loadDocument(options.source)
    return createPdfNavigator(handle, mount, options)
  }
}

export default PdfFormatHandler
