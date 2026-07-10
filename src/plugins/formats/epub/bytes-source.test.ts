// Publication source builders → `FormatHandler.open(source)` parity + ranged reads (ADR-005). This is
// the successor to the retired `bytes-source.ts`/`EpubBytesSource`: the plugin now consumes a NEUTRAL
// `core/contracts.PublicationSource`, built by `publicationSourceFromBytes` (core, no web types) and the
// web builders `publicationSourceFromFile` / `publicationSourceFromStream` (platform/web). A File-backed
// source reads by range — the 14 MB light-novel is never fully materialised — proven two ways: a
// `Blob.prototype.slice` spy and a `PublicationSource.read` spy.

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Publication } from '@/core/model'
import type { PublicationSource } from '@/core/contracts'
import { publicationSourceFromBytes } from '@/core/contracts'
import { publicationSourceFromFile, publicationSourceFromStream } from '@/platform/web'
import { EpubFormatHandler } from './index'
import { EMINENCE, PENSEES, fixtureBytes, fixtureFile, fixtureStream } from './test-fixtures'

function summary(pub: Publication) {
  return {
    title: pub.metadata.title,
    author: pub.metadata.author,
    language: pub.metadata.language,
    readingOrder: pub.readingOrder.length,
    toc: pub.tableOfContents?.length ?? 0,
  }
}

describe('publication source builders — file vs stream vs buffer', () => {
  it('open() parses identically from a File, a sequential stream, and a buffer', async () => {
    const handler = new EpubFormatHandler()
    const fromFile = await handler.open(publicationSourceFromFile(fixtureFile(PENSEES)))
    const fromStream = await handler.open(await publicationSourceFromStream(fixtureStream(PENSEES)))
    const fromBytes = await handler.open(publicationSourceFromBytes(fixtureBytes(PENSEES)))

    expect(summary(fromStream)).toEqual(summary(fromFile))
    expect(summary(fromBytes)).toEqual(summary(fromFile))
    expect(fromFile.metadata.title).toBe('Pensées')
    // Equivalent reading order and TOC, not just equal counts.
    expect(fromStream.readingOrder).toEqual(fromFile.readingOrder)
    expect(fromStream.tableOfContents).toEqual(fromFile.tableOfContents)
  })
})

describe('large EPUB is read by range, not fully buffered', () => {
  afterEach(() => vi.restoreAllMocks())

  it('parses the 14 MB light-novel via ranged Blob slices (Blob.slice spy)', async () => {
    const realSlice = Blob.prototype.slice
    let sliceCalls = 0
    let totalSliced = 0
    let maxSlice = 0
    const fixtureSize = fixtureBytes(EMINENCE).length
    expect(fixtureSize).toBeGreaterThan(10 * 1024 * 1024) // ~14 MB

    vi.spyOn(Blob.prototype, 'slice').mockImplementation(function (
      this: Blob,
      start?: number,
      end?: number,
      contentType?: string,
    ) {
      const from = start ?? 0
      const to = end ?? this.size
      sliceCalls += 1
      const len = Math.max(0, to - from)
      totalSliced += len
      maxSlice = Math.max(maxSlice, len)
      return realSlice.call(this, start, end, contentType)
    })

    const pub = await new EpubFormatHandler().open(publicationSourceFromFile(fixtureFile(EMINENCE)))
    expect(pub.metadata.title).toBe('The Eminence in Shadow, Vol. 1')

    // Ranged reads happened, and the whole file was never materialised in one read: the largest
    // single slice — and indeed the sum of all bytes sliced during parse — is far below the 14 MB.
    expect(sliceCalls).toBeGreaterThan(0)
    expect(maxSlice).toBeLessThan(fixtureSize)
    expect(totalSliced).toBeLessThan(fixtureSize)
  })

  it('reads the 14 MB light-novel by range through the PublicationSource (read spy)', async () => {
    const fixtureSize = fixtureBytes(EMINENCE).length
    const base = publicationSourceFromFile(fixtureFile(EMINENCE))
    let reads = 0
    let maxRead = 0
    let totalRead = 0
    const spied: PublicationSource = {
      size: () => base.size(),
      read: async (offset, length) => {
        reads += 1
        maxRead = Math.max(maxRead, length)
        totalRead += length
        return base.read(offset, length)
      },
    }

    const pub = await new EpubFormatHandler().open(spied)
    expect(pub.metadata.title).toBe('The Eminence in Shadow, Vol. 1')

    // Every read is a bounded range; no single read — nor the whole parse — touches the full 14 MB.
    expect(reads).toBeGreaterThan(0)
    expect(maxRead).toBeLessThan(fixtureSize)
    expect(totalRead).toBeLessThan(fixtureSize)
  })
})
