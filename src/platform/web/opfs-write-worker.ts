/// <reference lib="webworker" />
// Dedicated Worker that owns the OPFS `FileSystemSyncAccessHandle` for a book download. `createSyncAccessHandle()`
// is valid ONLY off the main thread (ADR-005 / design), so the hot append-writes happen here; the main-thread
// `OpfsBookCache` only pumps stream chunks in and reads back via `File.slice`. The write LOGIC lives in
// `createOpfsWriteHandler` (unit-tested without a real Worker); this shell just serializes messages onto it.
// It imports the protocol from `./opfs-write-protocol` (NOT `./opfs-book-cache`) so there is no import cycle
// with the cache module that spawns this Worker.

import {
  createOpfsWriteHandler,
  type OpfsDirectory,
  type OpfsWriteRequest,
  type OpfsWriteResponse,
} from './opfs-write-protocol'

const ctx = self as unknown as DedicatedWorkerGlobalScope

const getDir = (): Promise<OpfsDirectory> =>
  navigator.storage.getDirectory() as unknown as Promise<OpfsDirectory>

const post = (response: OpfsWriteResponse): void => ctx.postMessage(response)

const handle = createOpfsWriteHandler(getDir, post)

// Serialize: each message awaits the previous, so `start` fully opens the handle before any `chunk` writes.
let queue: Promise<void> = Promise.resolve()

ctx.onmessage = (event: MessageEvent<OpfsWriteRequest>): void => {
  queue = queue
    .then(() => handle(event.data))
    .catch((error: unknown) => {
      post({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
    })
}
