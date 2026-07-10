// The BROWSER pdfjs binding. This is the ONLY module that evaluates the pdfjs main build, so it is
// reached solely via dynamic `import()` from the handler's default loader — keeping pdfjs (and its
// worker) a code-split chunk out of the initial bundle, and keeping jsdom unit tests (which inject the
// Node `legacy` build) from ever evaluating the browser build's `DOMMatrix`/canvas globals.
//
// The pdfjs worker is configured at module eval via Vite's `?url` import (the idiomatic Vite ESM
// pattern): the worker file is emitted as an asset and its URL handed to `GlobalWorkerOptions.workerSrc`
// BEFORE any `getDocument` call.

import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PublicationSource } from '@/core/contracts'
import { openPdfDocument, type PdfDocumentHandle, type PdfEngine } from './document'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

// pdfjs's `PDFDataRangeTransport` carries `#private` fields, making it nominal: its module shape
// satisfies `PdfEngine` structurally but TypeScript needs one boundary assertion to bridge the nominal
// gap. This is a type assertion (the runtime object genuinely IS the engine), never a lint suppression.
export const pdfEngine = pdfjsLib as unknown as PdfEngine

/** Load a PDF from a `PublicationSource` using the browser pdfjs build (range reads, no `fetch`). */
export function loadPdfDocument(source: PublicationSource): Promise<PdfDocumentHandle> {
  return openPdfDocument(pdfEngine, source)
}
