/**
 * Gate-2 checker tests for add-book-detail (screen 02).
 *
 * This file is INDEPENDENT of the maker's tests (BookDetailView.test.ts). It targets the four
 * load-bearing behaviours the maker could have gotten subtly wrong:
 *   a) BookMeta JSON-native: no Date / function / DOM values sneak in.
 *   b) getBook served by the CONNECTOR's in-memory catalog, NOT an EPUB parse.
 *   c) Progress key isolation: same bookId with different mediaType ≠ same progress slot.
 *   d) "SYNCED PER FORMAT" card text is the exact maket sentence.
 *
 * Placed in src/app/ (NOT src/core/) so that imports of fixture connector and app components
 * satisfy the import-x/no-restricted-paths rule (core must not import app/plugins, but the reverse
 * is fine). Vitest environment: jsdom (default; set in vite.config.ts).
 */

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { BookMeta, BookRef } from '@/core/model'
import { MEDIA_TYPE_EPUB, MEDIA_TYPE_PDF } from '@/core/model'
import FixtureConnector from '@/plugins/connectors/fixture'
import SyncedPerFormatCard from '@/app/components/book-detail/SyncedPerFormatCard.vue'

// ── a. BookMeta JSON-neutrality ──────────────────────────────────────────────

describe('BookMeta — platform-neutral, JSON-native (checker)', () => {
  it('the P&P BookMeta from the fixture round-trips through JSON identically', async () => {
    const connector = new FixtureConnector()
    const ref: BookRef = {
      sourceId: 'home-server',
      bookId: 'pride-and-prejudice',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Pride and Prejudice',
    }
    const meta = await connector.getBook(ref)
    // JSON.stringify → JSON.parse must produce the same shape (no Date or non-serialisable fields).
    const roundTripped = JSON.parse(JSON.stringify(meta)) as BookMeta
    expect(roundTripped).toEqual(meta)
    // No Date objects anywhere — every value must be a plain JSON-native primitive/array/object.
    for (const val of Object.values(meta)) {
      expect(val).not.toBeInstanceOf(Date)
      expect(typeof val).not.toBe('function')
      // Arrays (authors, genres, breadcrumb) must contain only strings or numbers.
      if (Array.isArray(val)) {
        for (const item of val) {
          expect(typeof item).toMatch(/^string|number$/)
        }
      }
    }
  })

  it('a minimal BookMeta (title + empty authors) is valid and round-trips cleanly', () => {
    const minimal: BookMeta = { title: 'Unknown Book', authors: [] }
    const roundTripped = JSON.parse(JSON.stringify(minimal)) as BookMeta
    expect(roundTripped.title).toBe('Unknown Book')
    expect(roundTripped.authors).toEqual([])
    // All optional fields absent after round-trip (no undefined → null coercion).
    expect(roundTripped.year).toBeUndefined()
    expect(roundTripped.language).toBeUndefined()
    expect(roundTripped.pageCount).toBeUndefined()
    expect(roundTripped.genres).toBeUndefined()
    expect(roundTripped.description).toBeUndefined()
    expect(roundTripped.coverHref).toBeUndefined()
    expect(roundTripped.coverColor).toBeUndefined()
    expect(roundTripped.breadcrumb).toBeUndefined()
    expect(roundTripped.chapterCount).toBeUndefined()
  })
})

// ── b. getBook sourced from the connector's in-memory catalog, not EPUB parse ─

describe('getBook — connector in-memory catalog, NOT an EPUB parse (checker)', () => {
  it('P&P returns rich BookMeta from the BOOK_DETAIL map', async () => {
    const connector = new FixtureConnector()
    const ref: BookRef = {
      sourceId: 'home-server',
      bookId: 'pride-and-prejudice',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Pride and Prejudice',
    }
    const meta = await connector.getBook(ref)
    // Catalog-only facts — these prove the data is from the in-memory map, not a parsed EPUB.
    expect(meta.title).toBe('Pride and Prejudice')
    expect(meta.authors).toEqual(['Jane Austen'])
    expect(meta.year).toBe(1813)
    expect(meta.language).toBe('English')
    expect(meta.pageCount).toBe(432)
    expect(meta.genres).toEqual(['Fiction', 'Romance'])
    expect(meta.breadcrumb).toEqual(['home server', 'fiction', 'austen'])
    expect(meta.chapterCount).toBe(61)
  })

  it('getBook result has NO Publication-shaped fields (no readingOrder, no tableOfContents)', async () => {
    const connector = new FixtureConnector()
    const ref: BookRef = {
      sourceId: 'home-server',
      bookId: 'pride-and-prejudice',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Pride and Prejudice',
    }
    const meta = await connector.getBook(ref)
    // BookMeta and Publication are disjoint: readingOrder / tableOfContents / metadata.author must not
    // appear (that would indicate the maker accidentally mixed up the FormatHandler path, pre-empting ch6).
    expect('readingOrder' in meta).toBe(false)
    expect('tableOfContents' in meta).toBe(false)
    expect('metadata' in meta).toBe(false)
  })

  it('getBook for a book not in the detail map falls back to the catalog row (not EPUB parse)', async () => {
    const connector = new FixtureConnector()
    const ref: BookRef = {
      sourceId: 'gutenberg',
      bookId: 'moby-dick',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Moby-Dick',
    }
    const meta = await connector.getBook(ref)
    // Falls back to catalog row — no rich detail, but valid BookMeta.
    expect(meta.title).toBe('Moby-Dick')
    expect(meta.authors).toEqual(['Herman Melville'])
    // No rich fields that the catalog row does not have.
    expect(meta.year).toBeUndefined()
    expect(meta.language).toBeUndefined()
    expect(meta.genres).toBeUndefined()
    expect(meta.description).toBeUndefined()
    // Still JSON-native after fallback.
    expect(JSON.parse(JSON.stringify(meta))).toEqual(meta)
  })
})

// ── c. Progress key isolation (no bleed across mediaType) ────────────────────

describe('progress keying — no bleed across mediaType (checker)', () => {
  it('EPUB and PDF of the same bookId have SEPARATE progress slots', async () => {
    const connector = new FixtureConnector()
    const strategy = connector.progressStrategy()

    const epubRef: BookRef = {
      sourceId: 'home-server',
      bookId: 'pride-and-prejudice',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Pride and Prejudice',
    }
    const pdfRef: BookRef = {
      sourceId: 'home-server',
      bookId: 'pride-and-prejudice',
      mediaType: MEDIA_TYPE_PDF,
      title: 'Pride and Prejudice',
    }

    const epubLocator = await strategy.getProgress(epubRef)
    const pdfLocator = await strategy.getProgress(pdfRef)

    // EPUB has seeded progress (38%).
    expect(epubLocator).toBeDefined()
    expect(epubLocator?.locations?.totalProgression).toBe(0.38)

    // PDF starts with NO progress — the EPUB reading position must NOT bleed into it.
    expect(pdfLocator).toBeUndefined()
  })

  it('writing progress for one mediaType does not affect the other', async () => {
    const connector = new FixtureConnector()
    const strategy = connector.progressStrategy()

    const pdfRef: BookRef = {
      sourceId: 'home-server',
      bookId: 'pride-and-prejudice',
      mediaType: MEDIA_TYPE_PDF,
      title: 'Pride and Prejudice',
    }
    const epubRef: BookRef = {
      sourceId: 'home-server',
      bookId: 'pride-and-prejudice',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Pride and Prejudice',
    }

    // Write a PDF position (12%).
    await strategy.setProgress(pdfRef, {
      href: 'pride-and-prejudice',
      type: MEDIA_TYPE_PDF,
      locations: { totalProgression: 0.12 },
    })

    // EPUB (38%) must be unchanged by the PDF write.
    const epubLocator = await strategy.getProgress(epubRef)
    expect(epubLocator?.locations?.totalProgression).toBe(0.38)

    // PDF now has its own independent slot.
    const pdfLocator = await strategy.getProgress(pdfRef)
    expect(pdfLocator?.locations?.totalProgression).toBe(0.12)
  })
})

// ── d. SyncedPerFormatCard exact maket sentence ───────────────────────────────

describe('SyncedPerFormatCard — exact maket sentence (checker)', () => {
  it('renders the verbatim SYNCED PER FORMAT explainer from doc/web/02', () => {
    const wrapper = mount(SyncedPerFormatCard)
    const text = wrapper.text()
    // Exact sentence from the maket (doc/web/02-book-detail-desktop.png). The EPUB/PDF are bolded
    // inline; text() collapses markup so only the sentence content matters here.
    expect(text).toContain(
      'Your EPUB position (Phone) and the PDF (Desktop) keep separate places — progress is keyed per format.',
    )
  })

  it('SYNCED card text does NOT contain Date objects or dynamic interpolation artefacts', () => {
    const wrapper = mount(SyncedPerFormatCard)
    const html = wrapper.html()
    // The sentence is static — no {{ }} template artefacts, no [object Object], no ISO dates.
    expect(html).not.toContain('[object')
    expect(html).not.toContain('undefined')
    expect(html).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
  })
})
