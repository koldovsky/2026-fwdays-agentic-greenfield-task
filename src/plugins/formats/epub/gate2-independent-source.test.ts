// Gate-2 INDEPENDENT verifier: open(source) parity + ranged reads + transfer-buffer detachability.
// Written by the checker — completely independent from the maker's bytes-source.test.ts and
// navigator-proxy.test.ts.  Uses DIFFERENT spy strategies and fixture paths from the maker.
//
// (b) open(source) returns the same Publication shape as the old parse(bytes) did — for BOTH fixtures.
// (c) publicationSourceFromBytes.read spy: the 14 MB light-novel is NEVER materialised in one read().
//     The maker tested via publicationSourceFromFile (Blob.slice spy + wrapper spy). HERE we spy on
//     the bytes source directly to prove the ranged-read contract holds on the OTHER code path too.
// (d) The transfer buffer pattern (new ArrayBuffer + set) produces a fresh, detachable copy that
//     does not alias the source Uint8Array's memory.

import { describe, expect, it } from 'vitest'
import type { Publication } from '@/core/model'
import type { PublicationSource } from '@/core/contracts'
import { publicationSourceFromBytes } from '@/core/contracts'
import { EpubFormatHandler } from './index'
import { EMINENCE, PENSEES, fixtureBytes, fixtureFile } from './test-fixtures'
import { publicationSourceFromFile } from '@/platform/web'

// --- (b) open(source) returns the same Publication shape as parse(bytes) did -----------------

/** Structural summary of a Publication — the shape an independent verifier checks. */
function pubShape(pub: Publication) {
  return {
    title: pub.metadata.title,
    authorDefined: pub.metadata.author !== undefined,
    languageDefined: pub.metadata.language !== undefined,
    readingOrderLength: pub.readingOrder.length,
    tocLength: (pub.tableOfContents ?? []).length,
    firstHref: pub.readingOrder[0]?.href,
    firstType: pub.readingOrder[0]?.type,
  }
}

describe('(b) open(source) Publication shape — both fixtures', () => {
  it('Pensées: open(publicationSourceFromBytes) returns the expected Publication fields', async () => {
    const bytes = fixtureBytes(PENSEES)
    const pub = await new EpubFormatHandler().open(publicationSourceFromBytes(bytes))

    expect(pub.metadata.title).toBe('Pensées')
    expect(pub.metadata.author).toMatch(/pascal/i)
    expect(pub.readingOrder.length).toBeGreaterThan(0)
    // Every readingOrder entry must have an href and a type
    for (const entry of pub.readingOrder) {
      expect(typeof entry.href).toBe('string')
      expect(entry.href.length).toBeGreaterThan(0)
      expect(typeof entry.type).toBe('string')
    }
  })

  it('Eminence: open(publicationSourceFromBytes) returns expected Publication fields', async () => {
    const bytes = fixtureBytes(EMINENCE)
    const pub = await new EpubFormatHandler().open(publicationSourceFromBytes(bytes))

    expect(pub.metadata.title).toBe('The Eminence in Shadow, Vol. 1')
    expect(pub.readingOrder.length).toBeGreaterThanOrEqual(20)
    expect((pub.tableOfContents ?? []).length).toBeGreaterThan(0)
  })

  it('open(bytes source) and open(file source) produce the same Publication shape', async () => {
    // Two different source builders must produce structurally identical results.
    const bytesSource = publicationSourceFromBytes(fixtureBytes(PENSEES))
    const fileSource = publicationSourceFromFile(fixtureFile(PENSEES))

    const [fromBytes, fromFile] = await Promise.all([
      new EpubFormatHandler().open(bytesSource),
      new EpubFormatHandler().open(fileSource),
    ])

    // Structural shape must be identical regardless of source
    expect(pubShape(fromBytes)).toEqual(pubShape(fromFile))
    // And the readingOrder entries must match
    expect(fromBytes.readingOrder).toEqual(fromFile.readingOrder)
  })
})

// --- (c) Ranged reads: 14 MB fixture never materialised in one read() -------------------------
// The maker used publicationSourceFromFile with a Blob.prototype.slice spy (web-IO path).
// Here: spy on the read() of a publicationSourceFromBytes (in-memory path) to independently
// confirm that the book-loader drives only ranged reads even through the bytes-backed source.

describe('(c) ranged reads on the bytes-backed source (independent read spy)', () => {
  it('the 14 MB EMINENCE fixture: no single read() call covers the whole file', async () => {
    const raw = fixtureBytes(EMINENCE)
    const fixtureSize = raw.length
    expect(fixtureSize).toBeGreaterThan(10 * 1024 * 1024) // sanity: fixture really is >10 MB

    // Wrap publicationSourceFromBytes with our OWN spy — completely independent of any maker spy.
    const base = publicationSourceFromBytes(raw)
    let callCount = 0
    let maxSingleRead = 0
    let totalBytesRequested = 0
    const spiedSource: PublicationSource = {
      size: () => base.size(),
      read: async (offset, length) => {
        callCount += 1
        maxSingleRead = Math.max(maxSingleRead, length)
        totalBytesRequested += length
        return base.read(offset, length)
      },
    }

    const pub = await new EpubFormatHandler().open(spiedSource)
    expect(pub.metadata.title).toBe('The Eminence in Shadow, Vol. 1')

    // Must have made at least one ranged read
    expect(callCount).toBeGreaterThan(0)
    // ADR-005: no single read must materialise the entire archive
    expect(maxSingleRead).toBeLessThan(fixtureSize)
    // The parse footprint (total bytes requested across all reads) is well under the full file
    expect(totalBytesRequested).toBeLessThan(fixtureSize)

    // Log for evidence (not an assertion — informational)
    // console.info(`EMINENCE parse: ${callCount} reads, max=${maxSingleRead}, total=${totalBytesRequested}, fileSize=${fixtureSize}`)
  })
})

// --- (d) Transfer-buffer detachability: the proxy copies, never aliases, the source memory ----
// `sourceToTransferBuffer` (navigator-proxy.ts) does:
//   const bytes = await source.read(0, size)          // from PublicationSource
//   const transferable = new ArrayBuffer(bytes.byteLength)
//   new Uint8Array(transferable).set(bytes)
//   return transferable                                // posted with transfer: [transferable]
//
// We verify the invariant INDEPENDENTLY:
//  1. `publicationSourceFromBytes.read(0, n)` returns a fresh Uint8Array (byteOffset=0, distinct buffer).
//  2. `new ArrayBuffer(n); Uint8Array.set(bytes)` creates a buffer whose memory is DISTINCT from the
//     source backing array (no aliasing).
//  3. The result is a plain `ArrayBuffer` (not `SharedArrayBuffer`), so it IS transferable.
//  4. After `structuredClone(buf, { transfer: [buf] })`, the original is detached (byteLength=0).

describe('(d) transfer-buffer pattern is a detachable copy, not an alias', () => {
  it('new ArrayBuffer + Uint8Array.set produces memory distinct from the source bytes', () => {
    const original = new Uint8Array([10, 20, 30, 40, 50])

    // Replicate the exact pattern used in sourceToTransferBuffer
    const transferable = new ArrayBuffer(original.byteLength)
    new Uint8Array(transferable).set(original)

    // The transferable must hold the same values
    expect(Array.from(new Uint8Array(transferable))).toEqual(Array.from(original))

    // But it must NOT share the backing memory
    expect(transferable).not.toBe(original.buffer)

    // Mutate the original AFTER the copy — the transferable is unaffected
    original[0] = 0xff
    expect(new Uint8Array(transferable)[0]).toBe(10) // unchanged
  })

  it('the transfer buffer is a plain ArrayBuffer (not SharedArrayBuffer) — is transferable', () => {
    const bytes = new Uint8Array([1, 2, 3])
    const buf = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buf).set(bytes)

    expect(buf instanceof ArrayBuffer).toBe(true)
    // SharedArrayBuffer would fail structuredClone transfer; plain ArrayBuffer succeeds.
    // Verify by transferring it — the source is detached (byteLength = 0) post-transfer.
    const transferred = structuredClone(buf, { transfer: [buf] })
    expect(buf.byteLength).toBe(0) // source detached → confirms it was transferable
    expect(transferred.byteLength).toBe(3) // content arrived
    expect(Array.from(new Uint8Array(transferred))).toEqual([1, 2, 3])
  })

  it('publicationSourceFromBytes.read() returns a fresh buffer (the proxy source input is isolated)', async () => {
    // When the proxy calls `source.read(0, size)`, it must get a fresh Uint8Array (byteOffset-0).
    // If it got a subarray view, `new Uint8Array(buf).set(subview)` would STILL work (set copies),
    // but this asserts the upstream contract is correct: the source's read() is already isolated.
    const backing = new Uint8Array([100, 101, 102, 103, 104])
    const source = publicationSourceFromBytes(backing)

    const size = await source.size()
    const chunk = await source.read(0, size)

    // byteOffset-0 and distinct buffer — safe to transfer without aliasing the source
    expect(chunk.byteOffset).toBe(0)
    expect(chunk.buffer).not.toBe(backing.buffer)

    // Confirm values identical
    expect(Array.from(chunk)).toEqual(Array.from(backing))
  })
})
