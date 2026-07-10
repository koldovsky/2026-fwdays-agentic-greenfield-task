// Downloads registry store. The durable Dexie store + OPFS cache (mocked here) are unit-tested in
// platform/web; this proves the store's orchestration: hydrate from the registry, count drives the
// badge/library, a successful download registers offline-available, and an interrupted one frees its
// partial bytes and leaves NO completed entry.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Connector } from '@/core/contracts'
import { MEDIA_TYPE_EPUB, type BookRef } from '@/core/model'
import { opfsKeyFor, type DownloadRecord } from '@/platform/web'
import { useDownloadsStore } from './downloadsStore'

const mocks = vi.hoisted(() => ({
  db: { downloads: { toArray: vi.fn(), put: vi.fn(), delete: vi.fn() } },
  cache: {
    downloadToOpfs: vi.fn(),
    removeOpfs: vi.fn(),
    publicationSourceFromOpfs: vi.fn(),
  },
}))

vi.mock('@/app/sync', () => ({
  eddaDb: () => mocks.db,
  opfsBookCache: () => mocks.cache,
  syncEngine: () => ({}),
}))

const REF: BookRef = {
  sourceId: 'connector-komga',
  bookId: 'book-1',
  mediaType: MEDIA_TYPE_EPUB,
  title: 'Pensées',
}
const completeRecord = (over: Partial<DownloadRecord> = {}): DownloadRecord => ({
  sourceId: REF.sourceId,
  bookId: REF.bookId,
  mediaType: REF.mediaType,
  title: REF.title,
  size: 1000,
  state: 'complete',
  downloadedAt: 1,
  opfsKey: opfsKeyFor(REF),
  ...over,
})

const connectorWithBytes = (): Connector =>
  ({ content: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])) }) as unknown as Connector

beforeEach(() => {
  setActivePinia(createPinia())
  mocks.db.downloads.toArray.mockReset().mockResolvedValue([])
  mocks.db.downloads.put.mockReset().mockResolvedValue(undefined)
  mocks.db.downloads.delete.mockReset().mockResolvedValue(undefined)
  mocks.cache.downloadToOpfs.mockReset().mockResolvedValue(1234)
  mocks.cache.removeOpfs.mockReset().mockResolvedValue(undefined)
  mocks.cache.publicationSourceFromOpfs
    .mockReset()
    .mockResolvedValue({ size: async () => 3, read: async () => new Uint8Array() })
})

describe('useDownloadsStore — registry view', () => {
  it('counts only completed entries and reports per-book availability', () => {
    const store = useDownloadsStore()
    store.entries = [completeRecord(), completeRecord({ bookId: 'book-2', state: 'downloading' })]
    expect(store.downloadedCount).toBe(1)
    expect(store.isDownloaded(REF)).toBe(true)
    expect(store.isDownloaded({ ...REF, bookId: 'book-2' })).toBe(false)
  })

  it('hydrates the registry from Dexie', async () => {
    mocks.db.downloads.toArray.mockResolvedValue([completeRecord()])
    const store = useDownloadsStore()
    await store.hydrate()
    expect(store.downloadedCount).toBe(1)
  })

  it('hydrate degrades to empty when IndexedDB is unavailable', async () => {
    mocks.db.downloads.toArray.mockRejectedValue(new Error('no IndexedDB'))
    const store = useDownloadsStore()
    await store.hydrate()
    expect(store.entries).toEqual([])
  })
})

describe('useDownloadsStore — download lifecycle', () => {
  it('streams a download to OPFS and registers it offline-available on success', async () => {
    const store = useDownloadsStore()
    await store.startDownload(connectorWithBytes(), REF)

    expect(mocks.cache.downloadToOpfs).toHaveBeenCalledWith(opfsKeyFor(REF), expect.anything())
    expect(mocks.db.downloads.put).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'complete', size: 1234, opfsKey: opfsKeyFor(REF) }),
    )
    expect(store.isDownloaded(REF)).toBe(true)
    expect(store.downloadedCount).toBe(1)
    expect(store.isDownloading(REF)).toBe(false)
  })

  it('frees the partial bytes and leaves NO completed entry when the download fails', async () => {
    mocks.cache.downloadToOpfs.mockRejectedValue(new Error('network dropped'))
    const store = useDownloadsStore()

    await expect(store.startDownload(connectorWithBytes(), REF)).rejects.toThrow('network dropped')
    expect(mocks.cache.removeOpfs).toHaveBeenCalledWith(opfsKeyFor(REF))
    expect(store.isDownloaded(REF)).toBe(false)
    expect(store.downloadedCount).toBe(0)
  })

  it('removeDownload frees the OPFS bytes and decrements the count', async () => {
    const store = useDownloadsStore()
    store.entries = [completeRecord()]
    expect(store.downloadedCount).toBe(1)

    await store.removeDownload(REF)
    expect(mocks.cache.removeOpfs).toHaveBeenCalledWith(opfsKeyFor(REF))
    expect(mocks.db.downloads.delete).toHaveBeenCalled()
    expect(store.downloadedCount).toBe(0)
  })

  it('getPublicationSource returns the OPFS source only for a downloaded book', async () => {
    const store = useDownloadsStore()
    expect(await store.getPublicationSource(REF)).toBeNull() // not downloaded

    store.entries = [completeRecord()]
    expect(await store.getPublicationSource(REF)).not.toBeNull()
    expect(mocks.cache.publicationSourceFromOpfs).toHaveBeenCalledWith(opfsKeyFor(REF))
  })
})
