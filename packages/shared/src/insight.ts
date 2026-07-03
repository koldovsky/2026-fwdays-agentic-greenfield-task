/**
 * Pure, framework-free `daily-insight` logic (TC-PURE-01): shape recent history into a compact
 * numeric summary for the model, produce a deterministic fallback sentence, and enforce the
 * output guardrails. No Nest/Prisma/RN imports. Every function is deterministic — the caller
 * passes `now` and the user's time zone so results are stable under test (FR-INSIGHT-04/05/06).
 *
 * The summary is the ENTIRE payload the LLM sees: aggregates only, never raw entries or notes.
 */
import type { DayTotal, InsightSummary, TimeEntry } from './contracts';
import { localDateKeyInTz } from './dates';
import { formatHoursShort } from './duration';
import { tagTotals } from './stats';

/** Days of history summarized for the model (FR-INSIGHT-01). */
export const INSIGHT_WINDOW_DAYS = 14;
/** Hard cap on the insight sentence length (FR-INSIGHT-05). */
export const INSIGHT_MAX_CHARS = 200;
/** Top tags included in the summary. */
const TOP_TAGS = 3;

/** Whole tracked seconds for an entry (running entries count 0). */
function trackedSec(entry: TimeEntry): number {
  return entry.durationSec ?? 0;
}

/**
 * The ordered local-day keys for the last `n` days ending at `now`, in `timeZone` (oldest
 * first). Uses calendar arithmetic (via `Date.UTC`) off the resolved local "today" so it is
 * DST-safe — we never add raw milliseconds across a day boundary.
 */
function windowKeys(now: Date, timeZone: string, n: number): string[] {
  const [y, m, d] = localDateKeyInTz(now, timeZone).split('-').map(Number);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10));
  }
  return keys;
}

/**
 * Shape a user's entries into the numeric summary fed to the insight generator. Buckets by
 * **local start day** in `timeZone` over the last {@link INSIGHT_WINDOW_DAYS} days
 * (FR-ENTRY-10, FR-INSIGHT-04). `avgPriorDaySec` is the mean of the prior days (today excluded)
 * — the reference for an "ahead/behind" read.
 */
export function buildInsightInput(
  entries: TimeEntry[],
  now: Date,
  timeZone: string,
): InsightSummary {
  const keys = windowKeys(now, timeZone, INSIGHT_WINDOW_DAYS);
  const todayDate = keys[keys.length - 1];
  const keySet = new Set(keys);

  const byDay = new Map<string, number>();
  const windowEntries: TimeEntry[] = [];
  for (const entry of entries) {
    const key = localDateKeyInTz(entry.startedAt, timeZone);
    if (!keySet.has(key)) continue;
    windowEntries.push(entry);
    byDay.set(key, (byDay.get(key) ?? 0) + trackedSec(entry));
  }

  const days: DayTotal[] = keys.map((date) => ({ date, totalSec: byDay.get(date) ?? 0 }));
  const todaySec = byDay.get(todayDate) ?? 0;
  const prior = days.slice(0, -1);
  const priorSum = prior.reduce((sum, day) => sum + day.totalSec, 0);
  const avgPriorDaySec = prior.length ? Math.round(priorSum / prior.length) : 0;
  const activeDaysPrior = prior.filter((day) => day.totalSec > 0).length;
  const topTags = tagTotals(windowEntries).slice(0, TOP_TAGS);
  const totalWindowSec = days.reduce((sum, day) => sum + day.totalSec, 0);

  return {
    timeZone,
    todayDate,
    todaySec,
    days,
    avgPriorDaySec,
    activeDaysPrior,
    topTags,
    totalWindowSec,
  };
}

/**
 * Deterministic templated insight from the summary (FR-INSIGHT-06). Always a single English
 * sentence within the guardrails, using only figures present in the summary so it survives
 * {@link sanitizeInsight}. This is what ships when the LLM is disabled, times out, or fails.
 */
export function fallbackInsight(summary: InsightSummary): string {
  const today = summary.todaySec;
  const avg = summary.avgPriorDaySec;
  const h = (sec: number): string => formatHoursShort(sec);

  if (summary.totalWindowSec === 0) {
    return 'No time tracked in the last two weeks — start a timer to begin building your rhythm.';
  }
  if (today === 0) {
    if (avg > 0) {
      return `Nothing tracked yet today — you've averaged about ${h(avg)}h a day over the past two weeks.`;
    }
    return `Nothing tracked yet today — you've logged time on ${summary.activeDaysPrior} of the last ${INSIGHT_WINDOW_DAYS} days.`;
  }
  if (avg <= 0) {
    return `You've tracked ${h(today)}h today — a strong start to your two-week stretch.`;
  }
  if (today >= avg) {
    return `You're ahead of your usual pace — ${h(today)}h today versus about ${h(avg)}h on a typical day.`;
  }
  return `You're at ${h(today)}h today, just under your usual ${h(avg)}h — plenty of time left.`;
}

// Emoji / pictographic ranges plus ZWJ and variation selectors used to join them.
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE00}-\u{FE0F}\u{200D}]/gu;
const NUMBER_RE = /\d+(?:[.,]\d+)?/g;

/** The set of numeric tokens (as strings) that may legitimately appear in an insight. */
function allowedFigures(summary: InsightSummary): Set<string> {
  const set = new Set<string>();
  const addSec = (sec: number): void => {
    set.add(formatHoursShort(sec));
    set.add(String(Math.round(sec / 3600)));
    set.add(String(Math.floor(sec / 3600)));
    set.add(String(Math.floor((sec % 3600) / 60)));
  };
  addSec(summary.todaySec);
  addSec(summary.avgPriorDaySec);
  addSec(summary.totalWindowSec);
  for (const day of summary.days) addSec(day.totalSec);
  for (const tag of summary.topTags) addSec(tag.totalSec);
  set.add(String(summary.activeDaysPrior));
  set.add(String(summary.topTags.length));
  set.add(String(INSIGHT_WINDOW_DAYS));
  set.add('7');
  return set;
}

/**
 * Enforce the output guardrails on a raw model string (FR-INSIGHT-05): strip emoji, collapse
 * whitespace, reject anything over {@link INSIGHT_MAX_CHARS}, and reject any numeric token not
 * derivable from `summary` (no invented figures). Returns the cleaned sentence, or `null` when
 * the output must be discarded in favor of the deterministic fallback.
 */
export function sanitizeInsight(raw: string, summary: InsightSummary): string | null {
  const text = raw.normalize('NFC').replace(EMOJI_RE, '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (text.length > INSIGHT_MAX_CHARS) return null;

  const allowed = allowedFigures(summary);
  const numbers = text.match(NUMBER_RE) ?? [];
  for (const n of numbers) {
    if (!allowed.has(n) && !allowed.has(n.replace(',', '.'))) return null;
  }
  return text;
}
