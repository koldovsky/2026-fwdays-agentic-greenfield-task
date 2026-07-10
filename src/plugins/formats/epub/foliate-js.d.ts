// Ambient types for the vendored foliate-js engine (vendor/foliate-js, pinned submodule — ADR-002).
// foliate-js ships untyped ESM with no npm release; these declarations type ONLY the surface this
// plugin reaches via the `foliate-js` Vite alias (see vite.config.ts) so the dynamic imports stay
// type-checked without an `any` escape hatch. Shapes confirmed against the pinned SHA's epub.js /
// epubcfi.js / view.js. The structures foliate emits for metadata/TOC are intentionally loose
// (string | language-map | contributor objects) and are normalised defensively in to-publication.ts.

declare module 'foliate-js/vendor/zip.js' {
  /** zip.js entry — a single file inside the archive (read lazily, by range, from the Blob). */
  export interface ZipEntry {
    filename: string
    uncompressedSize?: number
    getData(writer: unknown): Promise<unknown>
  }
  export interface ZipReaderLike {
    getEntries(): Promise<ZipEntry[]>
    close?(): Promise<void>
  }
  /**
   * The duck-typed reader `ZipReader` consumes: `getEntries()` first `await`s `init()` (if present), then
   * reads `size` and pulls ranges via `readUint8Array(index, length)`. The pinned vendored build does NOT
   * export the `Reader` base class — confirmed against SHA 78914aef in `vendor/foliate-js/vendor/zip.js`
   * (exports: BlobReader/BlobWriter/TextWriter/ZipReader/configure) — so a custom reader (e.g. the EPUB
   * plugin's `PublicationSourceReader`) implements THIS shape directly rather than `extends zip.Reader`.
   * `size` MUST be set by the time `init()` resolves (before `getEntries` walks the central directory).
   */
  export interface ZipReaderSource {
    size: number
    init?(): void | Promise<void>
    readUint8Array(index: number, length: number): Uint8Array | Promise<Uint8Array>
    /** A fresh stream per access; `getData` stamps `{ offset, size }` on it, then drains it to read one
     *  entry's compressed bytes. The vendored `Reader` base provides this; a custom reader must too. */
    readonly readable: ReadableStream<Uint8Array>
  }
  export function configure(options: { useWebWorkers?: boolean }): void
  export class ZipReader {
    constructor(reader: ZipReaderSource)
    getEntries(): Promise<ZipEntry[]>
    close(): Promise<void>
  }
  /** Reads ranges out of a Blob/File (this is what makes OPFS-file reads ranged, not buffered). */
  export class BlobReader implements ZipReaderSource {
    constructor(blob: Blob)
    size: number
    readUint8Array(index: number, length: number): Promise<Uint8Array>
  }
  export class TextWriter {
    constructor(encoding?: string)
  }
  export class BlobWriter {
    constructor(type?: string)
  }
}

declare module 'foliate-js/epub.js' {
  /** The per-file accessors foliate's EPUB parser reads through (supplied by a zip/directory loader). */
  export interface EpubLoader {
    loadText(name: string): Promise<string | null> | string | null
    loadBlob(name: string, type?: string): Promise<Blob | null> | Blob | null
    getSize(name: string): number
    sha1?: (str: string) => Promise<Uint8Array>
  }

  /** A spine section. `id` is the resource href; `cfi` is the spine-level CFI prefix for this item. */
  export interface EpubSection {
    id: string
    cfi?: string
    linear?: string
    pageSpread?: string
    size?: number
    createDocument(): Promise<Document>
    load(): Promise<string>
    unload(): void
    resolveHref(href: string): string
  }

  export interface EpubTocItem {
    label?: string
    href?: string | null
    subitems?: EpubTocItem[] | null
  }

  /** Loosely typed: foliate emits title as `string | { [lang]: string }`, authors as
   *  `string | {name} | Array<…>`, language as `string | string[]`. Normalised downstream. */
  export interface EpubMetadata {
    title?: unknown
    author?: unknown
    creator?: unknown
    language?: unknown
    identifier?: unknown
    publisher?: unknown
    [key: string]: unknown
  }

  export class EPUB {
    constructor(loader: EpubLoader)
    init(): Promise<this>
    metadata: EpubMetadata
    sections: EpubSection[]
    toc?: EpubTocItem[] | null
    pageList?: EpubTocItem[] | null
    landmarks?: EpubTocItem[] | null
    dir?: string
    rendition?: { layout?: string }
    resolveCFI(cfi: string): { index: number; anchor: (doc: Document) => Range | Node | number }
    resolveHref(
      href: string,
    ): { index: number; anchor: (doc: Document) => Range | Node | number } | null
    getCover(): Promise<Blob | null>
    destroy(): void
  }
}

declare module 'foliate-js/epubcfi.js' {
  /** Parsed CFI — an array of step-parts, optionally split into a range (`parent`/start/end). */
  export type CfiParts = unknown
  export const isCFI: RegExp
  export function parse(cfi: string): CfiParts
  /** Build an in-document CFI string from a DOM Range (no spine prefix). */
  export function fromRange(range: Range, filter?: (node: Node) => number): string
  /** Resolve parsed CFI parts to a DOM Range within `doc`. */
  export function toRange(doc: Document, parts: CfiParts, filter?: (node: Node) => number): Range
  /** Join a spine-level CFI prefix with an in-document CFI via the `!` indirection step. */
  export function joinIndir(...cfis: string[]): string
  export function collapse(parts: CfiParts, toEnd?: boolean): CfiParts
  export function toElement(doc: Document, parts: CfiParts): Node | null
  export function fromElements(elements: Element[]): string[]
  /** Synthesize / read a spine-index CFI when no package document is available. */
  export const fake: {
    fromIndex(index: number): string
    toIndex(parts: CfiParts): number
  }
}

declare module 'foliate-js/view.js' {
  import type { EPUB } from 'foliate-js/epub.js'

  /** The location object foliate emits on `relocate` and exposes as `view.lastLocation`. */
  export interface FoliateLocation {
    cfi?: string
    /** The spine item this position is in: `section.current` is the spine index. */
    section?: { current?: number; total?: number }
    /** Total progression across the publication (0..1). */
    fraction?: number
    range?: Range
    tocItem?: { label?: string; href?: string } | null
    pageItem?: unknown
    location?: { current?: number; next?: number; total?: number }
  }

  /** The paginator/fxl renderer element foliate creates inside the View's shadow root. */
  export interface FoliateRenderer {
    setStyles?(css: string): void
    setAttribute(name: string, value: string): void
    next(): Promise<void>
    prev(): Promise<void>
    destroy?(): void
  }

  export class View extends HTMLElement {
    open(book: EPUB | File | Blob | string): Promise<void>
    init(opts: { lastLocation?: unknown; showTextStart?: boolean }): Promise<void>
    goTo(target: string | number): Promise<{ index: number } | undefined>
    goToFraction(fraction: number): Promise<void>
    /** Turn forward/back one page (the renderer paginates); `distance` defaults to one page. */
    next(distance?: number): Promise<void>
    prev(distance?: number): Promise<void>
    getCFI(index: number, range?: Range): string
    close(): void
    book: EPUB
    renderer: FoliateRenderer
    lastLocation?: FoliateLocation
  }

  export function makeBook(file: File | Blob | string): Promise<EPUB>
  export class ResponseError extends Error {}
  export class NotFoundError extends Error {}
  export class UnsupportedTypeError extends Error {}
}
