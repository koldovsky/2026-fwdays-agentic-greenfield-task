/**
 * API type contracts shared between `apps/api` (producer) and `apps/mobile`
 * (consumer). Framework-free — no Nest, Prisma, or RN imports here. These are the
 * single source of truth for request/response shapes; never duplicate them in an app.
 */

/** A user-defined label for grouping/filtering entries (FR-TAG-01). */
export interface Tag {
  id: string;
  /** Owning user's id (BC-SCOPE-01). */
  userId: string;
  name: string;
  /** Optional hex color for the tag's dot; null for a neutral dot. */
  color: string | null;
}

/** Payload to create a tag. */
export interface CreateTag {
  name: string;
  color?: string | null;
}

/** Payload to edit a tag; every field optional. */
export interface UpdateTag {
  name?: string;
  color?: string | null;
}

/** A single tracked time entry, owned by one user. `durationSec` is null while running. */
export interface TimeEntry {
  id: string;
  /** Owning user's id (BC-SCOPE-01). */
  userId: string;
  /** Free-text note about what the user is doing. */
  note: string;
  /** ISO 8601 start timestamp. */
  startedAt: string;
  /** ISO 8601 stop timestamp, or null while running. */
  stoppedAt: string | null;
  /** Elapsed seconds once stopped, or null while running. */
  durationSec: number | null;
  /** Tags assigned to this entry (FR-TAG-02). */
  tags: Tag[];
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-update timestamp. */
  updatedAt: string;
}

/** Payload to start a new timer. Starting stops any running entry first (FR-ENTRY-03). */
export interface CreateTimeEntry {
  note: string;
  /** Optional explicit start; defaults to server "now" when omitted. */
  startedAt?: string;
  /** Ids of the user's tags to assign (FR-TAG-02). */
  tagIds?: string[];
}

/** Payload to add a completed manual entry with explicit times (FR-ENTRY-04). */
export interface ManualTimeEntry {
  note: string;
  /** ISO 8601 start timestamp. */
  startedAt: string;
  /** ISO 8601 stop timestamp; MUST be after `startedAt`. */
  stoppedAt: string;
  /** Ids of the user's tags to assign (FR-TAG-02). */
  tagIds?: string[];
}

/** Payload to edit an existing entry; every field optional (FR-ENTRY-05). */
export interface UpdateTimeEntry {
  note?: string;
  /** ISO 8601 start timestamp. */
  startedAt?: string;
  /** ISO 8601 stop timestamp. */
  stoppedAt?: string;
  /** Ids of the user's tags to set; omit to leave unchanged, `[]` to clear (FR-TAG-02). */
  tagIds?: string[];
}

/** Payload to stop a running timer. */
export interface StopTimeEntry {
  /** Optional explicit stop; defaults to server "now" when omitted. */
  stoppedAt?: string;
}

/** Aggregated total for a single day, used by the Stats screen. */
export interface DayTotal {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  totalSec: number;
}

/** Tracked-time total for a single tag, used by the Stats per-tag breakdown (FR-STATS-04). */
export interface TagTotal {
  tagId: string;
  name: string;
  /** The tag's dot color, or null for a neutral dot. */
  color: string | null;
  totalSec: number;
}

/** Today / this-week / all-time totals, used by the Stats screen (FR-STATS-03). */
export interface PeriodTotals {
  /** Tracked seconds on the current local day. */
  todaySec: number;
  /** Tracked seconds over the last 7 local days (matches the weekly chart). */
  weekSec: number;
  /** Tracked seconds across all stopped entries. */
  allTimeSec: number;
}

/**
 * Pre-computed numeric summary of recent history, shaped in the user's local time zone and
 * fed to the LLM (and the deterministic fallback) for `daily-insight`. Contains only
 * aggregates — never raw entries or note text (FR-INSIGHT-04).
 */
export interface InsightSummary {
  /** Resolved IANA zone the days were bucketed in. */
  timeZone: string;
  /** The current local day (YYYY-MM-DD) in `timeZone`. */
  todayDate: string;
  /** Tracked seconds on the current local day. */
  todaySec: number;
  /** Tracked seconds per local day for the last 14 days, oldest first. */
  days: DayTotal[];
  /** Mean tracked seconds over the prior 13 days (excludes today), rounded. */
  avgPriorDaySec: number;
  /** How many of the prior 13 days had any tracked time. */
  activeDaysPrior: number;
  /** Top tags by tracked time over the window (at most 3). */
  topTags: TagTotal[];
  /** Total tracked seconds across the 14-day window. */
  totalWindowSec: number;
}

/**
 * A generated (or fallback) daily insight returned to the client. `source` distinguishes
 * model output from the deterministic fallback (FR-INSIGHT-06).
 */
export interface DailyInsight {
  /** The insight sentence (≤ 200 chars, English, no emojis — FR-INSIGHT-05). */
  text: string;
  /** Whether the sentence came from the LLM or the deterministic fallback. */
  source: 'llm' | 'fallback';
  /** The local day (YYYY-MM-DD) this insight is for. */
  localDate: string;
  /** ISO 8601 timestamp of when it was generated/cached. */
  createdAt: string;
}

/** Health/readiness response. */
export interface HealthStatus {
  status: 'ok';
  service: string;
  time: string;
}
