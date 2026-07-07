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
