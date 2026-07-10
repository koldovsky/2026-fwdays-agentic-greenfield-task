// Drain scheduling: triggers on `online` + `visibilitychange`, debounced, online-gated, with capped
// exponential backoff while entries remain pending. Driven against a fake event bus + fake engine under
// Vitest fake timers (no real `window`/`navigator`).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProgressSyncStrategy } from '@/core/contracts'
import { scheduleDrains, type DrainableEngine } from './sync-scheduler'

type Listen = (type: string, listener: () => void) => void

interface FakeBus {
  addEventListener: ReturnType<typeof vi.fn<Listen>>
  removeEventListener: ReturnType<typeof vi.fn<Listen>>
  dispatch(type: string): void
  visibilityState?: DocumentVisibilityState
}

function makeBus(): FakeBus {
  const listeners = new Map<string, Set<() => void>>()
  return {
    addEventListener: vi.fn<Listen>((type, listener) => {
      const set = listeners.get(type) ?? new Set()
      set.add(listener)
      listeners.set(type, set)
    }),
    removeEventListener: vi.fn<Listen>((type, listener) => {
      listeners.get(type)?.delete(listener)
    }),
    dispatch(type: string) {
      for (const listener of listeners.get(type) ?? []) listener()
    },
  }
}

const STRATEGY: ProgressSyncStrategy = {
  getProgress: async () => undefined,
  setProgress: async () => {},
}

function makeEngine(pending: number[] = [0]): DrainableEngine & {
  drain: ReturnType<typeof vi.fn>
  pendingCount: ReturnType<typeof vi.fn>
} {
  let index = 0
  return {
    drain: vi.fn().mockResolvedValue(undefined),
    pendingCount: vi.fn(async () => pending[Math.min(index++, pending.length - 1)] ?? 0),
  }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

describe('scheduleDrains', () => {
  it('drains (debounced) when the online event fires', async () => {
    const win = makeBus()
    const engine = makeEngine()
    const onDrained = vi.fn()
    scheduleDrains(engine, () => STRATEGY, {
      win,
      isOnline: () => true,
      debounceMs: 200,
      onDrained,
    })

    win.dispatch('online')
    expect(engine.drain).not.toHaveBeenCalled() // still within the debounce window
    await vi.advanceTimersByTimeAsync(200)

    expect(engine.drain).toHaveBeenCalledTimes(1)
    expect(engine.drain).toHaveBeenCalledWith(STRATEGY)
    expect(onDrained).toHaveBeenCalledTimes(1)
  })

  it('drains when the document becomes visible', async () => {
    const doc = { ...makeBus(), visibilityState: 'visible' as DocumentVisibilityState }
    const engine = makeEngine()
    scheduleDrains(engine, () => STRATEGY, { doc, isOnline: () => true, debounceMs: 100 })

    doc.dispatch('visibilitychange')
    await vi.advanceTimersByTimeAsync(100)
    expect(engine.drain).toHaveBeenCalledTimes(1)
  })

  it('flushes when the document becomes HIDDEN (push progress before the user looks at the server)', async () => {
    // The user switches to the Komga tab: this app goes hidden. We must flush the outbox THEN, not wait
    // for the next time this tab is focused — otherwise the server shows stale progress.
    const doc = { ...makeBus(), visibilityState: 'hidden' as DocumentVisibilityState }
    const engine = makeEngine()
    scheduleDrains(engine, () => STRATEGY, { doc, isOnline: () => true, debounceMs: 100 })

    doc.dispatch('visibilitychange')
    await vi.advanceTimersByTimeAsync(100)
    expect(engine.drain).toHaveBeenCalledTimes(1)
  })

  it('does not drain while offline', async () => {
    const win = makeBus()
    const engine = makeEngine()
    scheduleDrains(engine, () => STRATEGY, { win, isOnline: () => false, debounceMs: 50 })

    win.dispatch('online')
    await vi.advanceTimersByTimeAsync(50)
    expect(engine.drain).not.toHaveBeenCalled()
  })

  it('does not drain when no connector strategy is available', async () => {
    const win = makeBus()
    const engine = makeEngine()
    scheduleDrains(engine, () => null, { win, isOnline: () => true, debounceMs: 50 })

    win.dispatch('online')
    await vi.advanceTimersByTimeAsync(50)
    expect(engine.drain).not.toHaveBeenCalled()
  })

  it('retries with backoff while entries remain pending, then stops when clean', async () => {
    const win = makeBus()
    // first drain leaves 1 pending → backoff retry; the retry is clean (0 pending).
    const engine = makeEngine([1, 0])
    scheduleDrains(engine, () => STRATEGY, {
      win,
      isOnline: () => true,
      debounceMs: 10,
      backoffBaseMs: 1_000,
    })

    win.dispatch('online')
    await vi.advanceTimersByTimeAsync(10)
    expect(engine.drain).toHaveBeenCalledTimes(1) // first attempt (pending=1)

    await vi.advanceTimersByTimeAsync(1_000) // backoff fires
    expect(engine.drain).toHaveBeenCalledTimes(2) // retry (now clean)

    await vi.advanceTimersByTimeAsync(60_000) // no further retries after a clean drain
    expect(engine.drain).toHaveBeenCalledTimes(2)
  })

  it('stop() detaches listeners and cancels pending timers', async () => {
    const win = makeBus()
    const engine = makeEngine()
    const scheduler = scheduleDrains(engine, () => STRATEGY, {
      win,
      isOnline: () => true,
      debounceMs: 50,
    })

    win.dispatch('online')
    scheduler.stop() // cancel the debounce before it fires
    await vi.advanceTimersByTimeAsync(50)
    expect(engine.drain).not.toHaveBeenCalled()
    expect(win.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function))
  })
})
