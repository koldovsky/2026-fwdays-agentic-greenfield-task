// Test-only fixture loaders for the two real EPUBs under test-epubs/. Not a spec file (no `.test.`
// segment) so Vitest never runs it as a suite; imported only by the colocated tests.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const PENSEES = 'blaise-pascal_pensees.epub'
export const EMINENCE = 'The Eminence in Shadow - Volume 01 [Yen Press][Kobo].epub'

export function fixtureBytes(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(process.cwd(), 'test-epubs', name)))
}

export function fixtureFile(name: string): File {
  // Copy into a fresh ArrayBuffer-backed view (what the File/Blob ctor's BlobPart type requires).
  return new File([new Uint8Array(fixtureBytes(name))], name, { type: 'application/epub+zip' })
}

/** A sequential byte stream over the fixture (chunked, to exercise the drain path). */
export function fixtureStream(name: string): ReadableStream<Uint8Array> {
  const bytes = fixtureBytes(name)
  const CHUNK = 64 * 1024
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += CHUNK) {
        controller.enqueue(bytes.subarray(offset, Math.min(offset + CHUNK, bytes.length)))
      }
      controller.close()
    },
  })
}
