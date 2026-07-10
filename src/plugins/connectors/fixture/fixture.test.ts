import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BookRef, LibraryBrowseEntry } from '@/core/model'
import {
  MEDIA_TYPE_CBZ,
  MEDIA_TYPE_EPUB,
  MEDIA_TYPE_PDF,
  formatLabel,
  progressFraction,
  progressReadout,
} from '@/core/model'
import FixtureConnector from '.'

function fakeResponse(init: { ok: boolean; contentType: string; body?: Uint8Array }): Response {
  return {
    ok: init.ok,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? init.contentType : null),
    },
    async arrayBuffer() {
      return (init.body ?? new Uint8Array()).buffer
    },
  } as unknown as Response
}

function byTitle(entries: LibraryBrowseEntry[], title: string): LibraryBrowseEntry {
  const found = entries.find((entry) => entry.title === title)
  if (!found) throw new Error(`fixture is missing "${title}"`)
  return found
}

const hasStarted = (entry: LibraryBrowseEntry): boolean =>
  entry.progress !== undefined &&
  ((entry.progress.totalProgression ?? 0) > 0 || (entry.progress.position ?? 0) > 0)

describe('FixtureConnector — shape & contract', () => {
  it('is an async, identifiable, local-only Connector', () => {
    const connector = new FixtureConnector()
    expect(connector.id).toBe('connector-fixture')
    expect(connector.progressSync).toBe(false)
    expect(connector.browse()).toBeInstanceOf(Promise)
    expect(connector.probe()).toBeInstanceOf(Promise)
  })

  it('exposes a duck-typed catalog summary matching the maket counts line', () => {
    expect(new FixtureConnector().summary).toEqual({
      totalTitles: 342,
      sourcesCount: 3,
      downloadedCount: 14,
    })
  })
})

describe('FixtureConnector — catalog reproduces doc/web/01', () => {
  it('browses nine entries: three in-progress + six recently added', async () => {
    const entries = await new FixtureConnector().browse()
    expect(entries).toHaveLength(9)
    expect(entries.filter(hasStarted)).toHaveLength(3)
    expect(entries.filter((entry) => !hasStarted(entry))).toHaveLength(6)
  })

  it('seeds the three "Keep reading" cards with the maket readouts, chips, and lines', async () => {
    const entries = await new FixtureConnector().browse()

    const pride = byTitle(entries, 'Pride and Prejudice')
    expect(pride.author).toBe('Jane Austen')
    expect(pride.mediaType).toBe(MEDIA_TYPE_EPUB)
    expect(formatLabel(pride.mediaType)).toBe('EPUB')
    expect(pride.sourceLabel).toBe('komga')
    expect(progressReadout(pride.progress!)).toBe('38% · 1h 12m left')
    expect(Math.round(progressFraction(pride.progress!) * 100)).toBe(38)

    const saltmoon = byTitle(entries, 'Saltmoon')
    expect(saltmoon.seriesLabel).toBe('Vol. 4 · R. Okonkwo')
    expect(formatLabel(saltmoon.mediaType)).toBe('CBZ')
    expect(saltmoon.sourceLabel).toBe('komga')
    expect(progressReadout(saltmoon.progress!)).toBe('page 88 / 192')

    const dorian = byTitle(entries, 'Dorian Gray')
    expect(dorian.author).toBe('Oscar Wilde')
    expect(formatLabel(dorian.mediaType)).toBe('PDF')
    expect(dorian.sourceLabel).toBe('calibre')
    expect(progressReadout(dorian.progress!)).toBe('12% · just started')
  })

  it('seeds the six "Recently added" covers with format badges and spine labels', async () => {
    const entries = await new FixtureConnector().browse()
    const recently = entries.filter((entry) => !hasStarted(entry))

    expect(recently.map((entry) => entry.title)).toEqual(
      expect.arrayContaining([
        'Frankenstein',
        'Moby-Dick',
        'Dracula',
        'The Tin Forest',
        'Great Expectations',
        'Jane Eyre',
      ]),
    )
    // Every recently-added cover has the data its badge/spine/cover need.
    for (const entry of recently) {
      expect(['EPUB', 'CBZ', 'PDF']).toContain(formatLabel(entry.mediaType))
      expect(typeof entry.coverColor).toBe('string')
      expect(typeof entry.addedAt).toBe('string')
    }
    expect(formatLabel(byTitle(recently, 'The Tin Forest').mediaType)).toBe('CBZ')
    expect(byTitle(recently, 'Jane Eyre').author).toBe('Charlotte Brontë')
  })
})

describe('FixtureConnector — progress is keyed per (sourceId, bookId, mediaType)', () => {
  it('the same title in two formats holds two independent positions', async () => {
    const strategy = new FixtureConnector().progressStrategy()
    const epubRef: BookRef = {
      sourceId: 'src',
      bookId: 'dual-format',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Dual',
    }
    const pdfRef: BookRef = { ...epubRef, mediaType: MEDIA_TYPE_PDF }

    await strategy.setProgress(epubRef, {
      href: epubRef.bookId,
      type: epubRef.mediaType,
      locations: { totalProgression: 0.5 },
    })

    // Same source+book, different mediaType ⇒ a different key ⇒ no bleed-through.
    expect(await strategy.getProgress(epubRef)).toBeDefined()
    expect(await strategy.getProgress(pdfRef)).toBeUndefined()
  })

  it('reads a seeded position back as a Locator', async () => {
    const strategy = new FixtureConnector().progressStrategy()
    const locator = await strategy.getProgress({
      sourceId: 'home-server',
      bookId: 'pride-and-prejudice',
      mediaType: MEDIA_TYPE_EPUB,
      title: 'Pride and Prejudice',
    })
    expect(locator?.locations?.totalProgression).toBe(0.38)
  })
})

describe('FixtureConnector — entries are pure, serializable data', () => {
  it('carries no functions, Dates, or other non-JSON values', async () => {
    const entries = await new FixtureConnector().browse()
    // A JSON clone equal to the original proves the entries are JSON-native (no fn/Date/undefined leak).
    expect(JSON.parse(JSON.stringify(entries))).toEqual(entries)
    for (const entry of entries) {
      for (const value of Object.values(entry)) {
        expect(typeof value).not.toBe('function')
      }
    }
  })
})

describe('FixtureConnector — content() fails loudly instead of trusting response.ok', () => {
  const epubRef: BookRef = {
    sourceId: 'home-server',
    bookId: 'pride-and-prejudice',
    mediaType: MEDIA_TYPE_EPUB,
    title: 'Pride and Prejudice',
  }

  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the bytes when the response is ok AND carries the expected binary content-type', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    fetchMock.mockResolvedValue(
      fakeResponse({ ok: true, contentType: 'application/epub+zip', body: bytes }),
    )

    const result = await new FixtureConnector().content(epubRef)

    expect(fetchMock).toHaveBeenCalledWith('/fixtures/pride-and-prejudice.epub')
    expect(result).toEqual(bytes)
  })

  it('rejects a 200 whose content-type is the SPA-fallback HTML shell, not the file — the P0 bug', async () => {
    // Exactly what a dev/static server answers for a MISSING /fixtures/<id>.epub: HTTP 200, `index.html`.
    // `response.ok` is true here, so the old code shipped this straight to the reader's unzip and died on
    // "End of central directory not found". The content-type check must catch it BEFORE that happens.
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, contentType: 'text/html; charset=utf-8' }))

    await expect(new FixtureConnector().content(epubRef)).rejects.toThrow(
      /no reader file for .Pride and Prejudice./,
    )
  })

  it('rejects a non-ok response with the same honest message (no bytes returned either way)', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, contentType: 'text/html' }))

    await expect(new FixtureConnector().content(epubRef)).rejects.toThrow(
      'Connect a real source, such as Komga, to read a book.',
    )
  })

  it('never fetches for a media type the fixture has no file mapping for (CBZ) — returns empty', async () => {
    const result = await new FixtureConnector().content({
      sourceId: 'home-server',
      bookId: 'saltmoon',
      mediaType: MEDIA_TYPE_CBZ,
      title: 'Saltmoon',
    })

    expect(result).toEqual(new Uint8Array())
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
