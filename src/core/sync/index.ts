// Core sync engine: the Strategy *context*. Owns everything server-independent — the durable
// outbox, drain scheduling, idempotent retry, and furthest-progression-wins reconciliation.
// The server-specific read/write is a connector-provided ProgressSyncStrategy (ADR-011).

import type { ProgressSyncStrategy } from '@/core/contracts'
import type { BookRef, Locator } from '@/core/model'

export interface OutboxEntry {
  ref: BookRef
  locator: Locator
  queuedAt: number
}

/** Reconciliation rule: keep the locator that is further through the publication. */
export function furthestWins(a: Locator, b: Locator): Locator {
  const pa = a.locations?.totalProgression ?? 0
  const pb = b.locations?.totalProgression ?? 0
  return pb > pa ? b : a
}

export interface SyncEngine {
  enqueue(entry: OutboxEntry): void
  /** Drain the outbox through a connector's strategy (reads remote first, then furthest-wins). */
  drain(strategy: ProgressSyncStrategy): Promise<void>
  /**
   * Epoch-ms timestamp of the last fully successful drain, or `null` if none has completed. Backs the
   * library's "Synced Xm ago" indicator. A plain number (never a `Date`) so the value stays JSON-native
   * and the native client exposes the identical shape; the *formatting* (the "Xm ago" phrase) and the
   * wall-clock `Date.now()` that produced it live in the app/platform layer, never here.
   */
  readonly lastSyncedAt: number | null
}
