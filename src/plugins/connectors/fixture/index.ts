// In-memory fixture Connector (fixture-connector-first — architecture.md / DESIGN-CONNECTORS.md). The Library
// renders on this with no server, so the screen is real and unit-testable. It implements the SAME
// `core/contracts` Connector the Komga REST connector (add-connector-komga) will — the Library binds
// the interface, never this class, so Komga is swapped in with no Library changes. Seeded to
// reproduce doc/web/01-library-desktop.png exactly. Plugins are always async (ADR-009).

import type { Connector, ProgressSyncStrategy } from '@/core/contracts'
import type { BookMeta, BookRef, LibraryBrowseEntry, Locator, ProgressSnapshot } from '@/core/model'
import {
  MEDIA_TYPE_CBZ,
  MEDIA_TYPE_EPUB,
  MEDIA_TYPE_PDF,
  locatorLocationsFromSnapshot,
  progressSnapshotFromLocator,
} from '@/core/model'

/** Catalog totals the Library's counts line shows. Duck-typed: NOT part of the Connector contract. */
export interface CatalogSummary {
  totalTitles: number
  sourcesCount: number
  downloadedCount: number
}

/** A catalog row: the browse entry's identity + display data, minus the per-key progress snapshot. */
type CatalogBook = Omit<LibraryBrowseEntry, 'progress'>

/** The load-bearing progress key — reading positions are keyed per (sourceId, bookId, mediaType). */
function progressMapKey(ref: Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>): string {
  return `${ref.sourceId}:${ref.bookId}:${ref.mediaType}`
}

/**
 * Fixture file shape for the readable formats — the demo serves `/fixtures/<bookId>.<ext>` and the bytes
 * it gets back must actually carry this content-type. Load-bearing for {@link FixtureConnector.content}:
 * a dev/static server's SPA fallback answers a MISSING conventional path with `index.html` at HTTP 200
 * (never a 404), so `response.ok` alone is never proof of a real file — the content-type is the only
 * honest signal that the bytes are the binary format they claim to be, not the app shell.
 */
const FIXTURE_FORMATS: Readonly<Record<string, { extension: string; contentType: string }>> = {
  [MEDIA_TYPE_EPUB]: { extension: 'epub', contentType: 'application/epub+zip' },
  [MEDIA_TYPE_PDF]: { extension: 'pdf', contentType: 'application/pdf' },
}

// --- The maket catalog (doc/web/01-library-desktop.png) --------------------
// Three "Keep reading" titles (seeded with progress below) + six "Recently added". Covers are
// placeholder colours (no <img> until a connector supplies real thumbnails — add-connector-komga).

const CATALOG: readonly CatalogBook[] = [
  // Keep reading ----------------------------------------------------------
  {
    sourceId: 'home-server',
    bookId: 'pride-and-prejudice',
    mediaType: MEDIA_TYPE_EPUB,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    coverColor: '#6f7457',
    spineLabel: 'AUSTEN',
    sourceLabel: 'komga',
    addedAt: '2026-05-02T09:00:00.000Z',
  },
  {
    sourceId: 'home-server',
    bookId: 'saltmoon',
    mediaType: MEDIA_TYPE_CBZ,
    title: 'Saltmoon',
    seriesLabel: 'Vol. 4 · R. Okonkwo',
    coverColor: '#3f6b70',
    spineLabel: 'VOL. 4',
    sourceLabel: 'komga',
    addedAt: '2026-05-08T09:00:00.000Z',
  },
  {
    sourceId: 'study-calibre',
    bookId: 'the-picture-of-dorian-gray',
    mediaType: MEDIA_TYPE_PDF,
    title: 'Dorian Gray',
    author: 'Oscar Wilde',
    coverColor: '#6d3b46',
    sourceLabel: 'calibre',
    addedAt: '2026-05-05T09:00:00.000Z',
  },
  // Recently added (newest first by addedAt) ------------------------------
  {
    sourceId: 'gutenberg',
    bookId: 'frankenstein',
    mediaType: MEDIA_TYPE_EPUB,
    title: 'Frankenstein',
    author: 'Mary Shelley',
    coverColor: '#41553f',
    spineLabel: 'M. SHELLEY',
    sourceLabel: 'gutenberg',
    addedAt: '2026-06-28T09:00:00.000Z',
  },
  {
    sourceId: 'gutenberg',
    bookId: 'moby-dick',
    mediaType: MEDIA_TYPE_EPUB,
    title: 'Moby-Dick',
    author: 'Herman Melville',
    coverColor: '#3b5168',
    spineLabel: 'H. MELVILLE',
    sourceLabel: 'gutenberg',
    addedAt: '2026-06-27T09:00:00.000Z',
  },
  {
    sourceId: 'gutenberg',
    bookId: 'dracula',
    mediaType: MEDIA_TYPE_EPUB,
    title: 'Dracula',
    author: 'Bram Stoker',
    coverColor: '#272320',
    spineLabel: 'B. STOKER',
    sourceLabel: 'gutenberg',
    addedAt: '2026-06-26T09:00:00.000Z',
  },
  {
    sourceId: 'home-server',
    bookId: 'the-tin-forest',
    mediaType: MEDIA_TYPE_CBZ,
    title: 'The Tin Forest',
    seriesLabel: 'Vol. 1 · A. Voss',
    coverColor: '#7d6592',
    spineLabel: 'VOL. 1',
    sourceLabel: 'komga',
    addedAt: '2026-06-25T09:00:00.000Z',
  },
  {
    sourceId: 'gutenberg',
    bookId: 'great-expectations',
    mediaType: MEDIA_TYPE_EPUB,
    title: 'Great Expectations',
    author: 'Charles Dickens',
    coverColor: '#a87d28',
    spineLabel: 'C. DICKENS',
    sourceLabel: 'gutenberg',
    addedAt: '2026-06-24T09:00:00.000Z',
  },
  {
    sourceId: 'gutenberg',
    bookId: 'jane-eyre',
    mediaType: MEDIA_TYPE_EPUB,
    title: 'Jane Eyre',
    author: 'Charlotte Brontë',
    coverColor: '#9d4b39',
    spineLabel: 'C. BRONTË',
    sourceLabel: 'gutenberg',
    addedAt: '2026-06-23T09:00:00.000Z',
  },
]

// --- Book-detail metadata (doc/web/02-book-detail-desktop.png) --------------
// Rich BookMeta for the maket's detail book; every other title falls back to a minimal BookMeta derived
// from its catalog row (so any book opens without breaking). This is in-memory catalog metadata — never
// an EPUB parse (the real TOC is add-format-epub). `chapterCount` is the count the maket shows; the rows
// themselves render once a FormatHandler supplies `Publication.toc`.
const BOOK_DETAIL: Readonly<Record<string, BookMeta>> = {
  'pride-and-prejudice': {
    title: 'Pride and Prejudice',
    authors: ['Jane Austen'],
    year: 1813,
    language: 'English',
    pageCount: 432,
    genres: ['Fiction', 'Romance'],
    description:
      "Elizabeth Bennet's wit meets Mr. Darcy's pride in Austen's sharpest comedy of manners — a portrait of love, reputation, and the trouble with second impressions in Regency England.",
    coverColor: '#6f7457',
    breadcrumb: ['home server', 'fiction', 'austen'],
    chapterCount: 61,
  },
}

/** The maket's P&P card was last read two hours ago, on the user's phone. */
const PRIDE_LAST_READ_HOURS_AGO = 2
const PRIDE_LAST_READ_DEVICE = 'Phone'

/** Seed positions, keyed per (sourceId, bookId, mediaType) — the maket's three "Keep reading" cards. */
const SEED_PROGRESS: ReadonlyArray<
  readonly [Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>, ProgressSnapshot]
> = [
  // "38% · 1h 12m left"
  [
    { sourceId: 'home-server', bookId: 'pride-and-prejudice', mediaType: MEDIA_TYPE_EPUB },
    { totalProgression: 0.38, minutesLeft: 72 },
  ],
  // "page 88 / 192"
  [
    { sourceId: 'home-server', bookId: 'saltmoon', mediaType: MEDIA_TYPE_CBZ },
    { position: 88, totalPositions: 192 },
  ],
  // "12% · just started"
  [
    { sourceId: 'study-calibre', bookId: 'the-picture-of-dorian-gray', mediaType: MEDIA_TYPE_PDF },
    { totalProgression: 0.12 },
  ],
]

/**
 * Local-only ProgressSyncStrategy: an in-memory snapshot store keyed per (sourceId, bookId,
 * mediaType). `progressSync=false`, so this is the no-op / on-device strategy the contract expects —
 * no server round-trips. Exposed via the contract's `Locator` shape (totals the Locator can't carry,
 * e.g. a comic's page count, are preserved across writes).
 */
class LocalProgressStrategy implements ProgressSyncStrategy {
  constructor(private readonly store: Map<string, ProgressSnapshot>) {}

  async getProgress(ref: BookRef): Promise<Locator | undefined> {
    const snapshot = this.store.get(progressMapKey(ref))
    if (!snapshot) return undefined
    const locator: Locator = {
      href: ref.bookId,
      type: ref.mediaType,
      title: ref.title,
      locations: locatorLocationsFromSnapshot(snapshot),
    }
    // Sync-record metadata rides on the locator's top level — the detail "Last read … on …" line.
    if (snapshot.lastReadAt !== undefined) locator.lastReadAt = snapshot.lastReadAt
    if (snapshot.lastReadDevice !== undefined) locator.lastReadDevice = snapshot.lastReadDevice
    return locator
  }

  async setProgress(ref: BookRef, locator: Locator): Promise<void> {
    const existing = this.store.get(progressMapKey(ref))
    // Merge so totals the Locator doesn't carry (totalPositions, minutesLeft) survive a write.
    this.store.set(progressMapKey(ref), { ...existing, ...progressSnapshotFromLocator(locator) })
  }
}

export class FixtureConnector implements Connector {
  readonly id = 'connector-fixture'
  readonly progressSync = false
  readonly summary: CatalogSummary = { totalTitles: 342, sourcesCount: 3, downloadedCount: 14 }

  private readonly progress = new Map<string, ProgressSnapshot>()

  constructor() {
    for (const [ref, snapshot] of SEED_PROGRESS) {
      this.progress.set(progressMapKey(ref), { ...snapshot })
    }
    // Stamp the P&P EPUB position with a "last read" relative to NOW (read here, at construction, not at
    // module load) so the detail screen's "Last read 2h ago on Phone" line is exact under fake timers.
    const pride = this.progress.get(
      progressMapKey({
        sourceId: 'home-server',
        bookId: 'pride-and-prejudice',
        mediaType: MEDIA_TYPE_EPUB,
      }),
    )
    if (pride) {
      pride.lastReadAt = new Date(
        Date.now() - PRIDE_LAST_READ_HOURS_AGO * 60 * 60 * 1000,
      ).toISOString()
      pride.lastReadDevice = PRIDE_LAST_READ_DEVICE
    }
  }

  async probe(): Promise<boolean> {
    return true
  }

  async browse(): Promise<LibraryBrowseEntry[]> {
    return CATALOG.map((book) => {
      const snapshot = this.progress.get(progressMapKey(book))
      // Attach the per-key snapshot only where one exists, so "recently added" rows stay progress-free.
      return snapshot ? { ...book, progress: { ...snapshot } } : { ...book }
    })
  }

  /**
   * Book-detail metadata for the detail screen (doc/web/02). The maket book returns rich {@link BookMeta};
   * any other title degrades to a minimal one derived from its catalog row, so every book opens. In-memory
   * only — never an EPUB parse (the real TOC is add-format-epub).
   */
  async getBook(ref: BookRef): Promise<BookMeta> {
    const detail = BOOK_DETAIL[ref.bookId]
    if (detail) return structuredClone(detail)
    const book = CATALOG.find((entry) => entry.bookId === ref.bookId)
    const meta: BookMeta = {
      title: book?.title ?? ref.title,
      authors: book?.author ? [book.author] : [],
    }
    if (book?.coverColor) meta.coverColor = book.coverColor
    return meta
  }

  /**
   * Book bytes for the reader (add-reader-navigation). This in-memory demo connector has no server of its
   * own, so it looks for a fixture file at the conventional `/fixtures/<bookId>.<ext>` path — enough for
   * the Reader screen to render a real publication when a test/tool fulfills that path (the visual/a11y/
   * e2e suites route-mock it with real bytes; see `e2e/visual/maket-seed.ts`). This connector never bundles
   * or ships book files itself (it is a TEST-ONLY seed — `src/main.ts` wires it in only behind
   * `localStorage['edda.seed'] === 'fixture'`, never in production), so outside of that mocking a fixture
   * book legitimately has no bytes on disk.
   *
   * That "no bytes" case must fail HONESTLY, not silently: a static/dev server never 404s a same-origin
   * path like this — a missing one 200s with the SPA's `index.html` fallback. Trusting `response.ok` alone
   * would hand the reader an HTML document to unzip, which dies deep inside the format handler with an
   * opaque "End of central directory not found". So this checks the response's actual content-type against
   * the binary type the format requires and throws a plain, actionable error itself when it doesn't match —
   * surfaced by the reader as a calm "Couldn't open this book" empty state (never a crash). CBZ has no
   * reader yet, so it returns empty untouched.
   */
  async content(ref: BookRef): Promise<Uint8Array> {
    const format = FIXTURE_FORMATS[ref.mediaType]
    if (!format) return new Uint8Array()
    const label = ref.title || ref.bookId
    const response = await fetch(`/fixtures/${encodeURIComponent(ref.bookId)}.${format.extension}`)
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.startsWith(format.contentType)) {
      throw new Error(
        `This fixture (demo) source has no reader file for “${label}” — there is nothing to open. ` +
          'Connect a real source, such as Komga, to read a book.',
      )
    }
    return new Uint8Array(await response.arrayBuffer())
  }

  progressStrategy(): ProgressSyncStrategy {
    return new LocalProgressStrategy(this.progress)
  }
}

export default FixtureConnector
