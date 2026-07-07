import type { ResourceCenter, WorkCalendar } from '../types/index.ts'

/**
 * Виробничий календар: чисті функції для арифметики робочого часу.
 *
 * Модель часу (детермінована, у UTC):
 *  - День ідентифікується UTC-північчю (`Date.UTC(y, m, d)`).
 *  - Робочий день має вікно `[00:00, workingMinutes)` від UTC-півночі.
 *  - Неробочі дні (вихідні / свята / відсутні в календарі) дають 0 хвилин.
 *
 * Уся арифметика ведеться у хвилинах; `Date` лише на межі.
 */

const MS_PER_MINUTE = 60_000
const MS_PER_DAY = 86_400_000

/** Захист від нескінченних циклів (≈273 роки) — не функціональне обмеження. */
const MAX_DAY_ITERATIONS = 100_000

/** UTC-північ доби, до якої належить дата. */
function utcMidnightMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/** Кеш індексу календаря за посиланням на масив (перф: не перебудовувати щоразу). */
const indexCache = new WeakMap<WorkCalendar[], Map<number, WorkCalendar>>()

/** Індекс календаря за ключем UTC-півночі для O(1) пошуку дня. */
function indexCalendar(calendar: WorkCalendar[]): Map<number, WorkCalendar> {
  const cached = indexCache.get(calendar)
  if (cached) return cached
  const map = new Map<number, WorkCalendar>()
  for (const entry of calendar) {
    map.set(utcMidnightMs(entry.date), entry)
  }
  indexCache.set(calendar, map)
  return map
}

/** Робочі хвилини календарного дня (0 якщо неробочий / відсутній). */
function dayWorkingMinutes(map: Map<number, WorkCalendar>, dayMs: number): number {
  const entry = map.get(dayMs)
  if (!entry || !entry.isWorking || entry.workingMinutes <= 0) return 0
  return entry.workingMinutes
}

/**
 * 2.1 — Доступні робочі хвилини конкретного РЦ у заданий день.
 *
 * Враховує кількість змін і коефіцієнт ефективності (FR-RC-03).
 * Спрощення MVP: у скорочений день доступне вікно РЦ обмежується
 * меншим із {номінал РЦ, вікно календарного дня}.
 */
export function getWorkingMinutesForRc(
  rc: ResourceCenter,
  date: Date,
  calendar: WorkCalendar[],
): number {
  const map = indexCalendar(calendar)
  const dayMin = dayWorkingMinutes(map, utcMidnightMs(date))
  if (dayMin <= 0) return 0
  const nominal = rc.capacityMinPerShift * rc.shiftsPerDay
  const base = Math.min(nominal, dayMin)
  return Math.round(base * (rc.efficiencyPct / 100))
}

/**
 * 2.2 — Відняти `minutes` робочих хвилин від `endAt` назад по календарю,
 * пропускаючи неробочий час і неробочі дні (для backward scheduling).
 */
export function subtractMinutes(
  endAt: Date,
  minutes: number,
  calendar: WorkCalendar[],
): Date {
  if (minutes <= 0) return new Date(endAt.getTime())
  const map = indexCalendar(calendar)

  let remaining = minutes
  let dayMs = utcMidnightMs(endAt)
  // Для першого дня верхня межа — сам endAt; далі — кінець робочого вікна дня.
  let upperBoundMs = endAt.getTime()

  for (let i = 0; i < MAX_DAY_ITERATIONS; i++) {
    const wm = dayWorkingMinutes(map, dayMs)
    if (wm > 0) {
      const windowStart = dayMs
      const windowEnd = dayMs + wm * MS_PER_MINUTE
      const cap = Math.min(upperBoundMs, windowEnd)
      const availMin = Math.max(0, (cap - windowStart) / MS_PER_MINUTE)
      if (availMin >= remaining) {
        return new Date(cap - remaining * MS_PER_MINUTE)
      }
      remaining -= availMin
    }
    // Крок на попередній день; його верхня межа — кінець робочого вікна.
    dayMs -= MS_PER_DAY
    upperBoundMs = dayMs + MS_PER_DAY
  }
  throw new Error('subtractMinutes: calendar exhausted before minutes consumed')
}

/**
 * 2.3 — Додати `minutes` робочих хвилин до `startAt` вперед по календарю
 * (для forward scheduling).
 */
export function addMinutes(
  startAt: Date,
  minutes: number,
  calendar: WorkCalendar[],
): Date {
  if (minutes <= 0) return new Date(startAt.getTime())
  const map = indexCalendar(calendar)

  let remaining = minutes
  let dayMs = utcMidnightMs(startAt)
  // Для першого дня нижня межа — сам startAt; далі — початок робочого вікна.
  let lowerBoundMs = startAt.getTime()

  for (let i = 0; i < MAX_DAY_ITERATIONS; i++) {
    const wm = dayWorkingMinutes(map, dayMs)
    if (wm > 0) {
      const windowStart = dayMs
      const windowEnd = dayMs + wm * MS_PER_MINUTE
      const from = Math.max(lowerBoundMs, windowStart)
      const availMin = Math.max(0, (windowEnd - from) / MS_PER_MINUTE)
      if (availMin >= remaining) {
        return new Date(from + remaining * MS_PER_MINUTE)
      }
      remaining -= availMin
    }
    dayMs += MS_PER_DAY
    lowerBoundMs = dayMs
  }
  throw new Error('addMinutes: calendar exhausted before minutes placed')
}

/**
 * Найраніший робочий момент, що не раніше за `date`.
 * Якщо `date` вже всередині робочого вікна — повертає його без змін;
 * інакше — початок наступного доступного робочого вікна.
 */
export function alignToWorkingTime(date: Date, calendar: WorkCalendar[]): Date {
  const map = indexCalendar(calendar)
  let dayMs = utcMidnightMs(date)
  let lowerBoundMs = date.getTime()
  for (let i = 0; i < MAX_DAY_ITERATIONS; i++) {
    const wm = dayWorkingMinutes(map, dayMs)
    if (wm > 0) {
      const windowStart = dayMs
      const windowEnd = dayMs + wm * MS_PER_MINUTE
      const from = Math.max(lowerBoundMs, windowStart)
      if (from < windowEnd) return new Date(from)
    }
    dayMs += MS_PER_DAY
    lowerBoundMs = dayMs
  }
  throw new Error('alignToWorkingTime: no working time found in calendar')
}

/**
 * 2.4 — Початок наступного робочого дня строго після дня `date`
 * (міжопераційний час, FR-SCHED-04 / TC-ALGO-02).
 */
export function nextWorkingDayStart(date: Date, calendar: WorkCalendar[]): Date {
  const map = indexCalendar(calendar)
  let dayMs = utcMidnightMs(date) + MS_PER_DAY
  for (let i = 0; i < MAX_DAY_ITERATIONS; i++) {
    if (dayWorkingMinutes(map, dayMs) > 0) {
      return new Date(dayMs)
    }
    dayMs += MS_PER_DAY
  }
  throw new Error('nextWorkingDayStart: no working day found in calendar')
}

/**
 * Кінець робочого вікна найпізнішого робочого дня строго перед днем `date`.
 * Використовується у backward scheduling як дедлайн попередньої операції
 * маршруту (інверсія міжопераційного дня, FR-SCHED-04).
 */
export function previousWorkingDayEnd(date: Date, calendar: WorkCalendar[]): Date {
  const map = indexCalendar(calendar)
  let dayMs = utcMidnightMs(date) - MS_PER_DAY
  for (let i = 0; i < MAX_DAY_ITERATIONS; i++) {
    const wm = dayWorkingMinutes(map, dayMs)
    if (wm > 0) {
      return new Date(dayMs + wm * MS_PER_MINUTE)
    }
    dayMs -= MS_PER_DAY
  }
  throw new Error('previousWorkingDayEnd: no working day found in calendar')
}
