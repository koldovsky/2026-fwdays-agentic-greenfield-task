// Platform-neutral domain model (Readium-aligned). Plain, serializable shapes only —
// no DOM, no network types — so the future native client serializes the identical shape.
// Full interfaces: DESIGN-CONNECTORS.md §4–§5.

export type MediaType = string

export interface LocatorLocations {
  /** 0..1 within a resource. */
  progression?: number
  /** 0..1 within the whole publication. */
  totalProgression?: number
  /** Stable position index (1-based) where the format supports it. */
  position?: number
  /** EPUB CFI (mapped to/from foliate by the EPUB adapter). */
  cfi?: string
  /** PDF page (1-based). */
  page?: number
  /**
   * Estimated minutes of reading remaining from this position — a derived reading-time estimate the
   * progress UI formats ("about 1h 12m left"). Carried on the locator so the estimate survives a
   * Locator round-trip; absent ⇒ no estimate ("just started").
   */
  minutesLeft?: number
}

export interface LocatorText {
  before?: string
  highlight?: string
  after?: string
}

/** A position inside a publication; also the unit the sync engine stores. */
export interface Locator {
  href: string
  type: MediaType
  title?: string
  locations?: LocatorLocations
  text?: LocatorText
  /**
   * Sync-record metadata the sync engine / local strategy stamps onto the STORED locator: an ISO-8601
   * timestamp (never a `Date`) of when this position was last written, and a human label of the device
   * that wrote it. Plain JSON-native values so the native client serializes them identically. Optional —
   * a freshly computed, in-memory locator carries neither; the progress UI shows "Last read … on …".
   */
  lastReadAt?: string
  lastReadDevice?: string
}

export interface PublicationMetadata {
  title: string
  author?: string
  language?: string
}

/**
 * Page-layout discriminator so the navigator and the library card can branch (a reflowable novel
 * vs a fixed PDF vs an image-sequence comic). A closed set — when a Publication declares its layout
 * it MUST be exactly one of these.
 */
export type PublicationLayout = 'reflowable' | 'fixed' | 'image-sequence' | 'mixed'

/** Normalised output of a FormatHandler. */
export interface Publication {
  metadata: PublicationMetadata
  readingOrder: Locator[]
  tableOfContents?: Locator[]
  /** How the pages lay out; absent until a FormatHandler determines it. */
  layout?: PublicationLayout
}

/**
 * Shared, serializable reading-preference vocabulary the {@link Navigator} APPLIES (it does not own the
 * values): theme / typeface / text size / paged-vs-scroll layout / spacing density / RTL. Plain
 * JSON-native data (no DOM, no network) so it crosses the reader bridge and the future native client
 * re-expresses the identical shape. Persistence + the preferences panel are `add-reading-preferences`
 * (change 8); this type is only the vocabulary and the `Navigator.applyPreferences` contract member. The
 * web-only mapping to readium-css/foliate styles stays in the platform/web reader frame (`reader-css.ts`),
 * never here.
 *
 * One CLEAN vocabulary (no parallel legacy aliases): the maket's four controls map 1:1 to closed-union
 * tokens (`theme`/`typeface`/`layout`/`spacing`) plus the human point size (`textSizePt`) and RTL. Every
 * field is optional so a partial update (`applyPreferences({ theme })`) is valid and the type stays a lean
 * native-conformance target. The closed unions also keep the web mapping injection-safe: a font can only
 * ever be one of three known stacks, never an arbitrary string interpolated into CSS.
 */
export interface ReadingPreferences {
  /** A closed set — one of the maket's four reading themes. */
  theme?: 'light' | 'sepia' | 'dark' | 'parchment'
  /** A closed set — one of the maket's three typefaces (self-hosted serif faces + a system sans stack). */
  typeface?: 'newsreader' | 'literata' | 'sans'
  /** Body text size in POINTS (the panel's human label, e.g. `17pt`); mapped to a CSS size at the web seam. */
  textSizePt?: number
  /** Page layout: `paged` (paginated columns) or `scroll` (one continuous column). */
  layout?: 'paged' | 'scroll'
  /** Line/paragraph spacing density — a closed set of named presets. */
  spacing?: 'compact' | 'cozy' | 'relaxed'
  /** Right-to-left reading direction. */
  rtl?: boolean
}

/** Lightweight reference from browse/search, before a file is opened. */
export interface BookRef {
  sourceId: string
  bookId: string
  mediaType: MediaType
  title: string
}

/**
 * A byte range for partial reads, HTTP-style: `start` and an INCLUSIVE `end` (so `{start:0,end:1023}`
 * is the first 1024 bytes). Omitting `end` means "to the end of the resource". Plain numbers only —
 * the connector maps this to a transport `Range` header; offline (OPFS `File.slice`) reuses the shape.
 */
export interface ByteRange {
  start: number
  /** Inclusive end byte; absent ⇒ to the end of the resource. */
  end?: number
}

/**
 * Reading positions are keyed per (sourceId, bookId, mediaType): the same title as EPUB
 * vs PDF yields different locators and is two legitimate, separate positions.
 */
export type ProgressKey = Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>

export function progressKey(ref: BookRef): ProgressKey {
  return { sourceId: ref.sourceId, bookId: ref.bookId, mediaType: ref.mediaType }
}

// --- Library view-model ----------------------------------------------------
// The display shape the Library cards/covers render. Platform-neutral (no DOM, no network): the
// future native client re-expresses the identical shape, guarded by the serialization conformance
// tests. Format/source labels and the readout phrase are DERIVED here from structured data — never
// stored as formatted strings — so formatting/i18n stays presentation, not model state.

/** Canonical media types Edda renders (EPUB now; CBZ/PDF as their format handlers land). */
export const MEDIA_TYPE_EPUB = 'application/epub+zip'
export const MEDIA_TYPE_CBZ = 'application/vnd.comicbook+zip'
export const MEDIA_TYPE_PDF = 'application/pdf'

/**
 * A read-position summary a library card renders — derived from the stored {@link Locator}, enriched
 * with the totals the card needs (e.g. a comic's page count). Structured numbers only: the readout
 * phrase ("38% · 1h 12m left", "page 88 / 192") is FORMATTED by {@link progressReadout}, never stored.
 */
export interface ProgressSnapshot {
  /** 0..1 across the whole publication — percent-tracked formats (EPUB, PDF). */
  totalProgression?: number
  /** 1-based current position — page-tracked formats (comics, PDF-by-page). */
  position?: number
  /** Total positions for page-tracked formats (the "/ 192"). */
  totalPositions?: number
  /** Estimated minutes of reading left; the UI formats it ("1h 12m left"). Absent ⇒ "just started". */
  minutesLeft?: number
  /** ISO-8601 timestamp this position was last read (never a `Date`); the UI formats it ("2h ago"). */
  lastReadAt?: string
  /** Human device label this position was last read on (e.g. "Phone"); the UI shows "on <device>". */
  lastReadDevice?: string
}

/**
 * The display view-model a library card/cover renders — a {@link BookRef} identity plus optional,
 * derivable presentation data. Every field beyond the identity is optional so sources with sparse
 * metadata still render. Carries no DOM and no network types.
 */
export interface LibraryBrowseEntry extends BookRef {
  author?: string
  /** Series/volume label shown in place of a plain author line, e.g. "Vol. 4 · R. Okonkwo". */
  seriesLabel?: string
  /** Thumbnail REFERENCE (an href), never embedded bytes; absent until a connector supplies covers. */
  thumbnailHref?: string
  /** Placeholder cover background colour until real thumbnails arrive (a CSS colour string). */
  coverColor?: string
  /** Short spine label drawn on the cover, e.g. "AUSTEN", "VOL. 4". */
  spineLabel?: string
  /** Human source label for the "<FORMAT> · <source>" line, e.g. "komga", "calibre". */
  sourceLabel?: string
  /** JSON-native timestamp (ISO-8601 string, never a `Date`) for "recently added" ordering. */
  addedAt?: string
  /** Read-position snapshot for in-progress ("Keep reading") entries; absent ⇒ not started. */
  progress?: ProgressSnapshot
}

/**
 * A small, curated placeholder-cover palette — the same earth-tone swatches the fixture catalog already
 * ships per book (DESIGN.md's "Signature: the Cover Overlay" sanctions raw, non-token colour here: covers
 * are arbitrary art, the one surface the chrome token system doesn't reach). Reused, not reinvented, as
 * the deterministic fallback for entries a connector can't yet illustrate (e.g. Komga before/without a
 * thumbnail) so an uncovered shelf still reads as distinct books, not a copy-pasted tile.
 */
export const PLACEHOLDER_COVER_PALETTE: readonly string[] = [
  '#6f7457',
  '#3f6b70',
  '#6d3b46',
  '#41553f',
  '#3b5168',
  '#272320',
  '#7d6592',
  '#a87d28',
  '#9d4b39',
]

/**
 * Deterministically map a book id to one of {@link PLACEHOLDER_COVER_PALETTE}'s colours (a stable djb2
 * string hash mod the palette length). The SAME book always gets the SAME swatch across renders and
 * sessions — a random colour per render would make the shelf feel broken rather than merely uncovered.
 */
export function derivePlaceholderCoverColor(bookId: string): string {
  let hash = 5381
  for (let i = 0; i < bookId.length; i++) {
    hash = (hash * 33) ^ bookId.charCodeAt(i)
  }
  const index = Math.abs(hash) % PLACEHOLDER_COVER_PALETTE.length
  return PLACEHOLDER_COVER_PALETTE[index] ?? PLACEHOLDER_COVER_PALETTE[0] ?? '#55614c'
}

/** Map a media type to the short format label a card shows (EPUB / CBZ / PDF). */
export function formatLabel(mediaType: MediaType): string {
  const type = mediaType.toLowerCase()
  if (type === MEDIA_TYPE_EPUB || type.includes('epub')) return 'EPUB'
  if (type === MEDIA_TYPE_CBZ || type.includes('comicbook') || type.includes('cbz')) return 'CBZ'
  if (type === MEDIA_TYPE_PDF || type.includes('pdf')) return 'PDF'
  // Fallback: the subtype, sans any "+suffix", upper-cased (e.g. "application/foo+bar" → "FOO").
  const subtype = type.split('/').pop() ?? type
  return (subtype.split('+')[0] ?? subtype).toUpperCase()
}

/** Format a minute count in the maket's compact reading-time form ("1h 12m", "2h", "45m"). */
export function formatDuration(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(mins / 60)
  const remainder = mins % 60
  if (hours > 0 && remainder > 0) return `${hours}h ${remainder}m`
  if (hours > 0) return `${hours}h`
  return `${remainder}m`
}

/**
 * Format the card's progress readout from structured numbers, in the maket's exact forms:
 *  - page-tracked → "page 88 / 192"
 *  - percent-tracked → "38% · 1h 12m left" (or "12% · just started" when there is no estimate yet)
 */
export function progressReadout(snapshot: ProgressSnapshot): string {
  const { position, totalPositions, totalProgression, minutesLeft } = snapshot
  if (position !== undefined && totalPositions !== undefined) {
    return `page ${position} / ${totalPositions}`
  }
  if (totalProgression !== undefined) {
    const percent = Math.round(totalProgression * 100)
    const phrase =
      minutesLeft !== undefined && minutesLeft > 0
        ? `${formatDuration(minutesLeft)} left`
        : 'just started'
    return `${percent}% · ${phrase}`
  }
  if (position !== undefined) return `page ${position}`
  return ''
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(1, value))
}

/** The 0..1 fraction a progress bar fills — percent-tracked or page-tracked. */
export function progressFraction(snapshot: ProgressSnapshot): number {
  if (snapshot.totalProgression !== undefined) return clamp01(snapshot.totalProgression)
  if (snapshot.position !== undefined && snapshot.totalPositions) {
    return clamp01(snapshot.position / snapshot.totalPositions)
  }
  return 0
}

/** Derive a display snapshot from a stored {@link Locator} (the sync engine's unit). Native reuses this. */
export function progressSnapshotFromLocator(locator: Locator): ProgressSnapshot {
  const snapshot: ProgressSnapshot = {}
  const { totalProgression, position, minutesLeft } = locator.locations ?? {}
  if (totalProgression !== undefined) snapshot.totalProgression = totalProgression
  if (position !== undefined) snapshot.position = position
  if (minutesLeft !== undefined) snapshot.minutesLeft = minutesLeft
  // Sync-record metadata rides on the locator's top level (not its positional `locations`).
  if (locator.lastReadAt !== undefined) snapshot.lastReadAt = locator.lastReadAt
  if (locator.lastReadDevice !== undefined) snapshot.lastReadDevice = locator.lastReadDevice
  return snapshot
}

/** Project a snapshot back onto {@link Locator} locations (the positional fields) — the inverse direction. */
export function locatorLocationsFromSnapshot(snapshot: ProgressSnapshot): LocatorLocations {
  const locations: LocatorLocations = {}
  if (snapshot.totalProgression !== undefined)
    locations.totalProgression = snapshot.totalProgression
  if (snapshot.position !== undefined) locations.position = snapshot.position
  if (snapshot.minutesLeft !== undefined) locations.minutesLeft = snapshot.minutesLeft
  return locations
}

// --- Book-detail view-model ------------------------------------------------
// The presentation metadata the Book detail screen (doc/web/02) renders, returned by
// `Connector.getBook` for a `(sourceId, bookId, mediaType)`. Platform-neutral and JSON-native: covers
// are an href REFERENCE (never embedded bytes); every field beyond `title`/`authors` is optional so
// sparse sources still render (a missing fact simply omits its pill). The native client re-expresses
// the identical shape — guarded by the serialization conformance tests. The chapters list itself is
// `Publication.toc` (populated by a FormatHandler, add-format-epub); `chapterCount` is the count a
// connector can know from catalog metadata before the book is opened.

export interface BookMeta {
  title: string
  authors: string[]
  /** Publication year, e.g. 1813. */
  year?: number
  /** Human-readable language label, e.g. "English". */
  language?: string
  pageCount?: number
  /** Genre/subject labels, e.g. ["Fiction", "Romance"]. */
  genres?: string[]
  description?: string
  /** Cover image REFERENCE (an href), never embedded bytes; absent ⇒ render the colour placeholder. */
  coverHref?: string
  /** Placeholder cover background colour (a CSS colour string) until a real cover is available. */
  coverColor?: string
  /** Browse-location breadcrumb segments, e.g. ["home server", "fiction", "austen"]. */
  breadcrumb?: string[]
  /** Chapter count known from catalog metadata; the TOC rows themselves arrive with a FormatHandler. */
  chapterCount?: number
}
