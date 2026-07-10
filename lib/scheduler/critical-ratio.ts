import type { Order, WorkCalendar } from '../types/index.ts'

/** Мінімум трудомісткості (хв), щоб уникнути ділення на нуль. */
const EPSILON_MIN = 1e-9

/**
 * Counts calendar-designated working days between today and the due date.
 *
 * @param today - The start date, excluded from the interval.
 * @param dueDate - The end date, included in the interval.
 * @param calendar - Calendar entries used to identify working days.
 * @returns The number of working days in the interval `(today, dueDate]`.
 */
function workingDaysToDeadline(today: Date, dueDate: Date, calendar: WorkCalendar[]): number {
  const from = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const to = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate())
  let count = 0
  for (const entry of calendar) {
    if (!entry.isWorking) continue
    const d = Date.UTC(
      entry.date.getUTCFullYear(),
      entry.date.getUTCMonth(),
      entry.date.getUTCDate(),
    )
    if (d > from && d <= to) count++
  }
  return count
}

/**
 * Determines the standard working-day duration for converting workload into days.
 *
 * @param calendar - The work calendar used to determine the longest working day
 * @returns The maximum positive working-day duration in minutes, or `480` when the calendar has no positive working duration
 */
function standardDayMinutes(calendar: WorkCalendar[]): number {
  let max = 0
  for (const entry of calendar) {
    if (entry.isWorking && entry.workingMinutes > max) max = entry.workingMinutes
  }
  return max > 0 ? max : 480
}

/**
 * Обчислює коефіцієнт критичного співвідношення (CR) для замовлення.
 *
 * Менше значення CR відповідає вищому пріоритету. Якщо залишкова трудомісткість
 * замовлення відсутня, повертає `Infinity`.
 *
 * @param order - Замовлення з установленим дедлайном
 * @param remainingOps - Операції, що залишилися, із тривалістю в хвилинах
 * @param today - Поточна дата
 * @param calendar - Календар робочих і неробочих днів
 * @param quantity - Кількість виробів у замовленні
 * @returns Відношення робочих днів до дедлайну до залишкової трудомісткості в днях
 */
export function calcCR(
  order: Order,
  remainingOps: readonly { durationMin: number }[],
  today: Date,
  calendar: WorkCalendar[],
  quantity = 1,
): number {
  const dueDays = workingDaysToDeadline(today, order.dueDate, calendar)
  const totalMin = remainingOps.reduce((sum, op) => sum + op.durationMin * quantity, 0)
  if (totalMin <= EPSILON_MIN) return Infinity
  const workloadDays = totalMin / standardDayMinutes(calendar)
  return dueDays / workloadDays
}

/**
 * Orders operations by increasing critical ratio.
 *
 * @param operations - The operations to sort.
 * @returns A new array sorted from the lowest critical ratio to the highest.
 */
export function sortByCR<T extends { cr: number }>(operations: readonly T[]): T[] {
  return [...operations].sort((a, b) => a.cr - b.cr)
}
