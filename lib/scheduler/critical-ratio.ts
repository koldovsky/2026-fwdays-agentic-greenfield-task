import type { Order, WorkCalendar } from '../types/index.ts'

/** Мінімум трудомісткості (хв), щоб уникнути ділення на нуль. */
const EPSILON_MIN = 1e-9

/** Кількість робочих днів у діапазоні `(today, dueDate]` за календарем. */
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

/** Довжина повного робочого дня (хв) для конвертації трудомісткості у дні. */
function standardDayMinutes(calendar: WorkCalendar[]): number {
  let max = 0
  for (const entry of calendar) {
    if (entry.isWorking && entry.workingMinutes > max) max = entry.workingMinutes
  }
  return max > 0 ? max : 480
}

/**
 * 6.1 — Critical Ratio замовлення (FR-SCHED-09):
 * `CR = робочих_днів_до_дедлайну / залишкова_трудомісткість_в_днях`.
 *
 * Менший CR = вищий пріоритет. Якщо залишкової роботи немає — `Infinity`
 * (найнижчий пріоритет). Трудомісткість у днях = сумарні хвилини операцій,
 * поділені на довжину повного робочого дня.
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
 * 6.2 — Відсортувати операції за CR: менший CR — першим (вищий пріоритет,
 * FR-SCHED-09). Стабільне сортування зберігає початковий порядок для рівних CR.
 */
export function sortByCR<T extends { cr: number }>(operations: readonly T[]): T[] {
  return [...operations].sort((a, b) => a.cr - b.cr)
}
