/**
 * Pure stats aggregation, framework-free (TC-PURE-01). Runs client-side over the flat
 * entries list because "local calendar day" depends on the device time zone (see
 * design.md); the same functions can feed `daily-insight` server-side with an explicit
 * "now". Every function takes `now` so results are deterministic under test (FR-STATS-05).
 *
 * Attribution follows FR-ENTRY-10: an entry counts entirely on its **start day**. A running
 * entry (`durationSec === null`) contributes 0 everywhere until it is stopped.
 */
import type { DayTotal, PeriodTotals, TagTotal, TimeEntry } from './contracts';
import { localDateKey } from './dates';

const WEEK_DAYS = 7;

/** Whole tracked seconds for an entry (running entries count 0). */
function trackedSec(entry: TimeEntry): number {
  return entry.durationSec ?? 0;
}

/** The local-midnight `Date` `offset` days before `now`'s local day. */
function localDay(now: Date, offset: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
}

/** The ordered set of local day keys for the last `n` days ending at `now` (oldest first). */
function windowKeys(now: Date, n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) keys.push(localDateKey(localDay(now, i)));
  return keys;
}

/**
 * Tracked seconds per local day for the **last 7 local days** (the current day and the six
 * preceding), oldest first. Days with no tracked time are `0`, keeping a stable 7-bar axis
 * (FR-STATS-02).
 */
export function weeklyTotals(entries: TimeEntry[], now: Date): DayTotal[] {
  const byDay = new Map<string, number>();
  for (const entry of entries) {
    const key = localDateKey(entry.startedAt);
    byDay.set(key, (byDay.get(key) ?? 0) + trackedSec(entry));
  }
  return windowKeys(now, WEEK_DAYS).map((date) => ({ date, totalSec: byDay.get(date) ?? 0 }));
}

/**
 * Today / this-week / all-time totals (FR-STATS-03). `weekSec` uses the same rolling
 * 7-local-day window as {@link weeklyTotals}, so it always equals that chart's sum.
 */
export function periodTotals(entries: TimeEntry[], now: Date): PeriodTotals {
  const todayKey = localDateKey(now);
  const weekKeys = new Set(windowKeys(now, WEEK_DAYS));
  let todaySec = 0;
  let weekSec = 0;
  let allTimeSec = 0;
  for (const entry of entries) {
    const sec = trackedSec(entry);
    if (sec <= 0) continue;
    allTimeSec += sec;
    const key = localDateKey(entry.startedAt);
    if (key === todayKey) todaySec += sec;
    if (weekKeys.has(key)) weekSec += sec;
  }
  return { todaySec, weekSec, allTimeSec };
}

/** Entries whose start day is the current local day. */
export function entriesOnDay(entries: TimeEntry[], now: Date): TimeEntry[] {
  const todayKey = localDateKey(now);
  return entries.filter((entry) => localDateKey(entry.startedAt) === todayKey);
}

/** Entries whose start day falls within the last `n` local days ending at `now`. */
export function entriesInLastNDays(
  entries: TimeEntry[],
  now: Date,
  n: number,
): TimeEntry[] {
  const keys = new Set(windowKeys(now, n));
  return entries.filter((entry) => keys.has(localDateKey(entry.startedAt)));
}

/**
 * Tracked seconds per tag, ordered by time descending then name (FR-STATS-04). An entry's
 * duration counts toward **every** tag it carries (so per-tag totals can exceed the period
 * total — the intended "time spent on X" reading). Untagged and running entries are excluded.
 */
export function tagTotals(entries: TimeEntry[]): TagTotal[] {
  const byTag = new Map<string, TagTotal>();
  for (const entry of entries) {
    const sec = trackedSec(entry);
    if (sec <= 0) continue;
    for (const tag of entry.tags) {
      const current = byTag.get(tag.id);
      if (current) current.totalSec += sec;
      else byTag.set(tag.id, { tagId: tag.id, name: tag.name, color: tag.color, totalSec: sec });
    }
  }
  return [...byTag.values()].sort(
    (a, b) => b.totalSec - a.totalSec || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );
}
