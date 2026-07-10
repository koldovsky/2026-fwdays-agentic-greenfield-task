// OPFS byte cache for downloaded books (offline-storage). Bytes are STREAMED into an OPFS file as they
// arrive — never the whole book buffered in memory — and read back by RANGE via `File.slice`. The shared
// write protocol (`OpfsSyncWriter`, `createOpfsWriteHandler`, the structural handles + message types) lives
// in `./opfs-write-protocol` so this module and the dedicated Worker both import it without importing each
// other (no cycle). Two halves, split by the spec's hard constraint that `createSyncAccessHandle()` is
// valid ONLY off the main thread:
//   - `OpfsSyncWriter` (protocol) — the worker-side hot-write logic over a `FileSystemSyncAccessHandle`.
//   - `OpfsBookCache`  — the main-thread API: spins up a dedicated Worker for the write, pumps the stream
//                        to it chunk-by-chunk (transferring each buffer, so memory stays flat), and serves
//                        reads via `File.slice` on any thread.
// Book bytes bypass the Service Worker (ADR-005): the read path issues NO `fetch`, so the SW never sees a
// `206`. The Worker constructor and the OPFS root are INJECTABLE so tests (jsdom has neither Worker nor
// `FileSystemSyncAccessHandle`) can mock the protocol against an in-memory OPFS double.

import type { PublicationSource } from '@/core/contracts'
import { publicationSourceFromFile } from './publication-source'
import type { OpfsDirectory, OpfsWriteResponse, OpfsWriteWorker } from './opfs-write-protocol'

// Re-export the shared write protocol so existing importers (tests, the `platform/web` barrel) keep
// resolving the OPFS write surface from this module even though it now lives in `./opfs-write-protocol`.
export {
  OpfsSyncWriter,
  createOpfsWriteHandler,
  type OpfsWriteHandle,
  type OpfsFileHandle,
  type OpfsDirectory,
  type OpfsWriteRequest,
  type OpfsWriteResponse,
  type OpfsWriteWorker,
} from './opfs-write-protocol'

// --- Main-thread cache -------------------------------------------------------------------------------

export interface OpfsBookCacheOptions {
  /** The OPFS root provider; defaults to `navigator.storage.getDirectory()`. Injected in tests. */
  getDir?: () => Promise<OpfsDirectory>
  /** The write-Worker factory; defaults to the module-Worker. Injected in tests (jsdom has no Worker). */
  createWorker?: () => OpfsWriteWorker
}

function defaultGetDir(): Promise<OpfsDirectory> {
  return navigator.storage.getDirectory() as unknown as Promise<OpfsDirectory>
}

function defaultCreateWorker(): OpfsWriteWorker {
  return new Worker(new URL('./opfs-write-worker.ts', import.meta.url), {
    type: 'module',
  }) as unknown as OpfsWriteWorker
}

/**
 * Main-thread OPFS book cache. Writes go through a dedicated Worker (the only place a sync access handle is
 * valid); reads are `File.slice` ranges on this thread. The byte read path never calls `fetch`, so the
 * Service Worker is bypassed entirely (ADR-005).
 */
export class OpfsBookCache {
  readonly #getDir: () => Promise<OpfsDirectory>
  readonly #createWorker: () => OpfsWriteWorker

  constructor(options: OpfsBookCacheOptions = {}) {
    this.#getDir = options.getDir ?? defaultGetDir
    this.#createWorker = options.createWorker ?? defaultCreateWorker
  }

  /**
   * Stream a download into the OPFS file `opfsKey`, returning the bytes written. The book is NEVER fully
   * buffered: each chunk is copied into its own transferable buffer and handed to the Worker, which writes
   * it through the sync handle. On any failure (stream error or Worker write error) the partial file is
   * removed so it is never served as a complete book.
   */
  async downloadToOpfs(opfsKey: string, stream: ReadableStream<Uint8Array>): Promise<number> {
    const worker = this.#createWorker()
    let workerError: Error | null = null

    const onMessage = (event: MessageEvent<OpfsWriteResponse>): void => {
      if (event.data.kind === 'error') workerError = new Error(event.data.message)
    }
    const done = new Promise<number>((resolve, reject) => {
      const settle = (event: MessageEvent<OpfsWriteResponse>): void => {
        if (event.data.kind === 'done') resolve(event.data.size)
        else if (event.data.kind === 'error') reject(new Error(event.data.message))
      }
      worker.addEventListener('message', settle)
      worker.addEventListener('error', () => reject(new Error('OPFS write worker crashed')))
    })
    // Surface mid-stream worker errors to the pump loop promptly without an unhandled rejection.
    worker.addEventListener('message', onMessage)
    done.catch(() => {})

    try {
      worker.postMessage({ kind: 'start', fileName: opfsKey })
      const reader = stream.getReader()
      try {
        for (;;) {
          if (workerError) throw workerError
          const { done: streamDone, value } = await reader.read()
          if (streamDone) break
          if (value && value.byteLength > 0) {
            // Detach-safe copy: one chunk at a time, transferred to the Worker (flat memory).
            const copy = value.slice()
            worker.postMessage(
              { kind: 'chunk', buffer: copy.buffer, byteLength: copy.byteLength },
              [copy.buffer],
            )
          }
        }
      } finally {
        reader.releaseLock()
      }
      worker.postMessage({ kind: 'finish' })
      return await done
    } catch (error) {
      try {
        worker.postMessage({ kind: 'abort' })
      } catch {
        // worker already gone — the removeOpfs below still cleans the partial file.
      }
      await this.removeOpfs(opfsKey)
      throw error
    } finally {
      worker.removeEventListener('message', onMessage)
      worker.terminate()
    }
  }

  /** The downloaded book's `File`, or `null` if it is not in OPFS. Pure OPFS — no `fetch` (ADR-005). */
  async getOpfsFile(opfsKey: string): Promise<File | null> {
    try {
      const dir = await this.#getDir()
      const fileHandle = await dir.getFileHandle(opfsKey)
      return await fileHandle.getFile()
    } catch {
      return null // NotFoundError (or no OPFS) → not cached
    }
  }

  /**
   * A ranged {@link PublicationSource} over the downloaded book, or `null` when it is not offline. This is
   * the OFFLINE OPEN path the reader uses instead of `connector.content()` — every resource resolves from
   * OPFS via `File.slice`, so a downloaded book reads with no network (AC: read fully offline).
   */
  async publicationSourceFromOpfs(opfsKey: string): Promise<PublicationSource | null> {
    const file = await this.getOpfsFile(opfsKey)
    return file ? publicationSourceFromFile(file) : null
  }

  /** Free a downloaded book's OPFS bytes. Idempotent — a missing file is not an error. */
  async removeOpfs(opfsKey: string): Promise<void> {
    try {
      const dir = await this.#getDir()
      await dir.removeEntry(opfsKey)
    } catch {
      // already gone (or no OPFS) — nothing to free.
    }
  }
}
