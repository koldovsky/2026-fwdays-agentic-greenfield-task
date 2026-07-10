// Gate-2 INDEPENDENT checker tests for add-offline-and-sync (ch9).
// Authored by the checker — distinct from the maker's tests. Tests the same invariants from scratch
// using different helper patterns to provide independent evidence. Covers:
//   1. furthest-wins BOTH directions through DexieSyncEngine.drain
//   2. Single-flight drain (concurrent drains → one execution per key)
//   3. Outbox persistence across DB close+reopen
//   4. Error path: strategy throws → entry retained, lastSyncedAt stays null
//   5. OPFS read path calls File.slice/arrayBuffer and NEVER fetch

import { afterEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory, IDBKeyRange as FakeKeyRange } from 'fake-indexeddb'
import type { ProgressSyncStrategy } from '@/core/contracts'
import type { BookRef, Locator } from '@/core/model'
import { MEDIA_TYPE_EPUB } from '@/core/model'
import { EddaDb } from '@/platform/web/db'
import { DexieSyncEngine } from '@/platform/web/sync-engine'
import { publicationSourceFromFile } from '@/platform/web/publication-source'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRef(bookId = 'g2-book'): BookRef {
  return { sourceId: 'src-a', bookId, mediaType: MEDIA_TYPE_EPUB, title: bookId }
}

function locatorAt(totalProgression: number, ref: BookRef = makeRef()): Locator {
  return {
    href: ref.bookId,
    type: ref.mediaType,
    locations: { totalProgression },
  }
}

/** Build a fresh engine backed by an in-memory IndexedDB (a new IDBFactory = a fresh store). */
function freshEngine(
  factory: IDBFactory,
  opts: { isOnline?: () => boolean; now?: () => number } = {},
): { engine: DexieSyncEngine; db: EddaDb } {
  const db = new EddaDb({ name: 'g2-check', indexedDB: factory, IDBKeyRange: FakeKeyRange })
  const engine = new DexieSyncEngine(db, { isOnline: opts.isOnline ?? (() => true), now: opts.now })
  return { engine, db }
}

// ─── Strategy stub ─────────────────────────────────────────────────────────────

interface StubStrategyOptions {
  remoteProgression?: number
  failSetProgress?: boolean
  /** Hold getProgress until release() is called — for concurrency tests. */
  pauseGetProgress?: boolean
}

function makeStubStrategy(opts: StubStrategyOptions = {}): {
  strategy: ProgressSyncStrategy
  setProgressCalls: { ref: BookRef; locator: Locator }[]
  release: () => void
} {
  const setProgressCalls: { ref: BookRef; locator: Locator }[] = []
  let releaseGate: (() => void) | null = null
  let gate: Promise<void> | null = null

  if (opts.pauseGetProgress) {
    gate = new Promise<void>((resolve) => {
      releaseGate = resolve
    })
  }

  const strategy: ProgressSyncStrategy = {
    async getProgress(ref: BookRef): Promise<Locator | undefined> {
      if (gate) await gate
      if (opts.remoteProgression === undefined) return undefined
      return locatorAt(opts.remoteProgression, ref)
    },
    async setProgress(ref: BookRef, locator: Locator): Promise<void> {
      if (opts.failSetProgress) throw new Error('server error')
      setProgressCalls.push({ ref, locator })
    },
  }

  return { strategy, setProgressCalls, release: () => releaseGate?.() }
}

const allDbs: EddaDb[] = []
afterEach(() => {
  for (const db of allDbs) db.close()
  allDbs.length = 0
  vi.restoreAllMocks()
})

function tracked(db: EddaDb): EddaDb {
  allDbs.push(db)
  return db
}

// ─── 1. Furthest-wins: local ahead ────────────────────────────────────────────

describe('Gate-2 checker — furthest-wins: local ahead of remote', () => {
  it('calls setProgress with the local locator and removes the outbox entry', async () => {
    const factory = new IDBFactory()
    const { engine, db } = freshEngine(factory)
    tracked(db)

    const ref = makeRef('book-local-ahead')
    const { strategy, setProgressCalls } = makeStubStrategy({ remoteProgression: 0.2 })

    engine.enqueue({ ref, locator: locatorAt(0.75, ref), queuedAt: Date.now() })
    await engine.idle()

    await engine.drain(strategy)

    // setProgress MUST have been called exactly once with the local (further) locator
    expect(setProgressCalls).toHaveLength(1)
    expect(setProgressCalls[0]!.locator.locations?.totalProgression).toBe(0.75)
    // Entry removed after confirmed write
    expect(await engine.pendingCount()).toBe(0)
  })
})

// ─── 2. Furthest-wins: remote ahead ───────────────────────────────────────────

describe('Gate-2 checker — furthest-wins: remote ahead of local', () => {
  it('does NOT call setProgress and still removes the outbox entry', async () => {
    const factory = new IDBFactory()
    const { engine, db } = freshEngine(factory)
    tracked(db)

    const ref = makeRef('book-remote-ahead')
    const { strategy, setProgressCalls } = makeStubStrategy({ remoteProgression: 0.9 })

    engine.enqueue({ ref, locator: locatorAt(0.4, ref), queuedAt: Date.now() })
    await engine.idle()

    await engine.drain(strategy)

    // Remote is further → no server write
    expect(setProgressCalls).toHaveLength(0)
    // Entry reconciled (dropped) even though no write happened
    expect(await engine.pendingCount()).toBe(0)
  })

  it('does NOT call setProgress when local equals remote (already synced)', async () => {
    const factory = new IDBFactory()
    const { engine, db } = freshEngine(factory)
    tracked(db)

    const ref = makeRef('book-equal')
    const { strategy, setProgressCalls } = makeStubStrategy({ remoteProgression: 0.5 })

    engine.enqueue({ ref, locator: locatorAt(0.5, ref), queuedAt: Date.now() })
    await engine.idle()

    await engine.drain(strategy)

    expect(setProgressCalls).toHaveLength(0)
    expect(await engine.pendingCount()).toBe(0)
  })
})

// ─── 3. Single-flight drain ───────────────────────────────────────────────────

describe('Gate-2 checker — single-flight drain', () => {
  it('concurrent drain() calls collapse to one execution per key', async () => {
    const factory = new IDBFactory()
    const { engine, db } = freshEngine(factory)
    tracked(db)

    const ref = makeRef('book-sf')
    const { strategy, setProgressCalls, release } = makeStubStrategy({
      remoteProgression: 0.1,
      pauseGetProgress: true,
    })

    engine.enqueue({ ref, locator: locatorAt(0.8, ref), queuedAt: Date.now() })
    await engine.idle()

    // Start first drain — it will pause inside getProgress
    const firstDrain = engine.drain(strategy)
    // Start second drain immediately — it should JOIN the first, not run a second getProgress
    const secondDrain = engine.drain(strategy)

    release() // let getProgress complete
    await Promise.all([firstDrain, secondDrain])

    // Only ONE setProgress call (not two — the second drain joined the first)
    expect(setProgressCalls).toHaveLength(1)
    expect(await engine.pendingCount()).toBe(0)
  })
})

// ─── 4. Error path: entry retained, lastSyncedAt stays null ──────────────────

describe('Gate-2 checker — error path', () => {
  it('leaves the entry in the outbox and keeps lastSyncedAt null when setProgress throws', async () => {
    const factory = new IDBFactory()
    const { engine, db } = freshEngine(factory)
    tracked(db)

    const ref = makeRef('book-err')
    const { strategy } = makeStubStrategy({ remoteProgression: 0.1, failSetProgress: true })

    engine.enqueue({ ref, locator: locatorAt(0.7, ref), queuedAt: Date.now() })
    await engine.idle()

    // drain should not throw (the engine swallows per-entry errors)
    await expect(engine.drain(strategy)).resolves.toBeUndefined()

    // Entry must still be in the outbox (to be retried later)
    expect(await engine.pendingCount()).toBe(1)
    // A failed drain is not a reconciled state
    expect(engine.lastSyncedAt).toBeNull()
  })
})

// ─── 5. Outbox persistence across DB close+reopen ────────────────────────────

describe('Gate-2 checker — outbox persistence', () => {
  it('enqueued entry survives EddaDb close and reopen', async () => {
    const factory = new IDBFactory()

    // First engine: enqueue
    const db1 = tracked(
      new EddaDb({ name: 'g2-persist', indexedDB: factory, IDBKeyRange: FakeKeyRange }),
    )
    const engine1 = new DexieSyncEngine(db1, { isOnline: () => true })
    const ref = makeRef('book-persist')
    engine1.enqueue({ ref, locator: locatorAt(0.6, ref), queuedAt: Date.now() })
    await engine1.idle()
    db1.close()

    // Second engine: different EddaDb instance, same backing store
    const db2 = tracked(
      new EddaDb({ name: 'g2-persist', indexedDB: factory, IDBKeyRange: FakeKeyRange }),
    )
    const engine2 = new DexieSyncEngine(db2, { isOnline: () => true })
    expect(await engine2.pendingCount()).toBe(1)
  })

  it('duplicate enqueues for the same key collapse to the furthest (read after reload)', async () => {
    const factory = new IDBFactory()
    const db = tracked(
      new EddaDb({ name: 'g2-collapse', indexedDB: factory, IDBKeyRange: FakeKeyRange }),
    )
    const engine = new DexieSyncEngine(db, { isOnline: () => true })
    const ref = makeRef('book-collapse')

    // Enqueue three times; the furthest should survive
    engine.enqueue({ ref, locator: locatorAt(0.3, ref), queuedAt: Date.now() })
    engine.enqueue({ ref, locator: locatorAt(0.9, ref), queuedAt: Date.now() })
    engine.enqueue({ ref, locator: locatorAt(0.5, ref), queuedAt: Date.now() })
    await engine.idle()

    // Should have exactly one pending entry
    expect(await engine.pendingCount()).toBe(1)

    // Drain it and verify the FURTHEST locator was written
    const { strategy, setProgressCalls } = makeStubStrategy({ remoteProgression: 0 })
    await engine.drain(strategy)
    expect(setProgressCalls).toHaveLength(1)
    expect(setProgressCalls[0]!.locator.locations?.totalProgression).toBe(0.9)
  })
})

// ─── 6. OPFS read path calls File.slice, NEVER fetch ─────────────────────────

describe('Gate-2 checker — OPFS read bypasses fetch (ADR-005)', () => {
  it('publicationSourceFromFile reads via File.slice/arrayBuffer and never calls fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    // Build a real File (jsdom supports File API)
    const content = new Uint8Array(256)
    for (let i = 0; i < 256; i++) content[i] = i
    const file = new File([content], 'book.epub', { type: 'application/epub+zip' })

    const source = publicationSourceFromFile(file)

    // Read two non-overlapping slices
    const slice1 = await source.read(0, 10)
    const slice2 = await source.read(100, 50)

    // Correct bytes returned
    expect(slice1).toEqual(content.subarray(0, 10))
    expect(slice2).toEqual(content.subarray(100, 150))

    // fetch must never have been called
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('publicationSourceFromFile size() reflects the File size without fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const file = new File([new Uint8Array(512)], 'book.epub')
    const source = publicationSourceFromFile(file)

    expect(await source.size()).toBe(512)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
