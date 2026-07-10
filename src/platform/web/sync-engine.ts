// The Dexie-backed `SyncEngine` — the durable, server-INDEPENDENT Strategy context (ADR-008 / ADR-011).
// It owns the outbox persistence, the single-flight drain, idempotent retry, and the read-before-write
// furthest-progression-wins reconciliation. It reaches a server ONLY through the injected
// `ProgressSyncStrategy` (no URLs / auth / protocol here); the neutral `furthestWins` policy + the
// `OutboxEntry` model live in `core/sync`. Dexie + `navigator.onLine` are web APIs, so the concrete engine
// lives in `platform/web`, never in `core/*` (which stays DOM-free + server-free).

import type { ProgressSyncStrategy } from '@/core/contracts'
import type { BookRef, Locator } from '@/core/model'
import { furthestWins, type OutboxEntry, type SyncEngine } from '@/core/sync'
import {
  EddaDb,
  fromOutboxRecord,
  keyTuple,
  toOutboxRecord,
  toProgressRecord,
  type OutboxRecord,
} from './db'

function defaultIsOnline(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    ? navigator.onLine
    : true
}

export interface DexieSyncEngineOptions {
  /** Wall-clock source for `lastSyncedAt` (the app/platform layer owns `Date.now`, never core). */
  now?: () => number
  /** Connectivity predicate; defaults to `navigator.onLine`. Injected in node/integration tests. */
  isOnline?: () => boolean
}

export class DexieSyncEngine implements SyncEngine {
  readonly #db: EddaDb
  readonly #now: () => number
  readonly #isOnline: () => boolean

  #lastSyncedAt: number | null = null
  // Serialize enqueues so two rapid updates for one key can't both read the pre-collapse row.
  #writeChain: Promise<void> = Promise.resolve()
  // Single-flight: at most one drain runs; concurrent callers join the in-flight one.
  #draining: Promise<void> | null = null
  // Observers notified on every enqueue. The app wires the drain scheduler here so a page turn schedules
  // a (debounced) drain — without it, queued progress only reaches the server on the NEXT reconnect /
  // focus / reload, so a user who reads then looks at the server sees no progress there.
  readonly #enqueueListeners = new Set<() => void>()

  constructor(db: EddaDb, options: DexieSyncEngineOptions = {}) {
    this.#db = db
    this.#now = options.now ?? (() => Date.now())
    this.#isOnline = options.isOnline ?? defaultIsOnline
  }

  get lastSyncedAt(): number | null {
    return this.#lastSyncedAt
  }

  enqueue(entry: OutboxEntry): void {
    // Fire-and-forget per the `SyncEngine` contract; serialized so the per-key collapse is race-free.
    this.#writeChain = this.#writeChain.then(() => this.#upsert(entry)).catch(() => {})
    // Notify observers so the app can schedule a prompt drain. Fire AFTER scheduling the write — a drain
    // awaits `#writeChain` via `idle()`, so the listener can run before the row lands and still drains it.
    for (const listener of this.#enqueueListeners) {
      try {
        listener()
      } catch {
        // A listener must never break the fire-and-forget enqueue contract.
      }
    }
  }

  /**
   * Subscribe to enqueues; returns an unsubscribe. The app wires this to the drain scheduler's `trigger`
   * so each reading position (a page turn) schedules a debounced drain — otherwise queued progress sits in
   * the outbox until the next focus / reconnect / reload and never reaches the server while the book is open.
   */
  onEnqueue(listener: () => void): () => void {
    this.#enqueueListeners.add(listener)
    return () => this.#enqueueListeners.delete(listener)
  }

  /**
   * Read-modify-write collapse: both the outbox row and the durable progress cache keep the
   * FURTHEST-progressed `Locator` for the key, written atomically in one transaction. They differ only in
   * lifetime and scope:
   *  - **outbox** — the furthest position pending a SERVER write; emptied on a successful drain. So its
   *    furthest-wins is taken against the outbox's own (since-last-drain) row.
   *  - **progress cache** — the device's ALL-TIME furthest position: the resume-on-open point and the UI's
   *    progress source. A drain NEVER clears it, so its furthest-wins is taken against the cache's OWN
   *    previous row — which keeps a reopened book resuming at the high-water mark AND means a backward page
   *    can't make the (further) server position look "ahead" of this device (no spurious resume prompt).
   * Enqueues are serialized (`#writeChain`), so these read-modify-writes never interleave for a key.
   */
  async #upsert(entry: OutboxEntry): Promise<void> {
    const key = keyTuple(entry.ref)
    await this.#db.transaction('rw', this.#db.outbox, this.#db.progress, async () => {
      const pending = await this.#db.outbox.get(key)
      const toPush = pending ? furthestWins(pending.locator, entry.locator) : entry.locator
      await this.#db.outbox.put(
        toOutboxRecord({ ref: entry.ref, locator: toPush, queuedAt: entry.queuedAt }),
      )
      const cached = await this.#db.progress.get(key)
      const furthest = cached ? furthestWins(cached.locator, entry.locator) : entry.locator
      await this.#db.progress.put(
        toProgressRecord({ ref: entry.ref, locator: furthest, queuedAt: entry.queuedAt }),
      )
    })
  }

  /**
   * The device's FURTHEST-progressed LOCAL reading position for a book — the resume-on-open source AND
   * the UI progress-display source — or `null` if this device has never recorded one. Reads the durable
   * progress cache, which a sync drain NEVER clears, so it survives reconnect, offline, and an emptied
   * outbox. Degrades to `null` where IndexedDB is unavailable (e.g. a jsdom unit test).
   */
  async localProgress(
    ref: Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>,
  ): Promise<Locator | null> {
    try {
      await this.idle()
      const row = await this.#db.progress.get(keyTuple(ref))
      return row?.locator ?? null
    } catch {
      return null
    }
  }

  /**
   * Every locally-cached position, keyed `${sourceId}:${bookId}:${mediaType}` — for the library's
   * "Keep reading" overlay (so a book read on THIS device shows its progress even when the server's
   * browse feed carries none). Empty map where IndexedDB is unavailable.
   */
  async allLocalProgress(): Promise<Map<string, Locator>> {
    try {
      await this.idle()
      const rows = await this.#db.progress.toArray()
      return new Map(
        rows.map((row) => [`${row.sourceId}:${row.bookId}:${row.mediaType}`, row.locator]),
      )
    } catch {
      return new Map()
    }
  }

  /** Resolve once all queued `enqueue`s have been persisted (wiring/test hook). */
  async idle(): Promise<void> {
    await this.#writeChain
  }

  /** Pending keys still in the outbox (drives the scheduler's backoff + any "pending" UI). */
  async pendingCount(): Promise<number> {
    await this.idle()
    return this.#db.outbox.count()
  }

  async drain(strategy: ProgressSyncStrategy): Promise<void> {
    if (this.#draining) return this.#draining // single-flight: join the running drain
    if (!this.#isOnline()) return // never attempt to write while offline
    this.#draining = this.#run(strategy).finally(() => {
      this.#draining = null
    })
    return this.#draining
  }

  async #run(strategy: ProgressSyncStrategy): Promise<void> {
    await this.idle() // don't drain a half-written enqueue
    const rows = await this.#db.outbox.toArray()
    let failures = 0
    for (const row of rows) {
      try {
        await this.#drainOne(strategy, row)
      } catch {
        // Leave the entry queued until a write is confirmed; a later drain retries it (backoff).
        failures += 1
      }
    }
    // "Synced Xm ago" reflects only a CLEAN drain — a partial/failed drain is not a reconciled state.
    if (failures === 0) this.#lastSyncedAt = this.#now()
  }

  /**
   * Reconcile one key furthest-progression-wins. Read remote THROUGH the strategy first; write back only
   * when the local position is STRICTLY further (so an already-synced or behind entry never double-writes
   * or regresses the server). The row is removed only after the decision is durable — a remove is reached
   * iff `getProgress`/`setProgress` did not throw, so a replayed drain is a no-op.
   */
  async #drainOne(strategy: ProgressSyncStrategy, row: OutboxRecord): Promise<void> {
    const entry = fromOutboxRecord(row)
    const remote = await strategy.getProgress(entry.ref)
    const localProgression = entry.locator.locations?.totalProgression ?? 0
    const remoteProgression = remote?.locations?.totalProgression ?? 0

    if (localProgression > remoteProgression) {
      // Local is further → push it (and only on a confirmed write do we drop the entry).
      await strategy.setProgress(entry.ref, entry.locator)
    }
    // remote >= local → never regress the server; the further remote position is adopted locally on the
    // next `getProgress` (read-before-write). Either branch leaves the key reconciled, so drop it.
    await this.#db.outbox.delete(keyTuple(entry.ref))
  }
}
