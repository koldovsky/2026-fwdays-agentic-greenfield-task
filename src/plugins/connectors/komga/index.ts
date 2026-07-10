// Komga v1 connector — primary content source (ADR-007). Talks Komga's native REST (richer than
// OPDS: paging, search, PSE, thumbnails) and COMPOSES `_opds-core` for OPDS/Readium mapping (no
// inheritance — DESIGN-CONNECTORS.md §10). Loaded lazily via dynamic import(). It touches the host ONLY through
// the HostBridge (`bridge.http` enforces declared network permissions; never `fetch` directly), so
// the same code runs on the native client over a native transport. Plugins are async (ADR-009).

import type {
  Connector,
  ConnectorCapabilities,
  HostBridge,
  HttpClient,
  HttpResponse,
  ProgressSyncStrategy,
} from '@/core/contracts'
import type { ConnectorProbeResult } from '@/core/dispatch'
import type {
  BookMeta,
  BookRef,
  ByteRange,
  LibraryBrowseEntry,
  Locator,
  LocatorLocations,
  MediaType,
} from '@/core/model'
import { MEDIA_TYPE_EPUB } from '@/core/model'
import { resolveAcquisitionLink } from '@/plugins/connectors/_opds-core'

export const KOMGA_CONNECTOR_ID = 'connector.komga'
const KOMGA_SOURCE_LABEL = 'komga'
const KOMGA_KIND = 'komga'

/** Detection specificity: Komga also speaks OPDS, so it must outrank the generic OPDS connector when
 *  both claim a URL — the server prober breaks confidence ties toward the higher specificity. */
export const KOMGA_PROBE_SPECIFICITY = 2

/** Honest capability declaration: Komga serves OPDS v2 feeds AND its richer native REST API, so it
 *  advertises both protocols (the "Add a source" card derives "opds v2 + rest" and the "OPDS v2" chip
 *  from this). The SERVER supports progress sync; the read/write strategy is delivered by
 *  progress-sync-strategy (change 9) — this connector performs no progress I/O. */
export const KOMGA_CAPABILITIES: ConnectorCapabilities = {
  protocols: ['opds2', 'komga-rest'],
  auth: ['basic'],
  progressSync: true,
  search: true,
  download: true,
  pagedStreaming: true,
  thumbnails: true,
}

/** Connection settings. Credentials are the least-privilege reader account (DESIGN-CONNECTORS.md §10 / ADR-007). */
export interface KomgaConfig {
  baseUrl: string
  email: string
  password: string
  /** Source id stamped onto browse entries / book refs; defaults to the connector id. */
  sourceId?: string
}

/** A page of results plus its paging information (mirrors Komga's Spring page, domain-shaped). */
export interface Page<T> {
  items: T[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  last: boolean
}

/** A browseable shelf (Komga library or series), mapped to a lightweight domain shape. */
export interface Shelf {
  id: string
  title: string
  booksCount?: number
}

/** Authentication failed (Komga `401`/`403`) — surfaced clearly to the add-source flow. */
export class KomgaAuthError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
  ) {
    super(`Komga authentication failed (${status}) for ${path}. Check the reader credentials.`)
    this.name = 'KomgaAuthError'
  }
}

/** A non-auth Komga request failure (any other non-2xx). */
export class KomgaRequestError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
  ) {
    super(`Komga request to ${path} failed with status ${status}.`)
    this.name = 'KomgaRequestError'
  }
}

// --- Minimal Komga REST shapes (only the fields this connector reads) ------

interface KomgaAuthor {
  name: string
  role?: string
}
interface KomgaBookMetadata {
  title: string
  authors?: KomgaAuthor[]
  /** Blurb shown on the detail screen. */
  summary?: string
  /** Edition release date, e.g. "2021-09-08" — the detail screen shows its year. */
  releaseDate?: string
  /** Subject/genre tags → detail metadata pills. */
  tags?: string[]
}
interface KomgaMedia {
  status: string
  mediaType: MediaType
  pagesCount?: number
}
interface KomgaBook {
  id: string
  name: string
  created: string
  seriesId?: string
  libraryId?: string
  media: KomgaMedia
  metadata: KomgaBookMetadata
}
interface KomgaLibrary {
  id: string
  name: string
}
interface KomgaSeries {
  id: string
  name?: string
  metadata: { title: string }
  booksCount?: number
}
interface KomgaUser {
  id: string
  email: string
  roles: string[]
}
interface KomgaSpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  last: boolean
}
/** Komga's Readium WebPub manifest — only the OPDS/Readium links `_opds-core` resolves over. */
interface ReadiumManifest {
  links?: { href: string; rel?: string | readonly string[]; type?: MediaType }[]
}

function base64(input: string): string {
  // btoa is a global in browsers, jsdom, and Node>=16; reader credentials are ASCII.
  return btoa(input)
}

function bookRef(book: KomgaBook, sourceId: string): BookRef {
  return {
    sourceId,
    bookId: book.id,
    mediaType: book.media.mediaType,
    title: book.metadata.title || book.name,
  }
}

function preferredAuthor(metadata: KomgaBookMetadata): string | undefined {
  const writer = metadata.authors?.find((author) => author.role === 'writer')
  return (writer ?? metadata.authors?.[0])?.name
}

/** "2021-09-08" → 2021; absent/empty/non-numeric → undefined (so the detail screen omits the year pill). */
function parseReleaseYear(releaseDate?: string): number | undefined {
  if (!releaseDate) return undefined
  const year = Number.parseInt(releaseDate.slice(0, 4), 10)
  return Number.isFinite(year) && year > 0 ? year : undefined
}

function toPage<S, T>(page: KomgaSpringPage<S>, map: (item: S) => T): Page<T> {
  return {
    items: page.content.map(map),
    pageNumber: page.number,
    pageSize: page.size,
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    last: page.last,
  }
}

function rangeHeader(range: ByteRange): string {
  return `bytes=${range.start}-${range.end ?? ''}`
}

/** Komga's native per-book read-progress (only the fields the strategy maps). */
interface KomgaReadProgress {
  /** 1-based last-read page. */
  page?: number
  completed?: boolean
  /** ISO-8601 of the last write — mapped to the Locator's `lastReadAt`. */
  lastModified?: string
}
interface KomgaBookProgressDto {
  media?: { pagesCount?: number }
  /** Absent / null until the reader has started the book. */
  readProgress?: KomgaReadProgress | null
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(1, value))
}

/** Map Komga's native read-progress → a platform-neutral `Locator` (totalProgression is monotonic). */
function readProgressToLocator(
  ref: BookRef,
  progress: KomgaReadProgress,
  pagesCount: number | undefined,
): Locator {
  const locations: LocatorLocations = {}
  if (progress.completed) {
    locations.totalProgression = 1
  } else if (progress.page !== undefined && pagesCount) {
    // Komga page is 1-based; the fraction read is (page / pagesCount).
    locations.totalProgression = clamp01(progress.page / pagesCount)
  }
  if (progress.page !== undefined) locations.position = progress.page
  const locator: Locator = { href: ref.bookId, type: ref.mediaType, title: ref.title, locations }
  if (progress.lastModified) locator.lastReadAt = progress.lastModified
  return locator
}

// --- Komga Readium R2 progression (the locator-based EPUB progress API) -----------------------------
//
// Komga stores reflowable-EPUB progress NOT via the page-based /read-progress PATCH — it rejects every
// non-`completed:true` write for a non-Divina EPUB with HTTP 400, so a mid-book EPUB page can't persist —
// but via the Readium R2 progression endpoint GET/PUT /api/v1/books/{id}/progression, where the position
// carries a real `totalProgression`. So a MID-BOOK EPUB position round-trips and Komga becomes a true
// cross-device source of truth (verified against gotson/komga:1.24.4).
//
// CRUCIAL: Komga validates a PUT against the EPUB's PRECOMPUTED positions list (`GET …/positions`). An
// arbitrary `(href, progression)` is rejected — first `Resource does not exist in book` (href must be a
// bare reading-order resource path, e.g. `index_split_012.html`), then `Invalid progression` (the
// `progression`/`position`/`totalProgression` must match a real entry). So a write SNAPS the reader's
// total-progression to the nearest positions-list entry and PUTs that entry verbatim (`koboSpan` and all).

interface R2Location {
  fragments?: string[]
  position?: number
  progression?: number
  totalProgression?: number
}
interface R2Locator {
  href: string
  type: string
  title?: string
  locations?: R2Location
  /** Komga's Kobo-style span id on a position entry — carried verbatim so a re-PUT round-trips exactly. */
  koboSpan?: string
}
interface R2Progression {
  device: { id: string; name: string }
  locator: R2Locator
  /** ISO-8601 timestamp of the write. */
  modified: string
}

/** Komga's precomputed EPUB positions list (`GET …/positions`); a progression PUT must submit one of
 *  these exact entries. Positions are ordered ascending by `totalProgression`. */
interface KomgaPositions {
  total: number
  positions: R2Locator[]
}

/** Identifies THIS Edda install to Komga's progression API. The `device` field is metadata Komga records
 *  alongside the position; a stable constant suffices (Komga stores progression per (book, user), not per
 *  device) and keeps the connector free of host/storage state. */
const EDDA_DEVICE = { id: 'edda-web', name: 'Edda (Web)' } as const

/** Komga's Readium endpoints (`/progression`, `/positions`) serve `application/vnd.readium.*+json` and
 *  reply **406** to `Accept: application/json` — so R2 requests must accept any media type. */
const READIUM_ACCEPT = '*/*'

/** Map a Komga R2 progression → a neutral `Locator` (CFI ← the first `epubcfi(...)` fragment). */
function r2ToLocator(ref: BookRef, progression: R2Progression): Locator {
  const src = progression.locator.locations ?? {}
  const locations: LocatorLocations = {}
  if (typeof src.totalProgression === 'number')
    locations.totalProgression = clamp01(src.totalProgression)
  if (typeof src.progression === 'number') locations.progression = clamp01(src.progression)
  if (typeof src.position === 'number') locations.position = src.position
  // Only treat an `epubcfi(...)` fragment as a CFI — never mislabel some other fragment kind.
  const cfi = src.fragments?.find((fragment) => fragment.startsWith('epubcfi('))
  if (cfi) locations.cfi = cfi
  const locator: Locator = {
    href: progression.locator.href || ref.bookId,
    type: progression.locator.type || ref.mediaType,
    title: progression.locator.title ?? ref.title,
    locations,
  }
  if (progression.modified) locator.lastReadAt = progression.modified
  if (progression.device?.name) locator.lastReadDevice = progression.device.name
  return locator
}

/** Snap a reader total-progression to the positions-list entry at or just before it (the furthest entry
 *  not beyond where the reader is) — the locator Komga will accept. Positions ascend by `totalProgression`;
 *  returns the first (start) entry when the target precedes it, or `undefined` for an empty list. */
function nearestPosition(positions: R2Locator[], target: number): R2Locator | undefined {
  let best: R2Locator | undefined
  for (const position of positions) {
    if ((position.locations?.totalProgression ?? 0) <= target) best = position
    else break // ascending: the first entry beyond target ends the scan
  }
  return best ?? positions[0]
}

/**
 * Komga read-progress strategy (progress-sync-strategy, change 9). The SERVER-SPECIFIC half of the sync
 * protocol: it maps Komga's progress ↔ a neutral `Locator`. The platform-neutral engine (`core/sync`)
 * decides WHEN to call this and applies furthest-wins; this only reads/writes one server. It reaches the
 * host only through the injected {@link HttpClient}, never `fetch`, so the same code runs on native.
 *
 * Progress uses one of two Komga APIs by media type:
 *  - **EPUB** → the Readium R2 progression endpoint (`GET/PUT …/progression`), a locator-based API that
 *    persists a mid-book total-progression (so an EPUB position round-trips). A write snaps the reader's
 *    position to Komga's precomputed positions list, which it validates against (see {@link nearestPosition}).
 *  - **everything else (comics/CBZ via PSE)** → the page-based `…/read-progress` PATCH, where a `{page}`
 *    write is valid; a defensive 400 falls back to a `{completed}`-only write.
 */
export class KomgaProgressStrategy implements ProgressSyncStrategy {
  /** Per-book cache of Komga's positions list (static per book; avoids refetching on each drain). */
  readonly #positionsCache = new Map<string, R2Locator[]>()

  constructor(
    private readonly base: string,
    private readonly authHeader: () => Record<string, string>,
    private readonly http: HttpClient,
  ) {}

  async getProgress(ref: BookRef): Promise<Locator | undefined> {
    return ref.mediaType === MEDIA_TYPE_EPUB ? this.#getR2Progress(ref) : this.#getPageProgress(ref)
  }

  async setProgress(ref: BookRef, locator: Locator): Promise<void> {
    return ref.mediaType === MEDIA_TYPE_EPUB
      ? this.#putR2Progress(ref, locator)
      : this.#setPageProgress(ref, locator)
  }

  // --- EPUB: Readium R2 progression (locator-based; persists a mid-book position) ---

  async #getR2Progress(ref: BookRef): Promise<Locator | undefined> {
    const path = `/api/v1/books/${encodeURIComponent(ref.bookId)}/progression`
    const response = await this.http.send({
      url: `${this.base}${path}`,
      method: 'GET',
      headers: { Accept: READIUM_ACCEPT, ...this.authHeader() },
    })
    if (response.status === 401 || response.status === 403) {
      throw new KomgaAuthError(path, response.status)
    }
    // 204 / 404 / any non-200 → the book has no server position yet (tolerated, not an error: the local
    // cache is the primary resume source and the outbox push is a separate call).
    if (response.status !== 200) return undefined
    const text = await response.text()
    if (!text) return undefined
    const progression = JSON.parse(text) as R2Progression
    if (!progression?.locator) return undefined
    return r2ToLocator(ref, progression)
  }

  async #putR2Progress(ref: BookRef, locator: Locator): Promise<void> {
    const target = locator.locations?.totalProgression ?? 0
    // Komga validates a progression PUT against its precomputed positions list, so snap the reader's
    // total-progression to the nearest real entry and submit THAT verbatim (an arbitrary locator → 400).
    const match = nearestPosition(await this.#positions(ref.bookId), target >= 1 ? 1 : target)
    if (!match) {
      // No positions list (e.g. an EPUB Komga has not analysed) — fall back to the page-based completed
      // flag so at least "finished" syncs; a mid-book position stays local (the local cache resumes it).
      return this.#setPageProgress(ref, locator)
    }
    const path = `/api/v1/books/${encodeURIComponent(ref.bookId)}/progression`
    const body: R2Progression = {
      device: { ...EDDA_DEVICE },
      modified: locator.lastReadAt ?? new Date().toISOString(),
      locator: match,
    }
    const response = await this.http.send({
      url: `${this.base}${path}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: READIUM_ACCEPT,
        ...this.authHeader(),
      },
      body: JSON.stringify(body),
    })
    this.#assertOk(response, path)
  }

  /** Komga's precomputed positions list for an EPUB, cached per book (it is static, and a PUT may run
   *  repeatedly as the outbox drains). Empty when the book has no positions (non-EPUB / not analysed). */
  async #positions(bookId: string): Promise<R2Locator[]> {
    const cached = this.#positionsCache.get(bookId)
    if (cached) return cached
    const path = `/api/v1/books/${encodeURIComponent(bookId)}/positions`
    const response = await this.http.send({
      url: `${this.base}${path}`,
      method: 'GET',
      headers: { Accept: READIUM_ACCEPT, ...this.authHeader() },
    })
    if (response.status !== 200) return []
    const text = await response.text()
    if (!text) return []
    const positions = (JSON.parse(text) as KomgaPositions).positions ?? []
    this.#positionsCache.set(bookId, positions)
    return positions
  }

  // --- Comics/CBZ (and any non-EPUB): page-based read-progress ---

  async #getPageProgress(ref: BookRef): Promise<Locator | undefined> {
    const path = `/api/v1/books/${encodeURIComponent(ref.bookId)}`
    const response = await this.http.send({
      url: `${this.base}${path}`,
      method: 'GET',
      headers: { Accept: 'application/json', ...this.authHeader() },
    })
    this.#assertOk(response, path)
    const dto = JSON.parse(await response.text()) as KomgaBookProgressDto
    const progress = dto.readProgress
    if (!progress) return undefined // not started → no remote position
    return readProgressToLocator(ref, progress, dto.media?.pagesCount)
  }

  async #setPageProgress(ref: BookRef, locator: Locator): Promise<void> {
    const path = `/api/v1/books/${encodeURIComponent(ref.bookId)}/read-progress`
    const url = `${this.base}${path}`
    const page = locator.locations?.position
    const completed = (locator.locations?.totalProgression ?? 0) >= 1
    // Page-based first (richest); fall back to completed-only on a 400.
    const first = await this.#patch(url, page !== undefined ? { page, completed } : { completed })
    if (first.status === 400 && page !== undefined) {
      this.#assertOk(await this.#patch(url, { completed }), path)
      return
    }
    this.#assertOk(first, path)
  }

  #patch(url: string, body: Record<string, unknown>): Promise<HttpResponse> {
    return this.http.send({
      url,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.authHeader(),
      },
      body: JSON.stringify(body),
    })
  }

  #assertOk(response: HttpResponse, path: string): void {
    if (response.status === 401 || response.status === 403) {
      throw new KomgaAuthError(path, response.status)
    }
    if (response.status >= 400) throw new KomgaRequestError(path, response.status)
  }
}

/**
 * Identify a Komga server at an ARBITRARY url (the "Add a source" detection path — no configured
 * connector yet). Hits Komga's public, unauthenticated `/api/v1/claim`, which returns `{isClaimed}`.
 * Lets a transport failure REJECT (so the prober can distinguish unreachable from unsupported) and
 * returns `null` only when the server responded but is not Komga-shaped (bad status or body). Pure
 * detection over the HostBridge — no auth, no DOM.
 */
export async function komgaProbe(
  url: string,
  host: HostBridge,
): Promise<ConnectorProbeResult | null> {
  const base = url.replace(/\/+$/, '')
  const response = await host.http.send({
    url: `${base}/api/v1/claim`,
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (response.status !== 200) return null
  try {
    const body = JSON.parse(await response.text()) as { isClaimed?: unknown }
    if (typeof body.isClaimed !== 'boolean') return null
  } catch {
    return null // reached the server, but the body is not Komga's claim shape
  }
  return {
    connectorId: KOMGA_CONNECTOR_ID,
    kind: KOMGA_KIND,
    confidence: 1,
    specificity: KOMGA_PROBE_SPECIFICITY,
    capabilities: KOMGA_CAPABILITIES,
  }
}

export class KomgaConnector implements Connector {
  readonly id = KOMGA_CONNECTOR_ID
  readonly progressSync = true
  readonly capabilities = KOMGA_CAPABILITIES

  readonly #base: string
  readonly #sourceId: string

  constructor(
    private readonly config: KomgaConfig,
    private readonly bridge: HostBridge,
  ) {
    this.#base = config.baseUrl.replace(/\/+$/, '')
    this.#sourceId = config.sourceId ?? KOMGA_CONNECTOR_ID
  }

  /** Identify a Komga server from its public, unauthenticated claim endpoint shape. Delegates to the
   *  shared {@link komgaProbe} so the configured-connector check and the add-source detection path
   *  stay in lockstep. Network failure → `false` (this method is a boolean predicate, not the prober). */
  async probe(): Promise<boolean> {
    try {
      return (await komgaProbe(this.#base, this.bridge)) !== null
    } catch {
      return false
    }
  }

  /** Verify the configured credentials; maps `401`/`403` to {@link KomgaAuthError}. */
  async verifyAuth(): Promise<KomgaUser> {
    return this.#json<KomgaUser>('/api/v2/users/me')
  }

  /** The flat catalogue the Library renders: every book mapped to a browse entry (paged internally). */
  async browse(): Promise<LibraryBrowseEntry[]> {
    const entries: LibraryBrowseEntry[] = []
    let page = 0
    // Guard so a misbehaving server can never spin forever; 200/page covers large libraries quickly.
    for (let guard = 0; guard < 1000; guard++) {
      const result = await this.#json<KomgaSpringPage<KomgaBook>>(
        `/api/v1/books?size=200&page=${page}`,
      )
      for (const book of result.content) entries.push(this.#toEntry(book))
      if (result.last || result.content.length === 0) break
      page += 1
    }
    return entries
  }

  /**
   * Book-detail metadata mapped from Komga's `GET /api/v1/books/{id}` (DESIGN-CONNECTORS.md §5.1). Catalog
   * metadata ONLY: no read-progress call (change 9) and no series/library breadcrumb calls (change 9
   * enrichment, so `breadcrumb` is omitted here). The chapters list arrives with add-format-epub, so
   * `chapterCount` is omitted too. Komga's book metadata carries no language field, so that pill is
   * simply absent — the detail screen omits pills for facts a source does not provide.
   */
  async getBook(ref: BookRef): Promise<BookMeta> {
    const book = await this.#json<KomgaBook>(`/api/v1/books/${ref.bookId}`)
    return this.#toBookMeta(book)
  }

  /** Top-level shelves. */
  async listLibraries(): Promise<KomgaLibrary[]> {
    return this.#json<KomgaLibrary[]>('/api/v1/libraries')
  }

  /** Series within a library (or all), paged. */
  async listSeries(
    options: { libraryId?: string; page?: number; size?: number } = {},
  ): Promise<Page<Shelf>> {
    const params = this.#paging(options)
    if (options.libraryId) params.set('library_id', options.libraryId)
    const result = await this.#json<KomgaSpringPage<KomgaSeries>>(`/api/v1/series?${params}`)
    return toPage(result, (series) => ({
      id: series.id,
      title: series.metadata.title,
      ...(series.booksCount !== undefined ? { booksCount: series.booksCount } : {}),
    }))
  }

  /** Books within a series (or all), paged, as domain book refs. */
  async listBooks(
    options: { seriesId?: string; page?: number; size?: number } = {},
  ): Promise<Page<BookRef>> {
    const params = this.#paging(options)
    const path = options.seriesId
      ? `/api/v1/series/${options.seriesId}/books?${params}`
      : `/api/v1/books?${params}`
    const result = await this.#json<KomgaSpringPage<KomgaBook>>(path)
    return toPage(result, (book) => bookRef(book, this.#sourceId))
  }

  /** Search books by term (matches Komga title metadata), paged, as domain book refs. */
  async search(
    term: string,
    options: { page?: number; size?: number } = {},
  ): Promise<Page<BookRef>> {
    const params = this.#paging(options)
    params.set('search', term)
    const result = await this.#json<KomgaSpringPage<KomgaBook>>(`/api/v1/books?${params}`)
    return toPage(result, (book) => bookRef(book, this.#sourceId))
  }

  /** A book's cover thumbnail image bytes (authed). */
  async thumbnail(bookId: string): Promise<Uint8Array> {
    const { bytes } = await this.#bytes(`/api/v1/books/${bookId}/thumbnail`)
    return bytes
  }

  /**
   * Authed cover-image bytes ({@link Connector.coverBytes}) for the book-detail cover. Delegates to
   * {@link thumbnail}: the host renders these as an object URL it owns, so the cover never loads as a
   * bare cross-origin `<img>` that would 401 and pop the browser's native Basic-auth dialog.
   */
  async coverBytes(ref: BookRef): Promise<Uint8Array> {
    return this.thumbnail(ref.bookId)
  }

  /** Book bytes; an optional `range` reads just that slice (see {@link download}). */
  async content(ref: BookRef, range?: ByteRange): Promise<Uint8Array> {
    return this.download(ref.bookId, range)
  }

  /**
   * Download a book file; the whole file by default, or a `range` slice. The `Range` header lets a
   * 206-capable server return just the slice; Komga's `/file` currently ignores it and returns the
   * full body (200), so we honour the requested slice client-side — a consistent range read either
   * way. (Durable OPFS-backed range reads via `File.slice` are offline-storage, change 9.)
   */
  async download(bookId: string, range?: ByteRange): Promise<Uint8Array> {
    const headers: Record<string, string> = {}
    if (range) headers['Range'] = rangeHeader(range)
    const { bytes, response } = await this.#bytes(`/api/v1/books/${bookId}/file`, { headers })
    if (range && response.status !== 206) {
      const end = range.end !== undefined ? range.end + 1 : bytes.length
      return bytes.slice(range.start, end)
    }
    return bytes
  }

  /** Stream a single page image via Komga PSE — for paged/image-sequence books (comics). */
  async page(bookId: string, pageNumber: number): Promise<Uint8Array> {
    const { bytes } = await this.#bytes(`/api/v1/books/${bookId}/pages/${pageNumber}`)
    return bytes
  }

  /**
   * Resolve a book's download href from its Readium WebPub manifest, COMPOSING `_opds-core`'s
   * acquisition-link resolution (DESIGN-CONNECTORS.md §10 — composition, not inheritance). Falls back to the
   * native REST file endpoint when the manifest exposes no acquisition link.
   *
   * Komga serves the manifest as `application/webpub+json`, so this request advertises that media type
   * — a plain `Accept: application/json` is answered with **406 Not Acceptable**, which would throw
   * before the `/file` fallback could run.
   */
  async resolveDownloadHref(
    bookId: string,
    type: MediaType = 'application/epub+zip',
  ): Promise<string> {
    const manifest = await this.#json<ReadiumManifest>(`/api/v1/books/${bookId}/manifest`, {
      headers: { Accept: 'application/webpub+json' },
    })
    const link = resolveAcquisitionLink(manifest.links ?? [], { type })
    return link?.href ?? `${this.#base}/api/v1/books/${bookId}/file`
  }

  /**
   * The Komga read-progress strategy, wired to this connector's base URL + reader auth over the
   * HostBridge's HTTP client. The sync engine (`core/sync`) injects it as its Strategy context.
   */
  progressStrategy(): KomgaProgressStrategy {
    return new KomgaProgressStrategy(this.#base, () => this.#authHeader(), this.bridge.http)
  }

  /**
   * A neutral, authenticated request descriptor for STREAMING the book file to OPFS. The HostBridge HTTP
   * client is buffered (no `ReadableStream`), so the streaming download runs in `platform/web` (the only
   * layer that may touch `fetch`) over this descriptor — keeping URL construction + auth (the server
   * specifics) here, in the connector. Book bytes bypass the Service Worker either way (ADR-005).
   *
   * `allowedOrigins` is the connector's own base origin: the reader credentials in `headers` are scoped to
   * THIS Komga server, so the download path must refuse to send them anywhere else. `resolveDownloadHref`
   * returns the manifest acquisition href VERBATIM (server-controlled), so this gate is what stops a
   * malicious manifest from laundering the `Authorization` header to a cross-origin URL.
   */
  async downloadDescriptor(
    ref: BookRef,
  ): Promise<{ url: string; headers: Record<string, string>; allowedOrigins: readonly string[] }> {
    const url = await this.resolveDownloadHref(ref.bookId, ref.mediaType)
    return { url, headers: this.#authHeader(), allowedOrigins: [new URL(this.#base).origin] }
  }

  /** Clear a book's server read-progress (mark unread). Used by the integration tests to stay idempotent. */
  async deleteReadProgress(bookId: string): Promise<void> {
    const path = `/api/v1/books/${encodeURIComponent(bookId)}/read-progress`
    const response = await this.bridge.http.send({
      url: `${this.#base}${path}`,
      method: 'DELETE',
      headers: this.#authHeader(),
    })
    // 404 ⇒ already clear; anything else 4xx/5xx is a real failure.
    if (response.status >= 400 && response.status !== 404) {
      this.#throwForStatus(response, path)
    }
  }

  // --- internals -----------------------------------------------------------

  #toEntry(book: KomgaBook): LibraryBrowseEntry {
    const entry: LibraryBrowseEntry = {
      sourceId: this.#sourceId,
      bookId: book.id,
      mediaType: book.media.mediaType,
      title: book.metadata.title || book.name,
      thumbnailHref: `${this.#base}/api/v1/books/${book.id}/thumbnail`,
      sourceLabel: KOMGA_SOURCE_LABEL,
      addedAt: book.created,
    }
    const author = preferredAuthor(book.metadata)
    if (author) entry.author = author
    return entry
  }

  #toBookMeta(book: KomgaBook): BookMeta {
    const meta: BookMeta = {
      title: book.metadata.title || book.name,
      authors: (book.metadata.authors ?? []).map((author) => author.name),
      coverHref: `${this.#base}/api/v1/books/${book.id}/thumbnail`,
    }
    const year = parseReleaseYear(book.metadata.releaseDate)
    if (year !== undefined) meta.year = year
    if (book.media.pagesCount !== undefined) meta.pageCount = book.media.pagesCount
    const genres = book.metadata.tags ?? []
    if (genres.length > 0) meta.genres = genres
    if (book.metadata.summary) meta.description = book.metadata.summary
    return meta
  }

  #authHeader(): Record<string, string> {
    return { Authorization: `Basic ${base64(`${this.config.email}:${this.config.password}`)}` }
  }

  #paging(options: { page?: number; size?: number }): URLSearchParams {
    const params = new URLSearchParams()
    params.set('page', String(options.page ?? 0))
    params.set('size', String(options.size ?? 50))
    return params
  }

  #send(
    path: string,
    options: { auth?: boolean; headers?: Record<string, string> } = {},
  ): Promise<HttpResponse> {
    const auth = options.auth ?? true
    return this.bridge.http.send({
      url: `${this.#base}${path}`,
      method: 'GET',
      headers: { ...(auth ? this.#authHeader() : {}), ...options.headers },
    })
  }

  async #json<T>(path: string, options: { headers?: Record<string, string> } = {}): Promise<T> {
    const response = await this.#send(path, {
      headers: { Accept: 'application/json', ...options.headers },
    })
    this.#throwForStatus(response, path)
    return JSON.parse(await response.text()) as T
  }

  async #bytes(
    path: string,
    options: { headers?: Record<string, string> } = {},
  ): Promise<{ bytes: Uint8Array; response: HttpResponse }> {
    const response = await this.#send(path, options)
    this.#throwForStatus(response, path)
    return { bytes: await response.bytes(), response }
  }

  #throwForStatus(response: HttpResponse, path: string): void {
    if (response.status === 401 || response.status === 403) {
      throw new KomgaAuthError(path, response.status)
    }
    if (response.status >= 400) {
      throw new KomgaRequestError(path, response.status)
    }
  }
}

/** Factory the registry/add-source flow uses to build a configured Komga connector over a bridge. */
export function createKomgaConnector(config: KomgaConfig, bridge: HostBridge): KomgaConnector {
  return new KomgaConnector(config, bridge)
}

export default KomgaConnector
