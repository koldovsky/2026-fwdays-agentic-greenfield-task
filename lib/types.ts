/**
 * Shared domain types for the break reminder.
 *
 * These live in the framework-free core (`lib/`) so every capability — the
 * reminder engine, settings persistence, stats — depends on one definition
 * (TC-PURE-01).
 */

/**
 * User-configurable reminder settings. Times are local wall-clock `"HH:MM"`
 * strings; the working window is half-open `[workStart, workEnd)`.
 */
export type SoundChoice = "ping" | "melody-10" | "melody-30";

export interface Settings {
  /** Local start of the working window, `"HH:MM"` (inclusive). */
  workStart: string;
  /** Local end of the working window, `"HH:MM"` (exclusive). */
  workEnd: string;
  /**
   * Weekday numbers that count as working days, using `Date.getDay()`
   * semantics: 0 = Sunday … 6 = Saturday.
   */
  workingDays: number[];
  /** Minutes between reminders. */
  intervalMinutes: number;
  /** Minutes added when the user snoozes. */
  snoozeMinutes: number;
  /** Whether reminders are active. When false the engine returns `null`. */
  enabled: boolean;
  /** Whether a short sound plays with a notification. */
  soundEnabled: boolean;
  /** Which local reminder sound plays when sound is enabled. */
  soundChoice: SoundChoice;
}

/** A recorded break action, persisted to IndexedDB (the `events` table). */
export interface BreakEvent {
  /** Auto-increment primary key, assigned by Dexie on insert. */
  id?: number;
  /** Whether the user took the break or snoozed it. */
  type: "done" | "snoozed";
  /** When the action happened, as epoch milliseconds. */
  timestamp: number;
}

/** Done/snoozed counts for a single local calendar day. */
export interface DayStats {
  /** Local day key, `"YYYY-MM-DD"`. */
  day: string;
  done: number;
  snoozed: number;
}

/** Aggregated break statistics over a range. */
export interface StatsSummary {
  done: number;
  snoozed: number;
  /** Per-day breakdown, only for days that have at least one event, sorted ascending. */
  byDay: DayStats[];
}

/** A half-open time range `[start, end)`. */
export interface DateRange {
  start: Date;
  /** Exclusive upper bound. */
  end: Date;
}
