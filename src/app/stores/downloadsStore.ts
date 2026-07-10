import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Connector, PublicationSource } from '@/core/contracts'
import type { BookRef } from '@/core/model'
import {
  connectorDownloadStream,
  isOfflineAvailable,
  keyTuple,
  opfsKeyFor,
  type DownloadRecord,
} from '@/platform/web'
import { eddaDb, opfsBookCache } from '@/app/sync'

/**
 * The offline Downloads registry (offline-storage). Reactive view-model over the durable Dexie `downloads`
 * table + the OPFS byte cache: it drives the sidebar Downloads badge, the library "N downloaded for offline"
 * count, the per-book offline indicator, and the Downloads list. The bytes live in OPFS (streamed in, read
 * by `File.slice` — they bypass the Service Worker, ADR-005); this store owns only the metadata + the
 * orchestration. Every storage call degrades gracefully (a `catch`) so a context without IndexedDB/OPFS
 * (e.g. a jsdom unit test) still renders the empty state instead of throwing.
 */
export const useDownloadsStore = defineStore('downloads', () => {
  // The registry rows currently known. Plain JSON-native data, safe to make reactive.
  const entries = ref<DownloadRecord[]>([])
  // Keys with an in-flight download, so the UI can show a per-book "Downloading…" affordance.
  const inFlight = ref<Set<string>>(new Set())

  const completed = computed(() => entries.value.filter(isOfflineAvailable))
  /** The count the sidebar badge + the library "N downloaded for offline" line render. */
  const downloadedCount = computed(() => completed.value.length)

  const keyOf = (ref: Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>): string =>
    `${ref.sourceId}:${ref.bookId}:${ref.mediaType}`

  function recordFor(
    ref: Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>,
  ): DownloadRecord | undefined {
    return entries.value.find(
      (e) =>
        e.sourceId === ref.sourceId && e.bookId === ref.bookId && e.mediaType === ref.mediaType,
    )
  }

  /** Is this book offline-available (a completed download)? Drives the per-book offline indicator. */
  function isDownloaded(ref: Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>): boolean {
    const record = recordFor(ref)
    return record !== undefined && isOfflineAvailable(record)
  }

  function isDownloading(ref: Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>): boolean {
    return inFlight.value.has(keyOf(ref))
  }

  /** Load the registry from Dexie. No-op (empty) where IndexedDB is unavailable. */
  async function hydrate(): Promise<void> {
    try {
      entries.value = await eddaDb().downloads.toArray()
    } catch {
      entries.value = []
    }
  }

  function upsertLocal(record: DownloadRecord): void {
    const next = entries.value.filter(
      (e) =>
        !(
          e.sourceId === record.sourceId &&
          e.bookId === record.bookId &&
          e.mediaType === record.mediaType
        ),
    )
    next.push(record)
    entries.value = next
  }

  function removeLocal(ref: Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>): void {
    entries.value = entries.value.filter(
      (e) =>
        !(e.sourceId === ref.sourceId && e.bookId === ref.bookId && e.mediaType === ref.mediaType),
    )
  }

  /**
   * Stream a book to OPFS and register it offline-available — but ONLY once the stream completes. On any
   * failure the partial OPFS bytes are freed and no completed registry row is left (interrupted ≠ complete).
   */
  async function startDownload(connector: Connector, ref: BookRef): Promise<void> {
    const key = keyOf(ref)
    if (isDownloaded(ref) || inFlight.value.has(key)) return
    const opfsKey = opfsKeyFor(ref)
    inFlight.value = new Set(inFlight.value).add(key)
    try {
      const stream = await connectorDownloadStream(connector, ref)
      const size = await opfsBookCache().downloadToOpfs(opfsKey, stream)
      const record: DownloadRecord = {
        sourceId: ref.sourceId,
        bookId: ref.bookId,
        mediaType: ref.mediaType,
        title: ref.title,
        size,
        state: 'complete',
        downloadedAt: Date.now(),
        opfsKey,
      }
      try {
        await eddaDb().downloads.put(record)
      } catch {
        // No IndexedDB (test) — keep the reactive registry consistent anyway.
      }
      upsertLocal(record)
    } catch (error) {
      // Interrupted: free any partial bytes and leave NO completed entry.
      await opfsBookCache().removeOpfs(opfsKey)
      try {
        await eddaDb().downloads.delete(keyTuple(ref))
      } catch {
        // ignore — nothing persisted
      }
      removeLocal(ref)
      throw error
    } finally {
      const next = new Set(inFlight.value)
      next.delete(key)
      inFlight.value = next
    }
  }

  /** Remove a download: free its OPFS bytes, delete the registry row, and decrement the counts. */
  async function removeDownload(
    ref: Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>,
  ): Promise<void> {
    const record = recordFor(ref)
    await opfsBookCache().removeOpfs(record?.opfsKey ?? opfsKeyFor(ref))
    try {
      await eddaDb().downloads.delete(keyTuple(ref))
    } catch {
      // ignore — nothing persisted
    }
    removeLocal(ref)
  }

  /**
   * The OFFLINE read source for a downloaded book (the reader opens this instead of `connector.content()`),
   * or `null` when the book is not offline. Pure OPFS `File.slice` — no network, no Service Worker.
   */
  async function getPublicationSource(
    ref: Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>,
  ): Promise<PublicationSource | null> {
    const record = recordFor(ref)
    if (!record || !isOfflineAvailable(record)) return null
    // Read from the STORED OPFS key — the human-readable name generated at download time WITH the title.
    // Never recompute it here (the title is not in `ref`), so the readable filename always resolves.
    return opfsBookCache().publicationSourceFromOpfs(record.opfsKey)
  }

  return {
    entries,
    completed,
    downloadedCount,
    isDownloaded,
    isDownloading,
    hydrate,
    startDownload,
    removeDownload,
    getPublicationSource,
  }
})
