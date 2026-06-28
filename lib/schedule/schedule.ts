/**
 * Pure reminder scheduling core.
 *
 * Every function is deterministic: the current time is always passed in as
 * `from` and never read via `new Date()` (FR-REMIND-05, TC-PURE-01). No
 * `next/*`, no `react`, no DOM globals.
 */

import type { Settings } from "../types";

const MS_PER_MINUTE = 60_000;

/**
 * Parse a `"HH:MM"` string into minutes since local midnight.
 *
 * @throws if the string is not a valid 24-hour `"HH:MM"` time.
 */
export function parseHHMM(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid "HH:MM" time: ${value}`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new Error(`Out-of-range "HH:MM" time: ${value}`);
  }
  return hours * 60 + minutes;
}

/** Minutes since local midnight for the given date (seconds ignored). */
function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** A new Date at local midnight, `dayOffset` days after `base`. */
function dayStart(base: Date, dayOffset: number): Date {
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + dayOffset,
    0,
    0,
    0,
    0,
  );
}

/** A new Date on the same calendar day as `base`, at `minutes` since midnight. */
function atMinutes(base: Date, minutes: number): Date {
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
    0,
    0,
  );
}

/**
 * Clamp a candidate time into the next valid working window.
 *
 * The working window is half-open `[workStart, workEnd)` on a working day
 * (FR-REMIND-02). A candidate before `workStart` snaps forward to `workStart`;
 * a candidate at/after `workEnd` or on a non-working day moves to the start of
 * the next working day's window (FR-REMIND-03).
 *
 * Returns `null` when there are no working days (degenerate config).
 */
function clampToWindow(settings: Settings, candidate: Date): Date | null {
  const workingDays = settings.workingDays;
  if (workingDays.length === 0) {
    return null;
  }

  const startMin = parseHHMM(settings.workStart);
  const endMin = parseHHMM(settings.workEnd);

  // Search the candidate's day, then each following day for up to a full week.
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const probe = dayOffset === 0 ? candidate : dayStart(candidate, dayOffset);
    if (!workingDays.includes(probe.getDay())) {
      continue;
    }

    if (dayOffset === 0) {
      const candMin = minutesOfDay(candidate);
      if (candMin < startMin) {
        // Before the window opens today: snap to workStart.
        return atMinutes(candidate, startMin);
      }
      if (candMin < endMin) {
        // Inside today's window: keep the candidate as-is.
        return candidate;
      }
      // At/after workEnd: today is done, roll to a later working day.
      continue;
    }

    // First reachable later working day: open at workStart.
    return atMinutes(probe, startMin);
  }

  return null;
}

/**
 * Compute the next reminder time: `from + intervalMinutes`, clamped into the
 * next valid working window (FR-REMIND-01, FR-REMIND-03).
 *
 * @returns the next reminder `Date`, or `null` when reminders are disabled.
 */
export function computeNextReminder(settings: Settings, from: Date): Date | null {
  if (!settings.enabled) {
    return null;
  }
  const candidate = new Date(from.getTime() + settings.intervalMinutes * MS_PER_MINUTE);
  return clampToWindow(settings, candidate);
}

/**
 * Compute the snoozed reminder time: `from + snoozeMinutes`, clamped by the
 * same window rule as {@link computeNextReminder} (FR-REMIND-04).
 *
 * @returns the snoozed reminder `Date`, or `null` when reminders are disabled.
 */
export function computeSnooze(settings: Settings, from: Date): Date | null {
  if (!settings.enabled) {
    return null;
  }
  const candidate = new Date(from.getTime() + settings.snoozeMinutes * MS_PER_MINUTE);
  return clampToWindow(settings, candidate);
}
