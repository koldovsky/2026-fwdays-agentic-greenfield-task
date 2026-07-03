import { describe, expect, it } from 'vitest';
import type { Tag, TimeEntry } from './contracts';
import {
  entriesInLastNDays,
  entriesOnDay,
  periodTotals,
  tagTotals,
  weeklyTotals,
} from './stats';

/** Build an entry from local wall-clock parts so tests are TZ-independent. */
function entry(
  id: string,
  start: [number, number, number, number, number],
  durationSec: number | null,
  tags: Tag[] = [],
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
    tags,
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

function tag(id: string, name: string, color: string | null = null): Tag {
  return { id, userId: 'u1', name, color };
}

// Reference "now": Sat Jun 7 2026, local noon. The 7-day window is Jun 1 … Jun 7.
const NOW = new Date(2026, 5, 7, 12, 0);
const HOUR = 3600;

describe('weeklyTotals', () => {
  it('returns 7 buckets, oldest first, all zero for no entries', () => {
    const week = weeklyTotals([], NOW);
    expect(week.map((d) => d.date)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
    ]);
    expect(week.every((d) => d.totalSec === 0)).toBe(true);
  });

  it('sums per day, ignoring running entries (count 0)', () => {
    const week = weeklyTotals(
      [
        entry('a', [2026, 6, 7, 9, 0], HOUR),
        entry('b', [2026, 6, 7, 11, 0], 2 * HOUR),
        entry('running', [2026, 6, 7, 14, 0], null),
        entry('c', [2026, 6, 5, 10, 0], HOUR),
      ],
      NOW,
    );
    const byDate = Object.fromEntries(week.map((d) => [d.date, d.totalSec]));
    expect(byDate['2026-06-07']).toBe(3 * HOUR);
    expect(byDate['2026-06-05']).toBe(HOUR);
    expect(byDate['2026-06-06']).toBe(0);
  });

  it('attributes a midnight-crossing entry to its start day', () => {
    // Starts 23:30 Jun 6 local, runs 2h into Jun 7.
    const week = weeklyTotals([entry('overnight', [2026, 6, 6, 23, 30], 2 * HOUR)], NOW);
    const byDate = Object.fromEntries(week.map((d) => [d.date, d.totalSec]));
    expect(byDate['2026-06-06']).toBe(2 * HOUR);
    expect(byDate['2026-06-07']).toBe(0);
  });

  it('excludes entries outside the 7-day window', () => {
    const week = weeklyTotals([entry('old', [2026, 5, 31, 9, 0], HOUR)], NOW);
    expect(week.every((d) => d.totalSec === 0)).toBe(true);
  });
});

describe('periodTotals', () => {
  it('computes today, week (rolling 7 days), and all-time', () => {
    const totals = periodTotals(
      [
        entry('today', [2026, 6, 7, 9, 0], 2 * HOUR),
        entry('thisWeek', [2026, 6, 3, 9, 0], HOUR),
        entry('old', [2026, 5, 31, 9, 0], 3 * HOUR), // outside week, in all-time
        entry('running', [2026, 6, 7, 15, 0], null),
      ],
      NOW,
    );
    expect(totals.todaySec).toBe(2 * HOUR);
    expect(totals.weekSec).toBe(3 * HOUR);
    expect(totals.allTimeSec).toBe(6 * HOUR);
  });

  it('weekSec equals the sum of weeklyTotals', () => {
    const entries = [
      entry('a', [2026, 6, 7, 9, 0], HOUR),
      entry('b', [2026, 6, 2, 9, 0], 2 * HOUR),
      entry('old', [2026, 5, 20, 9, 0], 5 * HOUR),
    ];
    const weekSum = weeklyTotals(entries, NOW).reduce((s, d) => s + d.totalSec, 0);
    expect(periodTotals(entries, NOW).weekSec).toBe(weekSum);
  });

  it('is all zero for no entries', () => {
    expect(periodTotals([], NOW)).toEqual({ todaySec: 0, weekSec: 0, allTimeSec: 0 });
  });
});

describe('tagTotals', () => {
  const design = tag('t1', 'Design', '#F5A300');
  const meetings = tag('t2', 'Meetings', '#5B8DEF');

  it('counts an entry toward every tag it carries, sorted by time desc', () => {
    const totals = tagTotals([
      entry('a', [2026, 6, 7, 9, 0], 3 * HOUR, [design, meetings]),
      entry('b', [2026, 6, 6, 9, 0], HOUR, [meetings]),
    ]);
    expect(totals).toEqual([
      { tagId: 't2', name: 'Meetings', color: '#5B8DEF', totalSec: 4 * HOUR },
      { tagId: 't1', name: 'Design', color: '#F5A300', totalSec: 3 * HOUR },
    ]);
  });

  it('excludes untagged entries and running entries', () => {
    const totals = tagTotals([
      entry('untagged', [2026, 6, 7, 9, 0], HOUR),
      entry('running', [2026, 6, 7, 10, 0], null, [design]),
      entry('tagged', [2026, 6, 7, 11, 0], HOUR, [design]),
    ]);
    expect(totals).toEqual([
      { tagId: 't1', name: 'Design', color: '#F5A300', totalSec: HOUR },
    ]);
  });

  it('breaks ties by name ascending', () => {
    const totals = tagTotals([
      entry('a', [2026, 6, 7, 9, 0], HOUR, [meetings]),
      entry('b', [2026, 6, 7, 10, 0], HOUR, [design]),
    ]);
    expect(totals.map((t) => t.name)).toEqual(['Design', 'Meetings']);
  });

  it('is empty for no entries', () => {
    expect(tagTotals([])).toEqual([]);
  });
});

describe('period filters', () => {
  it('entriesOnDay keeps only the current local day', () => {
    const kept = entriesOnDay(
      [
        entry('today', [2026, 6, 7, 9, 0], HOUR),
        entry('yesterday', [2026, 6, 6, 9, 0], HOUR),
      ],
      NOW,
    );
    expect(kept.map((e) => e.id)).toEqual(['today']);
  });

  it('entriesInLastNDays keeps entries within the window (inclusive of today)', () => {
    const kept = entriesInLastNDays(
      [
        entry('today', [2026, 6, 7, 9, 0], HOUR),
        entry('day7', [2026, 6, 1, 9, 0], HOUR),
        entry('old', [2026, 5, 31, 9, 0], HOUR),
      ],
      NOW,
      7,
    );
    expect(kept.map((e) => e.id).sort()).toEqual(['day7', 'today']);
  });
});
