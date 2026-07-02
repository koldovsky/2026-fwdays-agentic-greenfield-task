import { describe, expect, it, vi } from 'vitest';
import {
  createMediaGroupBuffer,
  type MediaGroupFlush,
  type Schedule,
} from '../../src/bot/mediaGroup.js';

// The media-group buffer collapses a Telegram media group (N photos sharing one media_group_id) into
// a SINGLE flush — one logPhoto → one vision call (invariant #5). It is driven by an INJECTED clock so
// the debounce is deterministic with no real timers: `tick()` fires the pending scheduled flush.

const makeClock = (): { schedule: Schedule; pending: () => number; tick: () => void } => {
  let tasks: { fn: () => void }[] = [];
  const schedule: Schedule = (fn) => {
    const task = { fn };
    tasks.push(task);
    return () => {
      tasks = tasks.filter((t) => t !== task);
    };
  };
  return {
    schedule,
    pending: () => tasks.length,
    tick: () => {
      const run = tasks;
      tasks = [];
      run.forEach((t) => t.fn());
    },
  };
};

describe('createMediaGroupBuffer', () => {
  it('collects N photos of one media group and flushes ONCE with all images + the single caption', async () => {
    const clock = makeClock();
    const buffer = createMediaGroupBuffer(clock.schedule, 400);
    const onFlush = vi.fn<(f: MediaGroupFlush) => Promise<void>>().mockResolvedValue(undefined);

    // Three photos of group 'g1' — the caption rides only the first (Telegram behavior).
    await buffer.add(7n, 'g1', 'imgA', 'protein 25g, 1 tsp sugar', onFlush);
    await buffer.add(7n, 'g1', 'imgB', '', onFlush);
    await buffer.add(7n, 'g1', 'imgC', '', onFlush);

    expect(onFlush).not.toHaveBeenCalled(); // still buffering — nothing logged yet
    expect(clock.pending()).toBe(1); // each add reset the debounce (prior timers cancelled)

    clock.tick(); // debounce elapses → the group is complete

    expect(onFlush).toHaveBeenCalledTimes(1); // ONE flush for the whole group (invariant #5)
    expect(onFlush).toHaveBeenCalledWith({
      images: ['imgA', 'imgB', 'imgC'],
      caption: 'protein 25g, 1 tsp sugar',
    });
  });

  it('keeps the caption when it arrives on a later photo of the group, not the first', async () => {
    const clock = makeClock();
    const buffer = createMediaGroupBuffer(clock.schedule, 400);
    const onFlush = vi.fn<(f: MediaGroupFlush) => Promise<void>>().mockResolvedValue(undefined);

    await buffer.add(7n, 'g2', 'imgA', '', onFlush); // no caption on the first
    await buffer.add(7n, 'g2', 'imgB', 'мой обед', onFlush); // caption on the second

    clock.tick();

    expect(onFlush).toHaveBeenCalledWith({ images: ['imgA', 'imgB'], caption: 'мой обед' });
  });

  it('flushes a lone photo (no media group) IMMEDIATELY as a one-element array — no scheduler', async () => {
    const clock = makeClock();
    const buffer = createMediaGroupBuffer(clock.schedule, 400);
    const onFlush = vi.fn<(f: MediaGroupFlush) => Promise<void>>().mockResolvedValue(undefined);

    await buffer.add(7n, undefined, 'solo', 'plate', onFlush);

    expect(onFlush).toHaveBeenCalledTimes(1); // fired without waiting for the clock
    expect(onFlush).toHaveBeenCalledWith({ images: ['solo'], caption: 'plate' });
    expect(clock.pending()).toBe(0); // nothing was scheduled
  });

  it('keeps two concurrent groups independent (each flushes its own images)', async () => {
    const clock = makeClock();
    const buffer = createMediaGroupBuffer(clock.schedule, 400);
    const flushA = vi.fn<(f: MediaGroupFlush) => Promise<void>>().mockResolvedValue(undefined);
    const flushB = vi.fn<(f: MediaGroupFlush) => Promise<void>>().mockResolvedValue(undefined);

    await buffer.add(7n, 'ga', 'a1', 'A', flushA);
    await buffer.add(7n, 'gb', 'b1', 'B', flushB);
    await buffer.add(7n, 'ga', 'a2', '', flushA);

    clock.tick();

    expect(flushA).toHaveBeenCalledWith({ images: ['a1', 'a2'], caption: 'A' });
    expect(flushB).toHaveBeenCalledWith({ images: ['b1'], caption: 'B' });
  });

  it('does not double-flush a group after it has already flushed', async () => {
    const clock = makeClock();
    const buffer = createMediaGroupBuffer(clock.schedule, 400);
    const onFlush = vi.fn<(f: MediaGroupFlush) => Promise<void>>().mockResolvedValue(undefined);

    await buffer.add(7n, 'g3', 'x', 'c', onFlush);
    clock.tick(); // first flush clears the entry
    clock.tick(); // a stray tick must not re-flush

    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it('keeps two chats that share a media_group_id separate (key scoped by chatId — invariant #8)', async () => {
    const clock = makeClock();
    const buffer = createMediaGroupBuffer(clock.schedule, 400);
    const flushA = vi.fn<(f: MediaGroupFlush) => Promise<void>>().mockResolvedValue(undefined);
    const flushB = vi.fn<(f: MediaGroupFlush) => Promise<void>>().mockResolvedValue(undefined);

    // Same 'shared' media_group_id, two different chats — Telegram ids are unique only per chat.
    await buffer.add(7n, 'shared', 'a1', 'A', flushA);
    await buffer.add(9n, 'shared', 'b1', 'B', flushB);

    clock.tick();

    // No cross-tenant merge: each chat flushes only its own image under its own callback.
    expect(flushA).toHaveBeenCalledWith({ images: ['a1'], caption: 'A' });
    expect(flushB).toHaveBeenCalledWith({ images: ['b1'], caption: 'B' });
  });
});
