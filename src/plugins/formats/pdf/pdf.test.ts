import { describe, expect, it, vi } from 'vitest'
import { isReactive, reactive } from 'vue'
import { PDF_CAPABILITIES, PDF_FORMAT_ID, PdfFormatHandler } from './index'
import { pageFromLocator, pdfPageLocator } from './page-locator'
import { createPdfNavigator } from './pdf-navigator'
import { buildPdf, legacyPdfLoader, loadLegacyHandle, recordingSource } from './test-fixtures'

function handler(): PdfFormatHandler {
  // Inject the Node `legacy` pdfjs build so open()/createNavigator run in jsdom.
  return new PdfFormatHandler(legacyPdfLoader)
}

describe('PDF format — identity & capabilities', () => {
  it('declares the canonical id and fixed-layout, page-located capabilities', () => {
    const pdf = handler()
    expect(pdf.id).toBe('format.pdf')
    expect(pdf.id).toBe(PDF_FORMAT_ID)
    expect(pdf.mediaTypes).toContain('application/pdf')
    expect(PDF_CAPABILITIES).toEqual({
      mediaTypes: ['application/pdf'],
      extensions: ['pdf'],
      layout: 'fixed',
      search: true,
      locatorScheme: 'page',
    })
  })
})

describe('PDF sniff', () => {
  const pdf = handler()

  it('claims PDF input by media type, extension, or %PDF head bytes (high)', () => {
    expect(pdf.sniff({ mediaType: 'application/pdf' })).toBe(1)
    expect(pdf.sniff({ extension: 'pdf' })).toBeGreaterThanOrEqual(0.8)
    expect(pdf.sniff({ extension: '.PDF' })).toBeGreaterThanOrEqual(0.8)
    expect(
      pdf.sniff({ headBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]) }),
    ).toBeGreaterThanOrEqual(0.8)
  })

  it('returns ~0 for non-PDF input (an EPUB)', () => {
    expect(pdf.sniff({ mediaType: 'application/epub+zip' })).toBe(0)
    expect(pdf.sniff({ headBytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]) })).toBe(0) // PK = ZIP/EPUB
  })
})

describe('PDF open → fixed-layout Publication', () => {
  it('parses a PDF into a fixed Publication with a page reading order and its title', async () => {
    const bytes = buildPdf(3, { title: 'The Picture of Dorian Gray', author: 'Oscar Wilde' })
    const publication = await handler().open(recordingSource(bytes).source)

    expect(publication.layout).toBe('fixed')
    expect(publication.readingOrder).toHaveLength(3)
    expect(publication.metadata.title).toBe('The Picture of Dorian Gray')
    expect(publication.metadata.author).toBe('Oscar Wilde')
    // Each reading-order entry is a 1-based page locator.
    expect(publication.readingOrder[0]?.locations?.page).toBe(1)
    expect(publication.readingOrder[2]?.locations?.page).toBe(3)
  })

  it('reads bytes by RANGE from the source and never via fetch (ADR-005)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    // A PDF larger than pdfjs's 64 KB range-chunk so the reads genuinely span the file (not one slurp).
    const bytes = buildPdf(1500, { title: 'Long Book' })
    expect(bytes.length).toBeGreaterThan(64 * 1024)
    const { source, reads } = recordingSource(bytes)

    const publication = await handler().open(source)

    expect(publication.readingOrder).toHaveLength(1500)
    expect(fetchSpy).not.toHaveBeenCalled() // book bytes bypass the Service Worker / network
    // The whole file is never loaded in one read: pdfjs pulls partial ranges through `source.read`,
    // including the xref near the END first (a non-zero offset) — a 206-style ranged read (ADR-005).
    expect(reads.length).toBeGreaterThan(1)
    expect(reads.some((r) => r.offset > 0)).toBe(true)
    expect(reads.some((r) => r.length < bytes.length)).toBe(true)
    fetchSpy.mockRestore()
  })
})

describe('PDF navigator — page locators round-trip', () => {
  it('currentLocator at a page round-trips back to that page via goTo', async () => {
    const handle = await loadLegacyHandle(buildPdf(50))
    const mount = document.createElement('div')
    const navigator = createPdfNavigator(handle, mount, {
      source: recordingSource(new Uint8Array()).source,
    })

    await navigator.goTo(pdfPageLocator(42, 50))
    const at42 = navigator.currentLocator()
    expect(at42.locations?.page).toBe(42)

    await navigator.next() // 43
    expect(navigator.currentLocator().locations?.page).toBe(43)

    await navigator.goTo(at42) // back to the captured page-42 locator
    expect(navigator.currentLocator().locations?.position).toBe(42)
    expect(navigator.pageCount()).toBe(50)

    navigator.destroy()
  })

  it('seek maps a 0..1 fraction to the right page', async () => {
    const handle = await loadLegacyHandle(buildPdf(10))
    const navigator = createPdfNavigator(handle, document.createElement('div'), {
      source: recordingSource(new Uint8Array()).source,
    })
    await navigator.seek(0)
    expect(navigator.currentLocator().locations?.page).toBe(1)
    await navigator.seek(1)
    expect(navigator.currentLocator().locations?.page).toBe(10)
    navigator.destroy()
  })

  it('markRaw()s the pdfjs document proxy so Vue never proxy-wraps it (ADR-001)', async () => {
    const handle = await loadLegacyHandle(buildPdf(2))
    const navigator = createPdfNavigator(handle, document.createElement('div'), {
      source: recordingSource(new Uint8Array()).source,
    })
    // markRaw mutated handle.doc — reactive() now refuses to wrap the pdfjs proxy.
    expect(isReactive(reactive(handle.doc))).toBe(false)
    expect(reactive(handle.doc)).toBe(handle.doc)
    navigator.destroy()
  })
})

describe('page-locator helpers', () => {
  it('clamps a locator page into [1, numPages]', () => {
    expect(pageFromLocator(pdfPageLocator(5, 10), 10)).toBe(5)
    expect(pageFromLocator(pdfPageLocator(99, 10), 10)).toBe(10)
    expect(pageFromLocator({ href: '#', type: 'application/pdf' }, 10)).toBe(1)
  })
})
