import type { WorkCalendar } from '../types/index.ts'

/**
 * Внутрішнє представлення моменту часу — епоха-хвилини (number),
 * відповідно до правила «час усередині — хвилини». `Date` лише на межі.
 */

/**
 * Converts a date to epoch minutes.
 *
 * @returns The date's Unix timestamp in minutes, rounded to the nearest minute.
 */
export function toEpochMin(date: Date): number {
  return Math.round(date.getTime() / 60_000)
}

/**
 * Converts an epoch-minute value to a date and time.
 *
 * @param minutes - The number of minutes since the Unix epoch
 * @returns The corresponding date and time
 */
export function fromEpochMin(minutes: number): Date {
  return new Date(minutes * 60_000)
}

/** Часовий інтервал у епоха-хвилинах: `[start, end)`. */
export interface TimeSlot {
  start: number
  end: number
}

/**
 * Determines whether two half-open intervals intersect.
 *
 * @param a - The first interval.
 * @param b - The second interval.
 * @returns `true` if the intervals intersect, `false` otherwise.
 */
export function overlaps(a: TimeSlot, b: TimeSlot): boolean {
  return a.start < b.end && b.start < a.end
}

/**
 * Gets the UTC timestamp for midnight at the date's UTC calendar day.
 *
 * @param date - The date whose UTC calendar day determines the midnight timestamp
 * @returns The UTC midnight timestamp in milliseconds
 */
export function utcMidnightMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/**
 * Counts working days in the interval `(from, to]`.
 *
 * @param calendar - Calendar entries used to identify working days
 * @param from - Exclusive start date
 * @param to - Inclusive end date
 * @returns The number of working calendar entries in the interval
 */
export function countWorkingDays(calendar: WorkCalendar[], from: Date, to: Date): number {
  const fromMs = utcMidnightMs(from)
  const toMs = utcMidnightMs(to)
  if (toMs <= fromMs) return 0
  let count = 0
  for (const entry of calendar) {
    if (!entry.isWorking) continue
    const d = utcMidnightMs(entry.date)
    if (d > fromMs && d <= toMs) count++
  }
  return count
}
