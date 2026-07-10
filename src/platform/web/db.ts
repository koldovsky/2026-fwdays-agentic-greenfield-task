// Dexie 4 structured store for offline-storage + sync-engine (ADR-005: OPFS holds the BYTES, Dexie
// holds the STRUCTURE). Two typed tables, both keyed per the load-bearing progress key
// `(sourceId, bookId, mediaType)` so the EPUB and the PDF of one title are distinct rows:
//   - `downloads` — the offline registry (size / state / when / OPFS key).
//   - `outbox`    — pending progress `Locator`s, collapsed to the furthest per key (sync-engine).
// This is a `platform/web` module: Dexie/IndexedDB are web APIs, so the durable store lives HERE, never
// in `core/*` (which stays DOM-free + server-free). The neutral outbox MODEL + `furthestWins` live in
// `core/sync`; this only persists them.

import Dexie, { type Table } from 'dexie'
import { MEDIA_TYPE_CBZ, MEDIA_TYPE_EPUB, MEDIA_TYPE_PDF } from '@/core/model'
import type { BookRef, Locator, MediaType } from '@/core/model'
import type { OutboxEntry } from '@/core/sync'

/** Download lifecycle. Only `complete` is served as a full book; `downloading`/`failed` never are. */
export type DownloadState = 'downloading' | 'complete' | 'failed'

/** One offline-registry row. Keyed per `(sourceId, bookId, mediaType)`; offline-available ⇔ complete. */
export interface DownloadRecord {
  sourceId: string
  bookId: string
  mediaType: MediaType
  /** Display title for the Downloads list (the `BookRef.title` at download time). */
  title: string
  /** Byte size written to OPFS (0 until the stream completes). */
  size: number
  state: DownloadState
  /** Epoch-ms the download COMPLETED (0 while downloading / on failure). */
  downloadedAt: number
  /** The OPFS file name the bytes were streamed to (see {@link opfsKeyFor}). */
  opfsKey: string
}

/**
 * One pending-progress row — the durable form of a `core/sync` {@link OutboxEntry}. The `BookRef` is
 * flattened to its key fields (+ `title`) so the compound primary key is the progress key itself; the
 * `Locator` rides whole. Collapsed to ONE row per key carrying the furthest pending position.
 */
export interface OutboxRecord {
  sourceId: string
  bookId: string
  mediaType: MediaType
  title: string
  locator: Locator
  queuedAt: number
}

/**
 * One durable LOCAL reading-position row — the device's own copy of the FURTHEST-progressed position per
 * book. Unlike the {@link OutboxRecord} (pending SERVER writes, DELETED once drained), a progress row is
 * updated furthest-wins on every page turn and is NEVER cleared by a sync drain. It is the resume-on-open
 * source (so a reopened book resumes at the furthest position read, even offline) and the UI's
 * progress-display source when the connector has no — or a coarser — server position. Keyed per the same
 * `(sourceId, bookId, mediaType)` progress key. Tracking the FURTHEST (not the latest) keeps it aligned
 * with the server's furthest-wins position, so a backward page never makes the server look "ahead".
 */
export interface ProgressRecord {
  sourceId: string
  bookId: string
  mediaType: MediaType
  title: string
  /** The furthest reading position reached for this book on THIS device. */
  locator: Locator
  /** Epoch-ms the row was last updated (the reader's `locatorChanged` time). */
  updatedAt: number
}

/** A downloaded book is offline-available exactly when its registry row reached `complete`. */
export function isOfflineAvailable(record: DownloadRecord): boolean {
  return record.state === 'complete'
}

/** The compound primary key, in the order declared by `version().stores()`. */
export type ProgressKeyTuple = [sourceId: string, bookId: string, mediaType: string]

export function keyTuple(
  ref: Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>,
): ProgressKeyTuple {
  return [ref.sourceId, ref.bookId, ref.mediaType]
}

/** File extension for the media types Edda downloads, so a cached file reads as a real book file and
 *  opens in an external reader if exported. Unknown types fall back to `bin`. */
function extensionForMediaType(mediaType: MediaType): string {
  switch (mediaType) {
    case MEDIA_TYPE_EPUB:
      return 'epub'
    case MEDIA_TYPE_CBZ:
      return 'cbz'
    case MEDIA_TYPE_PDF:
      return 'pdf'
    default:
      return 'bin'
  }
}

/** Make a title safe for an OPFS / OS file name: drop path separators and reserved characters,
 *  collapse whitespace, and cap the length. Never empty (falls back to `book`). */
function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.slice(0, 80) || 'book'
}

/** A short, stable, dependency-free hash (FNV-1a → base36) of the progress key. It disambiguates files
 *  whose human-readable title is identical (or absent), keeping the readable name collision-RESISTANT per
 *  `(sourceId, bookId, mediaType)` — 32 bits, so a clash needs the same title AND media type AND a hash
 *  collision (negligible for a personal library, and the stored {@link DownloadRecord.opfsKey} is
 *  authoritative regardless). Length-prefixing each segment makes the hash INPUT unambiguous, so
 *  `(sourceId="a__b", bookId="c")` and `(sourceId="a", bookId="b__c")` hash distinctly. */
function shortKeyHash(ref: Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>): string {
  const key = `${ref.sourceId.length}:${ref.sourceId}:${ref.bookId.length}:${ref.bookId}:${ref.mediaType}`
  let hash = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36).padStart(7, '0')
}

/**
 * A human-readable, collision-free, filesystem-safe OPFS file name for a book's bytes — e.g.
 * `Pensées [k3f9a1z].epub`. The display title (when known) becomes the base name and the media type
 * chooses the extension, so the cached file is recognisable in DevTools / OPFS and openable if exported
 * (previously it was an opaque `book_…​.bin`). A short stable hash of the progress key is appended so two
 * books with the SAME title (or a missing title) still map to distinct files — the appended hash keeps the
 * readable name collision-resistant per `(sourceId, bookId, mediaType)`. The generated name is stored on
 * the {@link DownloadRecord}; reads
 * and deletes look that STORED value up rather than recomputing, so a later call that lacks the title still
 * resolves the same file.
 */
export function opfsKeyFor(
  ref: Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'> & { title?: string },
  title: string | undefined = ref.title,
): string {
  const base = title?.trim()
    ? sanitizeFilename(title)
    : `${sanitizeFilename(ref.sourceId)} ${sanitizeFilename(ref.bookId)}`
  return `${base} [${shortKeyHash(ref)}].${extensionForMediaType(ref.mediaType)}`
}

/** Flatten a neutral {@link OutboxEntry} to its durable {@link OutboxRecord}. */
export function toOutboxRecord(entry: OutboxEntry): OutboxRecord {
  return {
    sourceId: entry.ref.sourceId,
    bookId: entry.ref.bookId,
    mediaType: entry.ref.mediaType,
    title: entry.ref.title,
    locator: entry.locator,
    queuedAt: entry.queuedAt,
  }
}

/** Re-inflate a durable {@link OutboxRecord} into a neutral {@link OutboxEntry}. */
export function fromOutboxRecord(record: OutboxRecord): OutboxEntry {
  return {
    ref: {
      sourceId: record.sourceId,
      bookId: record.bookId,
      mediaType: record.mediaType,
      title: record.title,
    },
    locator: record.locator,
    queuedAt: record.queuedAt,
  }
}

/** Build a durable {@link ProgressRecord} from a sync {@link OutboxEntry} carrying the position to store
 *  (the caller passes the furthest-wins winner as the entry's `locator`). */
export function toProgressRecord(entry: OutboxEntry): ProgressRecord {
  return {
    sourceId: entry.ref.sourceId,
    bookId: entry.ref.bookId,
    mediaType: entry.ref.mediaType,
    title: entry.ref.title,
    locator: entry.locator,
    updatedAt: entry.queuedAt,
  }
}

/** Optional Dexie injection so tests can run on `fake-indexeddb` (jsdom ships no IndexedDB). */
export interface EddaDbOptions {
  /** Database name; defaults to `edda`. Tests pass a unique name for isolation. */
  name?: string
  /** A custom `IDBFactory` (e.g. `fake-indexeddb`'s) — omit in the browser to use the global. */
  indexedDB?: IDBFactory
  /** The matching `IDBKeyRange` constructor when `indexedDB` is injected. */
  IDBKeyRange?: typeof IDBKeyRange
}

/**
 * The Edda structured database. Versioned `stores()` migrations are Dexie's typed-migration mechanism
 * (ADR-005): v1 declares the download + outbox tables keyed by the compound progress key; v2 adds a
 * `title` index to `downloads` (the Downloads list sorts by it); v3 adds the durable local `progress`
 * cache (resume-on-open + UI progress fallback) — each migration exercised by `db.test.ts` to prove it
 * applies cleanly while existing rows survive.
 */
export class EddaDb extends Dexie {
  declare downloads: Table<DownloadRecord, ProgressKeyTuple>
  declare outbox: Table<OutboxRecord, ProgressKeyTuple>
  declare progress: Table<ProgressRecord, ProgressKeyTuple>

  constructor(options: EddaDbOptions = {}) {
    super(options.name ?? 'edda', {
      ...(options.indexedDB ? { indexedDB: options.indexedDB } : {}),
      ...(options.IDBKeyRange ? { IDBKeyRange: options.IDBKeyRange } : {}),
    })
    // v1 — the two tables, both keyed per (sourceId, bookId, mediaType); secondary indexes for the
    // Downloads list (state, downloadedAt) and outbox ordering (queuedAt).
    this.version(1).stores({
      downloads: '[sourceId+bookId+mediaType], state, downloadedAt',
      outbox: '[sourceId+bookId+mediaType], queuedAt',
    })
    // v2 — add a `title` index so the Downloads list can sort by title. Additive: existing rows already
    // carry `title`, so the upgrade is index-only (no row rewrite needed); Dexie builds the index.
    this.version(2).stores({
      downloads: '[sourceId+bookId+mediaType], state, downloadedAt, title',
      outbox: '[sourceId+bookId+mediaType], queuedAt',
    })
    // v3 — add the durable LOCAL progress cache: the device's own copy of the latest position per book,
    // the resume-on-open source and the UI progress fallback. Additive (a new table keyed per the same
    // progress key, `updatedAt` indexed for recency); existing downloads/outbox rows are untouched.
    this.version(3).stores({
      downloads: '[sourceId+bookId+mediaType], state, downloadedAt, title',
      outbox: '[sourceId+bookId+mediaType], queuedAt',
      progress: '[sourceId+bookId+mediaType], updatedAt',
    })
  }
}
