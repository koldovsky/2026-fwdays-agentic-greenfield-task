import { describe, expect, it } from 'vitest';
import type { InsightSummary, Tag, TimeEntry } from './contracts';
import {
  INSIGHT_MAX_CHARS,
  buildInsightInput,
  fallbackInsight,
  sanitizeInsight,
} from './insight';

const HOUR = 3600;

/** Build an entry from **UTC** wall-clock parts so bucketing is deterministic per tz. */
function entry(
  id: string,
  startUtc: [number, number, number, number, number],
  durationSec: number | null,
  tags: Tag[] = [],
): TimeEntry {
  const [y, mo, d, h, mi] = startUtc;
  const startedAt = new Date(Date.UTC(y, mo - 1, d, h, mi)).toISOString();
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

// Reference "now": Sun Jun 14 2026, 12:00 UTC. The 14-day window is Jun 1 … Jun 14.
const NOW = new Date(Date.UTC(2026, 5, 14, 12, 0));

describe('buildInsightInput', () => {
  it('produces a 14-day window (oldest first) with start-day attribution, running = 0', () => {
    const summary = buildInsightInput(
      [
        entry('today', [2026, 6, 14, 9, 0], 2 * HOUR),
        entry('running', [2026, 6, 14, 15, 0], null),
        entry('d13', [2026, 6, 13, 9, 0], HOUR),
        entry('d10', [2026, 6, 10, 9, 0], 3 * HOUR),
        entry('tooOld', [2026, 5, 30, 9, 0], 5 * HOUR), // before the window
      ],
      NOW,
      'UTC',
    );

    expect(summary.days).toHaveLength(14);
    expect(summary.days[0].date).toBe('2026-06-01');
    expect(summary.days[13].date).toBe('2026-06-14');
    expect(summary.todayDate).toBe('2026-06-14');
    expect(summary.todaySec).toBe(2 * HOUR);
    expect(summary.totalWindowSec).toBe(6 * HOUR); // 2 + 1 + 3, old one excluded
    // prior 13 days hold 4h; mean rounded.
    expect(summary.avgPriorDaySec).toBe(Math.round((4 * HOUR) / 13));
    expect(summary.activeDaysPrior).toBe(2);
  });

  it('buckets entries by the given time zone, not the runtime zone', () => {
    // 01:30 UTC on Jun 14 is still Jun 13 (18:30) in Los Angeles (PDT, UTC-7).
    const e = entry('lateNightUTC', [2026, 6, 14, 1, 30], HOUR);
    const utc = buildInsightInput([e], NOW, 'UTC');
    const la = buildInsightInput([e], NOW, 'America/Los_Angeles');

    const utcByDate = Object.fromEntries(utc.days.map((d) => [d.date, d.totalSec]));
    const laByDate = Object.fromEntries(la.days.map((d) => [d.date, d.totalSec]));
    expect(utcByDate['2026-06-14']).toBe(HOUR);
    expect(laByDate['2026-06-13']).toBe(HOUR);
    expect(laByDate['2026-06-14']).toBe(0);
  });

  it('ranks top tags over the window (max 3), counting each tag on its entry', () => {
    const design = tag('t1', 'Design', '#F5A300');
    const meet = tag('t2', 'Meetings', '#5B8DEF');
    const summary = buildInsightInput(
      [
        entry('a', [2026, 6, 14, 9, 0], 3 * HOUR, [design, meet]),
        entry('b', [2026, 6, 13, 9, 0], HOUR, [meet]),
      ],
      NOW,
      'UTC',
    );
    expect(summary.topTags.map((t) => [t.name, t.totalSec])).toEqual([
      ['Meetings', 4 * HOUR],
      ['Design', 3 * HOUR],
    ]);
  });

  it('is all-zero (and empty) for no entries', () => {
    const summary = buildInsightInput([], NOW, 'UTC');
    expect(summary.todaySec).toBe(0);
    expect(summary.totalWindowSec).toBe(0);
    expect(summary.avgPriorDaySec).toBe(0);
    expect(summary.activeDaysPrior).toBe(0);
    expect(summary.topTags).toEqual([]);
  });
});

/** A tiny summary builder for fallback/sanitize tests. */
function summaryOf(overrides: Partial<InsightSummary>): InsightSummary {
  return {
    timeZone: 'UTC',
    todayDate: '2026-06-14',
    todaySec: 0,
    days: [{ date: '2026-06-14', totalSec: 0 }],
    avgPriorDaySec: 0,
    activeDaysPrior: 0,
    topTags: [],
    totalWindowSec: 0,
    ...overrides,
  };
}

describe('fallbackInsight', () => {
  const cases: InsightSummary[] = [
    summaryOf({}), // empty history
    summaryOf({ todaySec: 0, avgPriorDaySec: 2 * HOUR, totalWindowSec: 6 * HOUR, activeDaysPrior: 3 }),
    summaryOf({ todaySec: 0, avgPriorDaySec: 0, totalWindowSec: HOUR, activeDaysPrior: 1 }),
    summaryOf({ todaySec: 3 * HOUR, avgPriorDaySec: 0, totalWindowSec: 3 * HOUR }),
    summaryOf({ todaySec: 5 * HOUR, avgPriorDaySec: 2 * HOUR, totalWindowSec: 20 * HOUR, activeDaysPrior: 6 }),
    summaryOf({ todaySec: HOUR, avgPriorDaySec: 4 * HOUR, totalWindowSec: 12 * HOUR, activeDaysPrior: 5 }),
  ];

  it('always returns a non-empty sentence that satisfies its own guardrails', () => {
    for (const s of cases) {
      const text = fallbackInsight(s);
      expect(text.length).toBeGreaterThan(0);
      expect(text.length).toBeLessThanOrEqual(INSIGHT_MAX_CHARS);
      // Deterministic + passes the guardrail pipeline (no invented figures, no emoji).
      expect(sanitizeInsight(text, s)).toBe(text);
      expect(fallbackInsight(s)).toBe(text);
    }
  });

  it('reflects ahead vs behind vs empty', () => {
    expect(fallbackInsight(summaryOf({}))).toMatch(/no time tracked/i);
    expect(
      fallbackInsight(
        summaryOf({ todaySec: 5 * HOUR, avgPriorDaySec: 2 * HOUR, totalWindowSec: 20 * HOUR }),
      ),
    ).toMatch(/ahead/i);
    expect(
      fallbackInsight(
        summaryOf({ todaySec: HOUR, avgPriorDaySec: 4 * HOUR, totalWindowSec: 12 * HOUR }),
      ),
    ).toMatch(/under/i);
  });
});

describe('sanitizeInsight', () => {
  const summary = summaryOf({
    todaySec: 2 * HOUR,
    avgPriorDaySec: HOUR,
    totalWindowSec: 6 * HOUR,
  });

  it('strips emoji and collapses whitespace', () => {
    expect(sanitizeInsight('Nice   work\n today 🎉🔥', summary)).toBe('Nice work today');
  });

  it('rejects output longer than the max', () => {
    expect(sanitizeInsight('a'.repeat(INSIGHT_MAX_CHARS + 1), summary)).toBeNull();
  });

  it('rejects fabricated figures not present in the summary', () => {
    expect(sanitizeInsight('You tracked 999 hours today', summary)).toBeNull();
  });

  it('accepts figures that come from the summary', () => {
    // 2h today is in the summary → "2" is allowed.
    expect(sanitizeInsight('You tracked 2h today', summary)).toBe('You tracked 2h today');
  });

  it('returns null for empty/whitespace-only input', () => {
    expect(sanitizeInsight('   ', summary)).toBeNull();
  });
});
