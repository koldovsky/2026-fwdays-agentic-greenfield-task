/**
 * Pure geometry and formatting helpers for the breathing ring.
 *
 * Framework-free (TC-PURE-01): no DOM, no clock. The component supplies `now`
 * and the engine's next-reminder time; these functions only do arithmetic so
 * they stay unit-testable.
 */

const MS_PER_MINUTE = 60_000;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Fraction `[0, 1]` of the current interval that has elapsed at `now`, given
 * the next-reminder time and the interval length. Clamped: a candidate clamped
 * across a window gap (remaining > interval) reads as 0; at/after due reads as 1.
 */
export function elapsedFraction(
  now: Date,
  nextReminder: Date,
  intervalMinutes: number,
): number {
  const intervalMs = intervalMinutes * MS_PER_MINUTE;
  if (intervalMs <= 0) return 0;
  const remaining = nextReminder.getTime() - now.getTime();
  return clamp01(1 - remaining / intervalMs);
}

/** SVG `stroke-dashoffset` for a progress `fraction` on a circle of `circumference`. */
export function arcOffset(fraction: number, circumference: number): number {
  return circumference * (1 - clamp01(fraction));
}

/** Milliseconds remaining until `nextReminder`, never negative. */
export function remainingMs(now: Date, nextReminder: Date): number {
  return Math.max(0, nextReminder.getTime() - now.getTime());
}

/**
 * Format a remaining duration as `M:SS`, or `H:MM:SS` once it passes an hour.
 * Uses zero-padded seconds (and minutes past the hour) for `tabular-nums`.
 */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  }
  return `${minutes}:${ss}`;
}
