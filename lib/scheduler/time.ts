import type { WorkCalendar } from '../types/index.ts'

/**
 * Внутрішнє представлення моменту часу — епоха-хвилини (number),
 * відповідно до правила «час усередині — хвилини». `Date` лише на межі.
 */

/** Момент → епоха-хвилини. */
export function toEpochMin(date: Date): number {
  return Math.round(date.getTime() / 60_000)
}

/** Епоха-хвилини → момент. */
export function fromEpochMin(minutes: number): Date {
  return new Date(minutes * 60_000)
}

/** Часовий інтервал у епоха-хвилинах: `[start, end)`. */
export interface TimeSlot {
  start: number
  end: number
}

/** Чи перетинаються два напіввідкриті інтервали. */
export function overlaps(a: TimeSlot, b: TimeSlot): boolean {
  return a.start < b.end && b.start < a.end
}

/** UTC-північ доби, до якої належить дата. */
export function utcMidnightMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/** Робочі дні у діапазоні `(from, to]`. */
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
