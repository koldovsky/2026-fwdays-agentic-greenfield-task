// Interfaces only. The single contract surface for plugins. Everything async from day one
// (ADR-009) so the same plugin code runs in-process now and behind a sandbox proxy later.
// Platform-neutral: no DOM, no fetch — those live behind HostBridge, implemented per platform.

import type {
  BookMeta,
  BookRef,
  ByteRange,
  LibraryBrowseEntry,
  Locator,
  MediaType,
  Publication,
  ReadingPreferences,
} from '@/core/model'

// --- Host Bridge -----------------------------------------------------------

export interface HttpRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: Uint8Array | string
}

export interface HttpResponse {
  status: number
  headers: Record<string, string>
  bytes(): Promise<Uint8Array>
  text(): Promise<string>
}

/** Enforces declared network permissions; the host owns transport/CORS. */
export interface HttpClient {
  send(request: HttpRequest): Promise<HttpResponse>
}

/** Namespaced per plugin id by the host. */
export interface KeyValueStore {
  get(key: string): Promise<Uint8Array | undefined>
  set(key: string, value: Uint8Array): Promise<void>
  delete(key: string): Promise<void>
}

export interface Logger {
  debug(message: string): void
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

/** The only surface a plugin may touch. */
export interface HostBridge {
  http: HttpClient
  storage: KeyValueStore
  logger: Logger
}

// --- Plugins ---------------------------------------------------------------

/** Reads/writes a server-side Locator and declares what the server supports. */
export interface ProgressSyncStrategy {
  getProgress(ref: BookRef): Promise<Locator | undefined>
  setProgress(ref: BookRef, locator: Locator): Promise<void>
}

/** Adapts a content source (Komga REST, OPDS) to one internal interface. */
export interface Connector {
  readonly id: string
  readonly progressSync: boolean
  /** What this source actually supports — honestly declared (absent on the in-memory fixture). */
  readonly capabilities?: ConnectorCapabilities
  probe(): Promise<boolean>
  /** The catalog the Library renders. Returns the rich browse entry (a superset of `BookRef`). */
  browse(): Promise<LibraryBrowseEntry[]>
  /**
   * The Book-detail metadata ({@link BookMeta}) for a `(sourceId, bookId, mediaType)` — REST or
   * in-memory catalog metadata ONLY, never an EPUB parse (the real TOC arrives with a FormatHandler).
   * Required: every connector can return at minimum `{ title: ref.title, authors: [] }` — a connector
   * without rich catalog metadata returns a minimal BookMeta rather than leaving the method absent
   * (mirrors the `progressStrategy()` → `localOnlyStrategy` idiom for capability-gated features).
   * Rich connectors (Komga) return the full struct; sparse connectors (OPDS) return a minimal one.
   */
  getBook(ref: BookRef): Promise<BookMeta>
  /** Book bytes; an optional `range` reads a partial slice (offline/streaming). */
  content(ref: BookRef, range?: ByteRange): Promise<Uint8Array>
  /**
   * Authed cover-image bytes for a book, when the source serves covers behind auth (Komga's
   * `/thumbnail` needs the connector's Authorization header — a bare cross-origin `<img src>` would
   * 401 and trip the browser's native Basic-auth dialog). Platform-neutral: returns BYTES, never a
   * URL — the host turns them into a displayable object URL it owns and revokes. OPTIONAL: a connector
   * whose covers are public URLs leaves it absent, and the host loads {@link BookMeta.coverHref}
   * directly (or renders the colour placeholder when there is no cover at all).
   */
  coverBytes?(ref: BookRef): Promise<Uint8Array>
  /** A connector with progressSync=false returns a local-only / no-op strategy. */
  progressStrategy(): ProgressSyncStrategy
}

/** Cleanup handle returned by {@link Navigator.on}; calling it drops that one subscription. */
export type Unsubscribe = () => void

/**
 * A neutral, **random-access** byte source a {@link FormatHandler} opens (D4). A ZIP's central directory
 * is at the END of the archive, so the format reader needs `read(offset, length)`, not a forward stream.
 * An OPFS file and a fully-buffered `Uint8Array` are both `PublicationSource`s with ranged reads (ADR-005,
 * the 14 MB light-novel is never fully buffered); a sequential stream is drained into an in-memory source
 * first (it cannot be range-read). Carries no DOM/web type — the native client re-expresses the shape.
 */
export interface PublicationSource {
  size(): Promise<number>
  read(offset: number, length: number): Promise<Uint8Array>
}

/** What the dispatcher's sniffer hands a format to claim (DESIGN-CONNECTORS.md §7). Plain, neutral data. */
export interface SniffInput {
  mediaType?: string
  extension?: string
  headBytes?: Uint8Array
}

/**
 * What a {@link Navigator} needs beyond the parsed {@link Publication}: the byte source to render and the
 * optional reading preferences to apply on open. Neutral — the mount target is a factory parameter of the
 * platform-specific `createNavigator`, NEVER here, so this interface carries no DOM.
 */
export interface NavigatorOptions {
  source: PublicationSource
  preferences?: ReadingPreferences
}

/**
 * Opens a publication's bytes into a neutral {@link Publication}. The rich web-only surface (the navigator
 * factory + its platform mount type) lives on `platform/web`'s `WebFormatHandler`, NOT here — everything on
 * this neutral handler is conformance-testable by the future native client.
 */
export interface FormatHandler {
  readonly id: string
  readonly mediaTypes: readonly MediaType[]
  readonly capabilities: FormatCapabilities
  /** Confidence (0..1) this handler claims the sniffed input; 0 = not mine. */
  sniff(input: SniffInput): number
  /** Open a random-access byte source: ranged reads (ADR-005), no full-buffer footgun. */
  open(source: PublicationSource): Promise<Publication>
}

/**
 * Drives an imperative renderer over a parsed {@link Publication}. Every member here is DOM-free and
 * something the native reader needs the same semantics for — so this is the cross-platform conformance
 * target. The renderer owns pagination (only it knows where the next reflowable page boundary is), so
 * `next`/`prev`/`seek` are navigator methods, not reader-computed `goTo`s (D3). The platform-specific
 * navigator factory + its mount type, and the viewport-dependent `pageCount()`, live on `platform/web`'s
 * `WebNavigator` — they are the ONLY non-neutral members.
 */
export interface Navigator {
  goTo(locator: Locator): Promise<void>
  /** Turn to the next page/spread (the renderer paginates). */
  next(): Promise<void>
  /** Turn to the previous page/spread. */
  prev(): Promise<void>
  /** Seek to a total-progression fraction (0..1) — the position-bar scrubber. */
  seek(fraction: number): Promise<void>
  currentLocator(): Locator
  applyPreferences(preferences: ReadingPreferences): void
  /** Subscribe to the locator stream — fires on every relocate. */
  on(event: 'locatorChanged', callback: (locator: Locator) => void): Unsubscribe
  /** Subscribe to post-load faults (a settled open promise cannot reject; this carries later errors). */
  on(event: 'error', callback: (error: unknown) => void): Unsubscribe
  destroy(): void
}

/**
 * A neutral in-memory {@link PublicationSource} over a fully-buffered byte array (no web types) — the one
 * entry point full-buffer callers and tests use to feed {@link FormatHandler.open}. Reads are ranged
 * copies of the buffer; an OPFS-file or stream source lives in `platform/web` (it carries the web types).
 */
export function publicationSourceFromBytes(bytes: Uint8Array): PublicationSource {
  return {
    size: () => Promise.resolve(bytes.length),
    // `.slice()` returns a fresh, byteOffset-0 copy (NOT a `subarray` view): a zip reader builds
    // DataViews over `result.buffer` assuming the data starts at offset 0, so a view would be misread.
    read: (offset, length) => Promise.resolve(bytes.slice(offset, offset + length)),
  }
}

/** Lazy plugin loader (the Factory): a chunk is fetched via dynamic import() on first use. */
export type PluginLoader<T> = () => Promise<T>

// --- Plugin manifests, capabilities & registry contract --------------------
// Plain, serializable descriptors (no DOM/fetch) so the native client declares the identical shapes.
// See DESIGN-CONNECTORS.md §6 (manifest, registry/resolution) and §12 (versioning).

export type PluginKind = 'connector' | 'format'

/** Declared, host-enforced plugin permissions. `network` is the allowlist `HostBridge.http` enforces. */
export interface PluginPermissions {
  /** Allowed request origins; `'*'` (or an array containing `'*'`) allows any. Undeclared ⇒ deny-all. */
  network?: readonly string[] | '*'
  storageQuotaMB?: number
}

/** What a content source supports — declared honestly; the sync engine reads `progressSync`. */
export interface ConnectorCapabilities {
  protocols: ReadonlyArray<'opds1' | 'opds2' | 'komga-rest' | 'kavita-rest'>
  auth: ReadonlyArray<'none' | 'basic' | 'bearer' | 'apiKey' | 'oauth2'>
  /** The SERVER stores read progress (the read/write strategy is a separate, per-connector concern). */
  progressSync: boolean
  search: boolean
  download: boolean
  /** Per-page image streaming (e.g. Komga PSE) for comics/image-sequence books. */
  pagedStreaming: boolean
  thumbnails: boolean
}

/** What a format renderer handles — `mediaTypes` is what the registry resolves a sniff against. */
export interface FormatCapabilities {
  mediaTypes: readonly MediaType[]
  extensions?: readonly string[]
  layout?: 'reflowable' | 'fixed' | 'image-sequence' | 'mixed'
  search?: boolean
  tts?: boolean
  locatorScheme?: 'cfi' | 'page' | 'position' | 'href-progression'
}

/** Describes a plugin. Bundled plugins ship in the build; `source`/`integrity` are the remote future. */
export interface PluginManifest {
  id: string
  name: string
  version: string
  kind: PluginKind
  /** Semver RANGE of the host API this plugin targets, e.g. `^1.0.0`; gated against HOST_API_VERSION. */
  hostApi: string
  bundled: boolean
  /** Remote module URL (future, sandboxed); first-party plugins are bundled and omit it. */
  source?: string
  /** SRI hash for a remote module (future). */
  integrity?: string
  permissions?: PluginPermissions
  capabilities: ConnectorCapabilities | FormatCapabilities
  /** Shown in the install prompt. */
  approxSizeKB?: number
}

/**
 * The running host API version. Each manifest's `hostApi` range is checked against this; an
 * out-of-range plugin is refused with a clear message (DESIGN-CONNECTORS.md §12). Additive bridge changes bump
 * the minor; any removal/rename bumps the major. The Extensions screen surfaces it as the
 * "Host API v1.2" pill (doc/web/06); the dispatch/install flows (change 10) added the
 * capability-dispatch + event-bus surface, an additive minor bump from 1.0 → 1.2.
 */
export const HOST_API_VERSION = '1.2.0'

/**
 * Three-state resolution of a probe/sniff to a plugin (DESIGN-CONNECTORS.md §6.2) — exactly what the add-source
 * and capability-missing flows branch on. `installable` is a normal outcome, never an error.
 */
export type Resolution<T> =
  | { status: 'ready'; instance: T }
  | { status: 'installable'; suggestion: PluginManifest }
  | { status: 'unsupported' }
