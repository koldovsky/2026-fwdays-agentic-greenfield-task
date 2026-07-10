// The Dexie sync engine — the load-bearing unit. Run on `fake-indexeddb` (durable IndexedDB semantics).
// Proves the furthest-progression-wins reconciliation BOTH directions (local-further → setProgress; remote-
// further → NO setProgress, entry removed), the per-key collapse, outbox durability across a reload, the
// single-flight drain, idempotent retry (error leaves the entry; an already-synced entry never double-writes),
// the offline gate, the no-op strategy, and the `lastSyncedAt` signal.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory, IDBKeyRange as FDBKeyRange } from 'fake-indexeddb'
import type { ProgressSyncStrategy } from '@/core/contracts'
import type { BookRef, Locator } from '@/core/model'
import { MEDIA_TYPE_EPUB } from '@/core/model'
import type { OutboxEntry } from '@/core/sync'
import { EddaDb } from './db'
import { DexieSyncEngine, type DexieSyncEngineOptions } from './sync-engine'

const REF: BookRef = {
  sourceId: 'connector-komga',
  bookId: 'book-1',
  mediaType: MEDIA_TYPE_EPUB,
  title: 'Pensées',
}
const keyOf = (ref: BookRef): string => `${ref.sourceId}:${ref.bookId}:${ref.mediaType}`

function at(totalProgression: number, ref: BookRef = REF): Locator {
  return { href: ref.bookId, type: ref.mediaType, locations: { totalProgression } }
}
function entry(totalProgression: number, queuedAt = Date.now(), ref: BookRef = REF): OutboxEntry {
  return { ref, locator: at(totalProgression, ref), queuedAt }
}

/** A controllable in-memory "server" implementing the strategy, with call spies + a pause gate. */
class FakeStrategy implements ProgressSyncStrategy {
  readonly server = new Map<string, Locator>()
  readonly getProgress = vi.fn(async (ref: BookRef): Promise<Locator | undefined> => {
    if (this.#gate) await this.#gate
    return this.server.get(keyOf(ref))
  })
  readonly setProgress = vi.fn(async (ref: BookRef, locator: Locator): Promise<void> => {
    if (this.failSet) throw new Error('server 500')
    this.server.set(keyOf(ref), locator)
  })
  failSet = false
  #gate: Promise<void> | null = null

  seed(ref: BookRef, totalProgression: number): void {
    this.server.set(keyOf(ref), at(totalProgression, ref))
  }
  /** Hold `getProgress` until the returned release is called (to open a concurrency window). */
  pause(): () => void {
    let release!: () => void
    this.#gate = new Promise<void>((r) => (release = r))
    return () => {
      this.#gate = null
      release()
    }
  }
}

let dbs: EddaDb[] = []
function makeEngine(
  factory: IDBFactory,
  options: DexieSyncEngineOptions = {},
  name = 'edda-engine',
): DexieSyncEngine {
  const db = new EddaDb({ name, indexedDB: factory, IDBKeyRange: FDBKeyRange })
  dbs.push(db)
  return new DexieSyncEngine(db, { isOnline: () => true, ...options })
}

afterEach(() => {
  for (const db of dbs) db.close()
  dbs = []
  vi.restoreAllMocks()
})

describe('DexieSyncEngine — outbox', () => {
  it('collapses repeated enqueues for one key to the single furthest pending locator', async () => {
    const engine = makeEngine(new IDBFactory())
    engine.enqueue(entry(0.2))
    engine.enqueue(entry(0.6))
    engine.enqueue(entry(0.4))
    await engine.idle()

    expect(await engine.pendingCount()).toBe(1)
    const strategy = new FakeStrategy()
    await engine.drain(strategy)
    expect(strategy.setProgress).toHaveBeenCalledTimes(1)
    expect(strategy.server.get(keyOf(REF))?.locations?.totalProgression).toBe(0.6) // the furthest won
  })

  it('persists the outbox across a simulated reload (a fresh engine over the same backing)', async () => {
    const factory = new IDBFactory()
    const first = makeEngine(factory)
    first.enqueue(entry(0.5))
    await first.idle()

    const reopened = makeEngine(factory)
    expect(await reopened.pendingCount()).toBe(1)
  })
})

describe('DexieSyncEngine — furthest-progression-wins (both directions)', () => {
  it('writes local when the pending local locator is further than remote', async () => {
    const engine = makeEngine(new IDBFactory())
    const strategy = new FakeStrategy()
    strategy.seed(REF, 0.3) // server behind
    engine.enqueue(entry(0.6)) // local further
    await engine.idle()

    await engine.drain(strategy)

    expect(strategy.setProgress).toHaveBeenCalledTimes(1)
    expect(strategy.setProgress).toHaveBeenCalledWith(REF, at(0.6))
    expect(strategy.server.get(keyOf(REF))?.locations?.totalProgression).toBe(0.6)
    expect(await engine.pendingCount()).toBe(0) // entry removed after a confirmed write
  })

  it('does NOT write and removes the entry when remote is further (never regress the server)', async () => {
    const engine = makeEngine(new IDBFactory())
    const strategy = new FakeStrategy()
    strategy.seed(REF, 0.8) // server ahead
    engine.enqueue(entry(0.3)) // local behind
    await engine.idle()

    await engine.drain(strategy)

    expect(strategy.getProgress).toHaveBeenCalledTimes(1)
    expect(strategy.setProgress).not.toHaveBeenCalled() // remote-further → no write
    expect(strategy.server.get(keyOf(REF))?.locations?.totalProgression).toBe(0.8) // kept remote
    expect(await engine.pendingCount()).toBe(0) // reconciled → entry removed
  })

  it('is a no-op write when local equals remote (already synced — never double-writes)', async () => {
    const engine = makeEngine(new IDBFactory())
    const strategy = new FakeStrategy()
    strategy.seed(REF, 0.5)
    engine.enqueue(entry(0.5))
    await engine.idle()

    await engine.drain(strategy)
    expect(strategy.setProgress).not.toHaveBeenCalled()
    expect(await engine.pendingCount()).toBe(0)
  })
})

describe('DexieSyncEngine — scheduling & retry', () => {
  it('does not drain while offline; the entry stays queued', async () => {
    const engine = makeEngine(new IDBFactory(), { isOnline: () => false })
    const strategy = new FakeStrategy()
    engine.enqueue(entry(0.5))
    await engine.idle()

    await engine.drain(strategy)
    expect(strategy.getProgress).not.toHaveBeenCalled()
    expect(strategy.setProgress).not.toHaveBeenCalled()
    expect(await engine.pendingCount()).toBe(1)
  })

  it('is single-flight: concurrent drains write each key exactly once', async () => {
    const engine = makeEngine(new IDBFactory())
    const strategy = new FakeStrategy()
    engine.enqueue(entry(0.6))
    await engine.idle()

    const release = strategy.pause() // hold the first drain mid getProgress
    const first = engine.drain(strategy)
    const second = engine.drain(strategy) // joins the in-flight drain, no second run
    release()
    await Promise.all([first, second])

    expect(strategy.getProgress).toHaveBeenCalledTimes(1)
    expect(strategy.setProgress).toHaveBeenCalledTimes(1)
  })

  it('keeps the entry and does not double-write when a write fails, then succeeds on retry', async () => {
    const engine = makeEngine(new IDBFactory())
    const strategy = new FakeStrategy()
    strategy.failSet = true
    engine.enqueue(entry(0.7))
    await engine.idle()

    await engine.drain(strategy) // setProgress throws → entry retained
    expect(strategy.setProgress).toHaveBeenCalledTimes(1)
    expect(await engine.pendingCount()).toBe(1)
    expect(engine.lastSyncedAt).toBeNull() // failed drain is not a reconciled state

    strategy.failSet = false
    await engine.drain(strategy) // retry confirms the write
    expect(strategy.server.get(keyOf(REF))?.locations?.totalProgression).toBe(0.7)
    expect(await engine.pendingCount()).toBe(0)
  })
})

describe('DexieSyncEngine — no-op strategy & last-synced', () => {
  const noop: ProgressSyncStrategy = {
    getProgress: async () => undefined,
    setProgress: async () => {},
  }

  it('drains locally without error through a no-op strategy and performs no server write that errors', async () => {
    const engine = makeEngine(new IDBFactory())
    engine.enqueue(entry(0.4))
    await engine.idle()
    await expect(engine.drain(noop)).resolves.toBeUndefined()
    expect(await engine.pendingCount()).toBe(0)
  })

  it('records lastSyncedAt only after a clean drain', async () => {
    let clock = 1_000
    const engine = makeEngine(new IDBFactory(), { now: () => clock })
    expect(engine.lastSyncedAt).toBeNull()

    engine.enqueue(entry(0.4))
    await engine.idle()
    clock = 9_999
    await engine.drain(new FakeStrategy())
    expect(engine.lastSyncedAt).toBe(9_999)
  })
})

describe('DexieSyncEngine — enqueue observers (drives the prompt drain while reading)', () => {
  it('notifies a subscriber on every enqueue so a page turn can schedule a drain', () => {
    const engine = makeEngine(new IDBFactory())
    const onEnqueue = vi.fn()
    engine.onEnqueue(onEnqueue)

    engine.enqueue(entry(0.2))
    engine.enqueue(entry(0.4))

    // Synchronous fire (the listener runs before the durable write lands; the drain awaits it via idle()).
    expect(onEnqueue).toHaveBeenCalledTimes(2)
  })

  it('stops notifying after unsubscribe', () => {
    const engine = makeEngine(new IDBFactory())
    const onEnqueue = vi.fn()
    const unsubscribe = engine.onEnqueue(onEnqueue)

    engine.enqueue(entry(0.2))
    unsubscribe()
    engine.enqueue(entry(0.4))

    expect(onEnqueue).toHaveBeenCalledTimes(1)
  })

  it('a throwing listener never breaks the fire-and-forget enqueue (the position still persists)', async () => {
    const engine = makeEngine(new IDBFactory())
    engine.onEnqueue(() => {
      throw new Error('listener blew up')
    })

    expect(() => engine.enqueue(entry(0.5))).not.toThrow()
    await engine.idle()
    expect(await engine.pendingCount()).toBe(1)
    expect((await engine.localProgress(REF))?.locations?.totalProgression).toBe(0.5)
  })
})

describe('DexieSyncEngine — durable local progress cache (resume-on-open + UI fallback)', () => {
  it('returns null before any position is recorded', async () => {
    const engine = makeEngine(new IDBFactory())
    expect(await engine.localProgress(REF)).toBeNull()
  })

  it('records the furthest local position on enqueue', async () => {
    const engine = makeEngine(new IDBFactory())
    engine.enqueue(entry(0.25))
    engine.enqueue(entry(0.5))
    await engine.idle()
    expect((await engine.localProgress(REF))?.locations?.totalProgression).toBe(0.5)
  })

  it('keeps the FURTHEST position when the reader pages backwards (aligned with the server)', async () => {
    const engine = makeEngine(new IDBFactory())
    engine.enqueue(entry(0.6)) // read forward
    engine.enqueue(entry(0.3)) // paged back
    await engine.idle()
    // The cache holds the device's high-water mark (0.6), so a reopen resumes there and the server (also
    // furthest) never looks "ahead" of this device — no spurious resume prompt.
    expect((await engine.localProgress(REF))?.locations?.totalProgression).toBe(0.6)
    // The outbox likewise pushes the FURTHEST (0.6) so the server never regresses.
    const strategy = new FakeStrategy()
    strategy.seed(REF, 0.1)
    await engine.drain(strategy)
    expect(strategy.server.get(keyOf(REF))?.locations?.totalProgression).toBe(0.6)
  })

  it('tracks the furthest ACROSS a drain (a later backward page does not lower the cache)', async () => {
    const engine = makeEngine(new IDBFactory())
    engine.enqueue(entry(0.6))
    await engine.idle()
    await engine.drain(new FakeStrategy()) // empties the outbox (the since-last-drain furthest resets)
    engine.enqueue(entry(0.3)) // a backward page AFTER the drain
    await engine.idle()
    // The durable cache keeps the ALL-TIME furthest (0.6) — its furthest-wins is taken against its own
    // row, not the (now-empty) outbox — so the reopened book still resumes at the high-water mark.
    expect((await engine.localProgress(REF))?.locations?.totalProgression).toBe(0.6)
  })

  it('a sync drain NEVER clears the local progress cache', async () => {
    const engine = makeEngine(new IDBFactory())
    engine.enqueue(entry(0.42))
    await engine.idle()
    await engine.drain(new FakeStrategy()) // server empty → push, outbox emptied
    expect(await engine.pendingCount()).toBe(0) // outbox drained…
    // …but the device's own copy of the position remains, for resume-on-open + UI display.
    expect((await engine.localProgress(REF))?.locations?.totalProgression).toBe(0.42)
  })

  it('survives a simulated reload (a fresh engine over the same backing)', async () => {
    const factory = new IDBFactory()
    const first = makeEngine(factory)
    first.enqueue(entry(0.7))
    await first.idle()
    const reopened = makeEngine(factory)
    expect((await reopened.localProgress(REF))?.locations?.totalProgression).toBe(0.7)
  })
})
