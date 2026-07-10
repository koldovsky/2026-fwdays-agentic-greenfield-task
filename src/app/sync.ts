// App-level offline + sync wiring: the single shared instances of the Dexie store, the OPFS byte cache,
// and the durable `SyncEngine`. The reader subscribes to the navigator's `locatorChanged` and forwards
// each position to `syncEngine().enqueue` — it NEVER calls `setProgress` directly (the per-connector sync
// invariant: the engine owns the outbox, scheduling, and furthest-progression-wins). The concrete engine,
// store, and cache all live in `platform/web`; `core/sync` owns only the neutral outbox model + policy.
//
// Lazily constructed so importing this module never opens IndexedDB at load time (Dexie opens on first
// query) — a component test that pulls this in does not touch storage until it actually reads/writes.

import type { BookRef, Locator } from '@/core/model'
import { DexieSyncEngine, EddaDb, OpfsBookCache } from '@/platform/web'

let db: EddaDb | null = null
let cache: OpfsBookCache | null = null
let engine: DexieSyncEngine | null = null

/** The shared Dexie database (download registry + progress outbox). */
export function eddaDb(): EddaDb {
  return (db ??= new EddaDb())
}

/** The shared OPFS book-byte cache (stream-to-OPFS downloads + `File.slice` range reads). */
export function opfsBookCache(): OpfsBookCache {
  return (cache ??= new OpfsBookCache())
}

/** The shared durable sync engine — the reader's `locatorChanged` hand-off sink and the drain context. */
export function syncEngine(): DexieSyncEngine {
  return (engine ??= new DexieSyncEngine(eddaDb()))
}

/**
 * The device's last-known reading position for a book — the reader's resume-on-open source and the UI's
 * progress-display fallback (book detail + library). Reads the durable LOCAL progress cache, which a sync
 * drain never clears, so a reopened book resumes where it left off even offline and even when the server
 * has no (or a coarser) position. `null` when this device has never recorded a position for the book.
 */
export function localProgress(
  ref: Pick<BookRef, 'sourceId' | 'bookId' | 'mediaType'>,
): Promise<Locator | null> {
  return syncEngine().localProgress(ref)
}

/**
 * Every locally-cached reading position, keyed `${sourceId}:${bookId}:${mediaType}` — the library's
 * "Keep reading" overlay reads this so a book read on THIS device shows progress even when the server's
 * browse feed carries none (e.g. Komga, whose catalog feed omits per-book read-progress).
 */
export function localProgressMap(): Promise<Map<string, Locator>> {
  return syncEngine().allLocalProgress()
}
