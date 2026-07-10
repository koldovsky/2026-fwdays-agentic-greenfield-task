// Drain scheduling for the sync engine (sync-engine spec §"Drain scheduling"). Triggers a drain when
// connectivity is regained (`online`), on every visibility change (`visibilitychange` — both regaining
// AND losing visibility, so progress flushes before the user looks at the server elsewhere), and on
// demand via `trigger()` (the app wires the engine's `onEnqueue` here so a page turn flushes progress
// while the book is open). Debounced so a burst collapses to one attempt, and never while offline.
// Failed drains (entries still
// pending) are retried with capped exponential backoff. This lives in `platform/web` because it touches
// `window` / `document` / `navigator.onLine` — the core engine stays DOM-free. Single-flight is the
// engine's guarantee; the scheduler only decides WHEN to call `drain`.

import type { ProgressSyncStrategy } from '@/core/contracts'

/** The slice of the engine the scheduler drives. */
export interface DrainableEngine {
  drain(strategy: ProgressSyncStrategy): Promise<void>
  pendingCount(): Promise<number>
}

/** A DOM-event source (`window` / `document`), narrowed so tests can pass a fake `EventTarget`. */
interface EventSource {
  addEventListener(type: string, listener: () => void): void
  removeEventListener(type: string, listener: () => void): void
}

export interface ScheduleDrainsOptions {
  /** The `online` event source; defaults to `window`. Pass a fake `EventTarget` in tests. */
  win?: EventSource
  /** The `visibilitychange` source + visibility read; defaults to `document`. */
  doc?: EventSource & { visibilityState?: DocumentVisibilityState }
  /** Connectivity predicate; defaults to `navigator.onLine`. */
  isOnline?: () => boolean
  /** Collapse a burst of triggers into one drain. */
  debounceMs?: number
  /** First backoff delay after a drain that left entries pending. */
  backoffBaseMs?: number
  /** Cap on the exponential backoff. */
  backoffMaxMs?: number
  /** Called after each drain attempt so the app can refresh the "Synced Xm ago" indicator. */
  onDrained?: () => void
}

export interface DrainScheduler {
  /** Request a drain now (still debounced + online-gated). */
  trigger(): void
  /** Detach all listeners and cancel pending timers. */
  stop(): void
}

function defaultIsOnline(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    ? navigator.onLine
    : true
}

/**
 * Wire automatic outbox drains. `getStrategy` returns the active connector's `ProgressSyncStrategy` (or
 * `null` when no source is connected), so the scheduler stays connector-agnostic. Returns a handle whose
 * `stop()` removes everything (call it on teardown).
 */
export function scheduleDrains(
  engine: DrainableEngine,
  getStrategy: () => ProgressSyncStrategy | null,
  options: ScheduleDrainsOptions = {},
): DrainScheduler {
  const win = options.win ?? (typeof window !== 'undefined' ? window : undefined)
  const doc = options.doc ?? (typeof document !== 'undefined' ? document : undefined)
  const isOnline = options.isOnline ?? defaultIsOnline
  const debounceMs = options.debounceMs ?? 250
  const backoffBaseMs = options.backoffBaseMs ?? 5_000
  const backoffMaxMs = options.backoffMaxMs ?? 5 * 60_000

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let backoffTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0
  let stopped = false

  async function runDrain(): Promise<void> {
    if (stopped) return
    if (!isOnline()) return // no drain while offline
    const strategy = getStrategy()
    if (!strategy) return // no source connected → nothing to sync through
    await engine.drain(strategy)
    options.onDrained?.()
    if (stopped) return
    const pending = await engine.pendingCount()
    if (pending > 0) {
      // Drain left entries (failures) → retry with capped exponential backoff.
      const delay = Math.min(backoffMaxMs, backoffBaseMs * 2 ** attempt)
      attempt += 1
      if (backoffTimer) clearTimeout(backoffTimer)
      backoffTimer = setTimeout(() => void runDrain(), delay)
    } else {
      attempt = 0 // clean drain → reset backoff
      if (backoffTimer) {
        clearTimeout(backoffTimer)
        backoffTimer = null
      }
    }
  }

  function trigger(): void {
    if (stopped) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => void runDrain(), debounceMs)
  }

  const onOnline = (): void => trigger()
  // Flush on EVERY visibility change, in BOTH directions: becoming visible reconciles, and becoming
  // HIDDEN flushes pending progress before the user looks at the server elsewhere (e.g. switches to the
  // Komga tab) — the moment that, drain-on-hidden aside, would otherwise show stale progress.
  const onVisibilityChange = (): void => trigger()

  win?.addEventListener('online', onOnline)
  doc?.addEventListener('visibilitychange', onVisibilityChange)

  return {
    trigger,
    stop(): void {
      stopped = true
      win?.removeEventListener('online', onOnline)
      doc?.removeEventListener('visibilitychange', onVisibilityChange)
      if (debounceTimer) clearTimeout(debounceTimer)
      if (backoffTimer) clearTimeout(backoffTimer)
      debounceTimer = null
      backoffTimer = null
    },
  }
}
