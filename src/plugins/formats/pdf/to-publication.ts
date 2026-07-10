// Map a parsed pdfjs document to a neutral `Publication` (DESIGN-CONNECTORS.md §4): fixed layout, a reading order
// of its pages, title/author metadata, and a table of contents derived from the PDF outline when one
// exists. Engine-agnostic — it consumes only the `PDFDocumentProxy`'s async API, so it runs the same
// over the browser build (app) and the Node `legacy` build (tests). Emits plain `core/model` shapes.

import type { PDFDocumentProxy } from 'pdfjs-dist'
import { type Locator, MEDIA_TYPE_PDF, type Publication } from '@/core/model'
import { pdfPageLocator } from './page-locator'

interface PdfInfo {
  Title?: unknown
  Author?: unknown
}

interface PdfOutlineItem {
  title: string
  dest: string | unknown[] | null
  items?: PdfOutlineItem[]
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/** Build a neutral fixed-layout `Publication` from a parsed pdfjs document. */
export async function pdfToPublication(doc: PDFDocumentProxy): Promise<Publication> {
  const numPages = doc.numPages
  const info = await readInfo(doc)
  const title = asString(info.Title) ?? 'Untitled'
  const author = asString(info.Author)

  const readingOrder: Locator[] = []
  for (let page = 1; page <= numPages; page += 1) {
    readingOrder.push(pdfPageLocator(page, numPages))
  }

  const publication: Publication = { metadata: { title }, readingOrder, layout: 'fixed' }
  if (author) publication.metadata.author = author

  const toc = await readOutline(doc, numPages)
  if (toc.length > 0) publication.tableOfContents = toc

  return publication
}

async function readInfo(doc: PDFDocumentProxy): Promise<PdfInfo> {
  try {
    const { info } = await doc.getMetadata()
    return (info ?? {}) as PdfInfo
  } catch {
    return {}
  }
}

/** Map the top-level PDF outline to TOC locators, resolving each entry's destination to a page. */
async function readOutline(doc: PDFDocumentProxy, numPages: number): Promise<Locator[]> {
  let outline: PdfOutlineItem[] | null = null
  try {
    outline = (await doc.getOutline()) as PdfOutlineItem[] | null
  } catch {
    return []
  }
  if (!outline || outline.length === 0) return []

  const locators: Locator[] = []
  for (const item of outline) {
    const page = await resolvePage(doc, item.dest)
    if (page !== undefined) {
      locators.push(pdfPageLocator(page, numPages, item.title))
    } else {
      // A title-only outline entry whose destination could not be resolved still appears in the TOC.
      locators.push({ href: '#', type: MEDIA_TYPE_PDF, title: item.title })
    }
  }
  return locators
}

/** Resolve a PDF outline destination (named or explicit) to a 1-based page, or undefined. */
async function resolvePage(
  doc: PDFDocumentProxy,
  dest: PdfOutlineItem['dest'],
): Promise<number | undefined> {
  try {
    const explicit = typeof dest === 'string' ? await doc.getDestination(dest) : dest
    const ref = Array.isArray(explicit) ? explicit[0] : undefined
    if (ref === undefined || ref === null) return undefined
    const index = await doc.getPageIndex(ref as Parameters<PDFDocumentProxy['getPageIndex']>[0])
    return index + 1
  } catch {
    return undefined
  }
}
