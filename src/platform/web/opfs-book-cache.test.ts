// OPFS byte cache. jsdom has neither `Worker` nor `FileSystemSyncAccessHandle`, so we drive the cache
// against an in-memory OPFS double and a fake Worker that runs the REAL `createOpfsWriteHandler` over it.
// Proves: a streamed download lands the exact bytes in OPFS; a range read returns the requested slice via
// `File.slice`; the sync-access-handle write runs in the WORKER, never on the main thread; the read path
// issues NO `fetch` (book bytes bypass the SW, ADR-005); and an interrupted download leaves no servable file.

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  OpfsBookCache,
  OpfsSyncWriter,
  createOpfsWriteHandler,
  type OpfsDirectory,
  type OpfsFileHandle,
  type OpfsWriteHandle,
  type OpfsWriteRequest,
  type OpfsWriteResponse,
  type OpfsWriteWorker,
} from './opfs-book-cache'

// --- In-memory OPFS double --------------------------------------------------------------------------

/** True only while the fake Worker is handling a message — the guard that proves worker-only sync writes. */
let insideWorker = false

class FakeFile {
  bytes = new Uint8Array(0)
}

function makeSyncHandle(file: FakeFile): OpfsWriteHandle {
  let length = file.bytes.length
  return {
    write(buffer, options) {
      const chunk =
        buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as ArrayBufferLike)
      const end = options.at + chunk.byteLength
      if (end > file.bytes.length) {
        const grown = new Uint8Array(end)
        grown.set(file.bytes.subarray(0, length))
        file.bytes = grown
      }
      file.bytes.set(chunk, options.at)
      length = Math.max(length, end)
      return chunk.byteLength
    },
    truncate(newSize) {
      const next = new Uint8Array(newSize)
      next.set(file.bytes.subarray(0, Math.min(newSize, length)))
      file.bytes = next
      length = newSize
    },
    flush() {},
    close() {},
    getSize() {
      return length
    },
  }
}

interface FakeDir extends OpfsDirectory {
  files: Map<string, FakeFile>
  createSyncAccessHandle: ReturnType<typeof vi.fn>
}

function makeFakeDir(): FakeDir {
  const files = new Map<string, FakeFile>()
  const createSyncAccessHandle = vi.fn((file: FakeFile): Promise<OpfsWriteHandle> => {
    // The whole point of the design: a sync access handle is opened ONLY inside the Worker.
    if (!insideWorker) throw new Error('createSyncAccessHandle called on the main thread')
    return Promise.resolve(makeSyncHandle(file))
  })
  return {
    files,
    createSyncAccessHandle,
    async getFileHandle(name, options): Promise<OpfsFileHandle> {
      let file = files.get(name)
      if (!file) {
        if (!options?.create) throw new DOMException('not found', 'NotFoundError')
        file = new FakeFile()
        files.set(name, file)
      }
      const target = file
      return {
        createSyncAccessHandle: () => createSyncAccessHandle(target),
        getFile: () =>
          Promise.resolve(
            new File([target.bytes.slice(0, target.bytes.length)], name, {
              type: 'application/octet-stream',
            }),
          ),
      }
    },
    async removeEntry(name): Promise<void> {
      if (!files.delete(name)) throw new DOMException('not found', 'NotFoundError')
    },
  }
}

/** A fake Worker that runs the REAL write handler against `dir`, serializing messages like the real shell. */
function makeFakeWorker(dir: OpfsDirectory): OpfsWriteWorker {
  const listeners = new Set<(event: MessageEvent<OpfsWriteResponse>) => void>()
  const emit = (response: OpfsWriteResponse): void => {
    const event = { data: response } as MessageEvent<OpfsWriteResponse>
    for (const listener of listeners) listener(event)
  }
  const handle = createOpfsWriteHandler(
    () => Promise.resolve(dir),
    (response) => emit(response),
  )
  let queue: Promise<void> = Promise.resolve()
  return {
    postMessage(message: OpfsWriteRequest) {
      queue = queue
        .then(async () => {
          insideWorker = true
          try {
            await handle(message)
          } finally {
            insideWorker = false
          }
        })
        .catch((error: unknown) => {
          emit({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
        })
    },
    addEventListener(type: 'message' | 'error', listener: (event: never) => void) {
      if (type === 'message')
        listeners.add(listener as (e: MessageEvent<OpfsWriteResponse>) => void)
    },
    removeEventListener(type: 'message' | 'error', listener: (event: never) => void) {
      if (type === 'message')
        listeners.delete(listener as (e: MessageEvent<OpfsWriteResponse>) => void)
    },
    terminate() {},
  } as OpfsWriteWorker
}

function streamOf(bytes: Uint8Array, chunkSize = 7): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        controller.enqueue(bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)))
      }
      controller.close()
    },
  })
}

const KEY = 'book_komga__book-1__epub.bin'
const PAYLOAD = new Uint8Array(Array.from({ length: 100 }, (_, i) => i % 256))

afterEach(() => {
  insideWorker = false
  vi.restoreAllMocks()
})

describe('OpfsBookCache — streamed download', () => {
  it('streams the download into OPFS and reads the exact bytes back', async () => {
    const dir = makeFakeDir()
    const cache = new OpfsBookCache({
      getDir: () => Promise.resolve(dir),
      createWorker: () => makeFakeWorker(dir),
    })

    const size = await cache.downloadToOpfs(KEY, streamOf(PAYLOAD))
    expect(size).toBe(PAYLOAD.length)

    const file = await cache.getOpfsFile(KEY)
    expect(file).not.toBeNull()
    const readBack = new Uint8Array(await file!.arrayBuffer())
    expect(readBack).toEqual(PAYLOAD)
  })

  it('runs the sync-access-handle write in the Worker, not on the main thread', async () => {
    const dir = makeFakeDir()
    const cache = new OpfsBookCache({
      getDir: () => Promise.resolve(dir),
      createWorker: () => makeFakeWorker(dir),
    })

    await cache.downloadToOpfs(KEY, streamOf(PAYLOAD))

    // The sync handle was created exactly once, and the guard in the double would have thrown had the
    // cache opened it on the main thread — so the hot write provably happened inside the Worker.
    expect(dir.createSyncAccessHandle).toHaveBeenCalledTimes(1)
  })

  it('serves a byte-range read from OPFS via File.slice without reading the whole file', async () => {
    const dir = makeFakeDir()
    const cache = new OpfsBookCache({
      getDir: () => Promise.resolve(dir),
      createWorker: () => makeFakeWorker(dir),
    })
    await cache.downloadToOpfs(KEY, streamOf(PAYLOAD))

    const source = await cache.publicationSourceFromOpfs(KEY)
    expect(source).not.toBeNull()
    expect(await source!.size()).toBe(PAYLOAD.length)

    const slice = await source!.read(10, 16) // [10, 26)
    expect(slice).toEqual(PAYLOAD.subarray(10, 26))
    expect(slice.byteLength).toBe(16)
  })

  it('serves the offline read path with NO fetch (book bytes bypass the SW — ADR-005)', async () => {
    const dir = makeFakeDir()
    const cache = new OpfsBookCache({
      getDir: () => Promise.resolve(dir),
      createWorker: () => makeFakeWorker(dir),
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await cache.downloadToOpfs(KEY, streamOf(PAYLOAD))
    const source = await cache.publicationSourceFromOpfs(KEY)
    await source!.read(0, 32)

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns null for a book that is not cached', async () => {
    const dir = makeFakeDir()
    const cache = new OpfsBookCache({
      getDir: () => Promise.resolve(dir),
      createWorker: () => makeFakeWorker(dir),
    })
    expect(await cache.getOpfsFile('missing.bin')).toBeNull()
    expect(await cache.publicationSourceFromOpfs('missing.bin')).toBeNull()
  })

  it('cleans up the partial file when the download stream errors (not served as complete)', async () => {
    const dir = makeFakeDir()
    const cache = new OpfsBookCache({
      getDir: () => Promise.resolve(dir),
      createWorker: () => makeFakeWorker(dir),
    })

    const failing = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(PAYLOAD.subarray(0, 20))
      },
      pull() {
        throw new Error('network dropped')
      },
    })

    await expect(cache.downloadToOpfs(KEY, failing)).rejects.toThrow('network dropped')
    // The partial bytes were removed → not servable as a full book.
    expect(await cache.getOpfsFile(KEY)).toBeNull()
    expect(dir.files.has(KEY)).toBe(false)
  })

  it('removeOpfs frees the bytes and is idempotent', async () => {
    const dir = makeFakeDir()
    const cache = new OpfsBookCache({
      getDir: () => Promise.resolve(dir),
      createWorker: () => makeFakeWorker(dir),
    })
    await cache.downloadToOpfs(KEY, streamOf(PAYLOAD))

    await cache.removeOpfs(KEY)
    expect(await cache.getOpfsFile(KEY)).toBeNull()
    await expect(cache.removeOpfs(KEY)).resolves.toBeUndefined() // idempotent
  })
})

describe('OpfsSyncWriter (worker-side)', () => {
  it('truncates to zero on open, appends at the running offset, and reports the final size', async () => {
    insideWorker = true
    const file = new FakeFile()
    file.bytes = new Uint8Array([9, 9, 9]) // stale bytes from a prior partial
    const dir = makeFakeDir()
    dir.files.set(KEY, file)
    const fileHandle = await dir.getFileHandle(KEY)

    const writer = new OpfsSyncWriter()
    await writer.open(fileHandle)
    writer.write(new Uint8Array([1, 2, 3]))
    writer.write(new Uint8Array([4, 5]))
    const size = writer.finish()

    expect(size).toBe(5)
    expect(file.bytes.subarray(0, 5)).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
  })

  it('abort truncates the partial write to zero', async () => {
    insideWorker = true
    const file = new FakeFile()
    const dir = makeFakeDir()
    dir.files.set(KEY, file)
    const writer = new OpfsSyncWriter()
    await writer.open(await dir.getFileHandle(KEY))
    writer.write(new Uint8Array([1, 2, 3, 4]))
    writer.abort()
    expect(file.bytes.length).toBe(0)
  })
})
