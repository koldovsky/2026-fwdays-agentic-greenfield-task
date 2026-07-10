// The OPFS write protocol shared by the main-thread cache and its dedicated Worker: the structural
// `FileSystem*Handle` subsets, the Worker↔main message types, the worker-side `OpfsSyncWriter`, and the
// reusable `createOpfsWriteHandler` pump. Extracted into this LEAF module so `opfs-book-cache.ts` (which
// spawns the Worker via `new Worker(new URL('./opfs-write-worker.ts', …))`) and `opfs-write-worker.ts`
// (which runs the handler) both import the protocol from here WITHOUT importing each other — breaking the
// 2-node import cycle (mirrors the `publication-source.ts` cycle-break). No DOM, no `fetch`: pure protocol.

// --- Minimal structural OPFS shapes ----------------------------------------------------------------
// Structural subsets of the real `FileSystem*Handle` APIs (so the production handles AND the test doubles
// both satisfy them, and we don't depend on a particular lib.dom revision exposing the sync-handle type).

/** The subset of `FileSystemSyncAccessHandle` the writer drives (synchronous, Worker-only). */
export interface OpfsWriteHandle {
  write(buffer: BufferSource, options: { at: number }): number
  truncate(newSize: number): void
  flush(): void
  close(): void
  getSize(): number
}

/** The subset of `FileSystemFileHandle` used: hot writes (Worker) + random-access reads (any thread). */
export interface OpfsFileHandle {
  createSyncAccessHandle(): Promise<OpfsWriteHandle>
  getFile(): Promise<File>
}

/** The subset of `FileSystemDirectoryHandle` (the OPFS root) used. */
export interface OpfsDirectory {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<OpfsFileHandle>
  removeEntry(name: string): Promise<void>
}

// --- Worker ↔ main protocol -------------------------------------------------------------------------

export type OpfsWriteRequest =
  | { kind: 'start'; fileName: string }
  | { kind: 'chunk'; buffer: ArrayBuffer; byteLength: number }
  | { kind: 'finish' }
  | { kind: 'abort' }

export type OpfsWriteResponse = { kind: 'done'; size: number } | { kind: 'error'; message: string }

/** A structural Worker double-friendly surface — the real `Worker` satisfies it; tests inject a fake. */
export interface OpfsWriteWorker {
  postMessage(message: OpfsWriteRequest, transfer?: Transferable[]): void
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<OpfsWriteResponse>) => void,
  ): void
  addEventListener(type: 'error', listener: (event: unknown) => void): void
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<OpfsWriteResponse>) => void,
  ): void
  removeEventListener(type: 'error', listener: (event: unknown) => void): void
  terminate(): void
}

// --- Worker-side write logic ------------------------------------------------------------------------

/**
 * Streams chunks into an OPFS file through a `FileSystemSyncAccessHandle`. Runs ONLY inside the dedicated
 * Worker (`createSyncAccessHandle()` throws on the main thread). Append-at-offset hot writes; the file is
 * truncated to 0 on open (restart-from-zero — partial-resume is a deferred design Open Question).
 */
export class OpfsSyncWriter {
  #handle: OpfsWriteHandle | null = null
  #offset = 0

  /** Open the sync access handle and reset the file to empty. */
  async open(fileHandle: OpfsFileHandle): Promise<void> {
    const handle = await fileHandle.createSyncAccessHandle()
    handle.truncate(0)
    this.#handle = handle
    this.#offset = 0
  }

  /** Append a chunk at the running offset (synchronous through the sync handle). */
  write(chunk: BufferSource): void {
    if (!this.#handle) throw new Error('OpfsSyncWriter: write before open')
    const written = this.#handle.write(chunk, { at: this.#offset })
    this.#offset += written
  }

  /** Flush, read back the final size, and close. Returns the bytes written. */
  finish(): number {
    if (!this.#handle) throw new Error('OpfsSyncWriter: finish before open')
    this.#handle.flush()
    const size = this.#handle.getSize()
    this.#handle.close()
    this.#handle = null
    return size
  }

  /** Abandon a partial write: truncate to 0 and close so no partial bytes survive. */
  abort(): void {
    if (!this.#handle) return
    try {
      this.#handle.truncate(0)
      this.#handle.flush()
    } finally {
      this.#handle.close()
      this.#handle = null
    }
  }
}

/**
 * The reusable Worker message handler (a serial async pump). The thin `opfs-write-worker.ts` shell wires
 * `self.onmessage` to this; keeping the logic here makes the protocol unit-testable without a real Worker.
 */
export function createOpfsWriteHandler(
  getDir: () => Promise<OpfsDirectory>,
  post: (response: OpfsWriteResponse) => void,
): (message: OpfsWriteRequest) => Promise<void> {
  const writer = new OpfsSyncWriter()
  return async (message: OpfsWriteRequest): Promise<void> => {
    switch (message.kind) {
      case 'start': {
        const dir = await getDir()
        const fileHandle = await dir.getFileHandle(message.fileName, { create: true })
        await writer.open(fileHandle)
        return
      }
      case 'chunk':
        writer.write(new Uint8Array(message.buffer, 0, message.byteLength))
        return
      case 'finish':
        post({ kind: 'done', size: writer.finish() })
        return
      case 'abort':
        writer.abort()
        return
    }
  }
}
