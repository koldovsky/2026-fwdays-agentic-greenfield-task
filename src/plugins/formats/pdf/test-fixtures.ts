// Test fixtures for the PDF handler: a minimal but VALID multi-page PDF built with correct xref byte
// offsets, plus the Node `legacy` pdfjs loader the handler is injected with so its `open`/navigator run
// in jsdom (the browser build needs `DOMMatrix`/canvas, absent in jsdom). Test-only.

import * as pdfjsLegacy from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PublicationSource } from '@/core/contracts'
import {
  openPdfDocument,
  type PdfDocumentHandle,
  type PdfDocumentLoader,
  type PdfEngine,
} from './document'

// The legacy build satisfies the structural `PdfEngine` (same pdfjs API); one boundary assertion bridges
// pdfjs's nominal `#private` transport type — a type assertion in a test, never a lint suppression.
const legacyEngine = pdfjsLegacy as unknown as PdfEngine

/** A `PdfDocumentLoader` over the Node `legacy` build — what the handler is injected with under jsdom. */
export const legacyPdfLoader: PdfDocumentLoader = (source) => openPdfDocument(legacyEngine, source)

/**
 * Build a minimal, valid `numPages`-page PDF with an `/Info` Title + Author. xref offsets are computed
 * from the actual byte layout so pdfjs parses it cleanly (no recovery scan needed).
 */
export function buildPdf(numPages = 1, info: { title?: string; author?: string } = {}): Uint8Array {
  const encoder = new TextEncoder()
  const pageRefs = Array.from({ length: numPages }, (_, i) => `${i + 3} 0 R`).join(' ')
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageRefs}] /Count ${numPages} >>`,
    ...Array.from(
      { length: numPages },
      () => '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>',
    ),
  ]
  const infoParts: string[] = []
  if (info.title) infoParts.push(`/Title (${info.title})`)
  if (info.author) infoParts.push(`/Author (${info.author})`)
  const hasInfo = infoParts.length > 0
  if (hasInfo) objects.push(`<< ${infoParts.join(' ')} >>`)

  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefStart = body.length
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) xref += `${String(offset).padStart(10, '0')} 00000 n \n`
  const infoRef = hasInfo ? ` /Info ${objects.length} 0 R` : ''
  const trailer =
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${infoRef} >>\n` +
    `startxref\n${xrefStart}\n%%EOF\n`
  return encoder.encode(body + xref + trailer)
}

/** A `PublicationSource` over a byte buffer that RECORDS every ranged read (to assert no full-buffer). */
export function recordingSource(bytes: Uint8Array): {
  source: PublicationSource
  reads: Array<{ offset: number; length: number }>
} {
  const reads: Array<{ offset: number; length: number }> = []
  const source: PublicationSource = {
    size: () => Promise.resolve(bytes.length),
    read: (offset, length) => {
      reads.push({ offset, length })
      return Promise.resolve(bytes.slice(offset, offset + length))
    },
  }
  return { source, reads }
}

export async function loadLegacyHandle(bytes: Uint8Array): Promise<PdfDocumentHandle> {
  const { source } = recordingSource(bytes)
  return legacyPdfLoader(source)
}
