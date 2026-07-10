// Shared foliate-book loader for the EPUB handler. ONE place builds the initialised foliate `EPUB`
// (with its zip-backed resource loaders) so both byte pipelines use the same loader:
//  - `index.ts` `open()` — headless parse into a neutral `Publication` (then destroys the book);
//  - the reader-frame harness (`src/platform/web/reader-frame/harness.ts`) — passes the pre-built book
//    to `view.open(book)` so the RENDER path reads through THIS loader's zip reader.
//
// SECURITY MODEL (ADR-013, supersedes ADR-012): there is NO per-document CSP/sanitisation here. Book
// content is no longer rendered on the app origin — the reader frame runs on a SEPARATE origin that
// physically cannot reach the app's `edda.creds.*`, so the in-app parse-and-strip that ADR-012 attempted
// (and that repeatedly leaked) is both unnecessary and was never sufficient. Spine documents load via
// foliate's standard path.
//
// BYTE SOURCE (ADR-005): the loader reads through a neutral `core/contracts.PublicationSource` (random
// access: `size()` + ranged `read(offset, length)`), adapted to the zip reader below. A `File`-backed
// source reads only the ranges it needs — the 14 MB light-novel is never fully buffered.

import type { EPUB } from 'foliate-js/epub.js'
import type { PublicationSource } from '@/core/contracts'

/** zip.js's default read chunk (`config.chunkSize`); it sets `reader.chunkSize` after `init()`. */
const DEFAULT_CHUNK_SIZE = 65536

/** zip.js stamps the entry's byte range onto `reader.readable` before draining it (see {@link readable}). */
interface ReaderRange {
  offset?: number
  size?: number
}

/**
 * Adapts a neutral {@link PublicationSource} to the duck-typed reader `vendor/zip.js`'s `ZipReader`
 * consumes (see `foliate-js.d.ts` `ZipReaderSource`). The pinned vendored build exports NO `Reader` base
 * class, so this implements its shape directly (verified against SHA 78914aef):
 *  - `init()` sets `size` BEFORE `getEntries` walks the central directory at the END of the archive;
 *  - `readUint8Array(index, length)` delegates to the source's ranged `read`;
 *  - `readable` is the chunked streaming getter `getData` drains to read ONE entry's compressed bytes —
 *    the base `Reader` provides it; without it `getData` does `Object.assign(reader.readable, …)` on
 *    `undefined` and throws. Each read is bounded to `chunkSize`, so an OPFS/`File` source is read by
 *    range (ADR-005) — the 14 MB light-novel is never fully materialised in a single read.
 */
class PublicationSourceReader {
  size = 0
  /** zip.js skips `init()` when this is truthy; it sets it after the first call. */
  initialized = false
  /** Set by zip.js after `init()` (`reader.chunkSize = max(config.chunkSize, 64)`). */
  chunkSize?: number

  constructor(private readonly source: PublicationSource) {}

  async init(): Promise<void> {
    if (this.initialized) return
    this.size = await this.source.size()
    this.initialized = true
  }

  readUint8Array(index: number, length: number): Promise<Uint8Array> {
    return this.source.read(index, length)
  }

  get readable(): ReadableStream<Uint8Array> {
    // Arrow `pull` keeps lexical `this` = this reader; the per-stream cursor is a closure (fresh per
    // `readable` access). zip.js `Object.assign`s `{ offset, size }` onto the returned stream, so the
    // range is read back off `stream` itself.
    let chunkOffset = 0
    const stream = new ReadableStream<Uint8Array>({
      pull: async (controller) => {
        const range = stream as unknown as ReaderRange
        const chunkSize = this.chunkSize ?? DEFAULT_CHUNK_SIZE
        const offset = range.offset ?? 0
        const size = range.size ?? 0
        const length = Math.min(chunkSize, size - chunkOffset)
        const chunk = await this.readUint8Array(offset + chunkOffset, length)
        controller.enqueue(chunk)
        if (chunkOffset + chunkSize > size) controller.close()
        else chunkOffset += chunkSize
      },
    })
    return stream
  }
}

/**
 * Open the vendored foliate EPUB engine over a {@link PublicationSource} and return the initialised book.
 * Lazy-imports the engine + its zip reader (both stay code-split). `loadText`/`loadBlob` read each
 * resource straight from the archive — no interception — and `getSize` reports each entry's uncompressed
 * size.
 */
export async function openFoliateBook(source: PublicationSource): Promise<EPUB> {
  const [{ EPUB }, zip] = await Promise.all([
    import('foliate-js/epub.js'),
    import('foliate-js/vendor/zip.js'),
  ])
  const { configure, ZipReader, TextWriter, BlobWriter } = zip
  configure({ useWebWorkers: false })

  const reader = new ZipReader(new PublicationSourceReader(source))
  const entries = await reader.getEntries()
  const byName = new Map(entries.map((entry) => [entry.filename, entry]))

  const loadText = async (name: string): Promise<string | null> => {
    const entry = byName.get(name)
    if (!entry) return null
    return (await entry.getData(new TextWriter())) as string
  }
  const loadBlob = (name: string, type?: string): Promise<Blob> | null => {
    const entry = byName.get(name)
    return entry ? (entry.getData(new BlobWriter(type)) as Promise<Blob>) : null
  }
  const getSize = (name: string): number => byName.get(name)?.uncompressedSize ?? 0

  return new EPUB({ loadText, loadBlob, getSize }).init()
}
