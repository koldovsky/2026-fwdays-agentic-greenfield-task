import { describe, expect, it } from 'vitest';
import type { TimeEntry } from './contracts';
import { groupEntriesByDay } from './timeEntries';

/** Build a completed entry from local wall-clock parts so tests are TZ-independent. */
function entry(
  id: string,
  start: [number, number, number, number, number],
  durationSec: number | null,
): TimeEntry {
  const [y, mo, d, h, mi] = start;
  const startedAt = new Date(y, mo - 1, d, h, mi).toISOString();
  const stoppedAt =
    durationSec === null
      ? null
      : new Date(new Date(startedAt).getTime() + durationSec * 1000).toISOString();
  return {
    id,
    userId: 'u1',
    note: id,
    startedAt,
    stoppedAt,
    durationSec,
    tags: [],
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

describe('groupEntriesByDay', () => {
  it('returns [] for no entries', () => {
    expect(groupEntriesByDay([])).toEqual([]);
  });

  it('orders days newest first and entries newest start first within a day', () => {
    const groups = groupEntriesByDay([
      entry('a', [2026, 6, 1, 9, 0], 3600),
      entry('c', [2026, 6, 2, 8, 0], 1800),
      entry('b', [2026, 6, 1, 14, 0], 1200),
    ]);
    expect(groups.map((g) => g.date)).toEqual(['2026-06-02', '2026-06-01']);
    expect(groups[1].entries.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('sums per-day totals, treating running entries as 0', () => {
    const groups = groupEntriesByDay([
      entry('a', [2026, 6, 1, 9, 0], 3600),
      entry('b', [2026, 6, 1, 14, 0], 1200),
      entry('running', [2026, 6, 1, 16, 0], null),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].totalSec).toBe(4800);
    expect(groups[0].entries).toHaveLength(3);
  });

  it('attributes a midnight-crossing entry to its start day', () => {
    // Starts 23:30 Jun 1 local, runs 2h into Jun 2.
    const groups = groupEntriesByDay([entry('overnight', [2026, 6, 1, 23, 30], 2 * 3600)]);
    expect(groups.map((g) => g.date)).toEqual(['2026-06-01']);
    expect(groups[0].totalSec).toBe(7200);
  });
});
