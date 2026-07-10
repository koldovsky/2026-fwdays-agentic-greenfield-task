// The web-bound `PublicationSource` constructors. The neutral `publicationSourceFromBytes` lives in
// `core/contracts`; these carry web types (`File`, `ReadableStream`) so they live in `platform/web`.
// Book bytes are read by RANGE and deliberately bypass the Service Worker (Workbox cannot cache a 206) —
// ADR-005: the read path is OPFS `File.slice`, never a `fetch` the SW can see.

import type { PublicationSource } from '@/core/contracts'
import { publicationSourceFromBytes } from '@/core/contracts'

/**
 * A {@link PublicationSource} over an OPFS/`File` blob: `read(offset, length)` is a ranged
 * `file.slice(...).arrayBuffer()`, so the archive's central directory + only the entries actually touched
 * are read — the 14 MB light-novel is never fully buffered (ADR-005). This is the OFFLINE read path: it
 * issues no `fetch`, so the Service Worker never sees a book-byte request.
 */
export function publicationSourceFromFile(file: File): PublicationSource {
  return {
    size: () => Promise.resolve(file.size),
    read: async (offset, length) =>
      new Uint8Array(await file.slice(offset, offset + length).arrayBuffer()),
  }
}

/** Drain a sequential byte stream into a single `Uint8Array` (a stream cannot be range-read). */
async function drainStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value && value.length) {
        chunks.push(value)
        total += value.length
      }
    }
  } finally {
    reader.releaseLock()
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

/**
 * A {@link PublicationSource} over a sequential connector stream. A stream cannot be range-read, so it is
 * drained fully into an in-memory source first (the drained byte length is authoritative — that is why no
 * `size` hint is needed). Identical bytes to the file/buffer paths, just wrapped differently.
 */
export async function publicationSourceFromStream(
  stream: ReadableStream<Uint8Array>,
): Promise<PublicationSource> {
  return publicationSourceFromBytes(await drainStream(stream))
}
