import type { ResourceCenter, WorkCalendar } from '../types/index.ts'
import { utcMidnightMs } from './time.ts'

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

/** Кеш індексу календаря за посиланням на масив (перф: не перебудовувати щоразу). */
const indexCache = new WeakMap<WorkCalendar[], Map<number, WorkCalendar>>()

/**
 * Indexes calendar entries by their UTC midnight timestamp for efficient day lookup.
 *
 * @param calendar - The calendar entries to index
 * @returns A map from UTC midnight timestamps to calendar entries
 */
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

/**
 * Determines the working minutes available for a calendar day.
 *
 * @param dayMs - The UTC midnight timestamp identifying the day
 * @returns The day's working minutes, or `0` when the day is unavailable or non-working
 */
function dayWorkingMinutes(map: Map<number, WorkCalendar>, dayMs: number): number {
  const entry = map.get(dayMs)
  if (!entry || !entry.isWorking || entry.workingMinutes <= 0) return 0
  return entry.workingMinutes
}

/**
 * Calculates the effective working minutes available for a resource center on a given day.
 *
 * The available time is limited by the smaller of the resource center's nominal capacity
 * and the calendar day's working minutes, then adjusted by the resource center's efficiency.
 *
 * @param rc - The resource center whose capacity and efficiency are used
 * @param date - The date to evaluate
 * @param calendar - The work calendar defining available minutes for each day
 * @returns The effective working minutes available for the resource center
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
 * Subtracts working minutes from a date while skipping non-working time and days.
 *
 * @param endAt - The date from which to subtract working minutes
 * @param minutes - The number of working minutes to subtract
 * @param calendar - The working-time calendar
 * @returns The date reached after subtracting the requested working minutes
 * @throws If the calendar is exhausted before all minutes are consumed
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
 * Adds working minutes from a starting date and time.
 *
 * @param startAt - The starting date and time.
 * @param minutes - The number of working minutes to add.
 * @param calendar - The work calendar used to determine available time.
 * @returns The date and time reached after adding the working minutes.
 * @throws Error if the calendar is exhausted before all minutes are added.
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
 * Aligns a date to the earliest available working time on or after it.
 *
 * @param date - The date to align.
 * @param calendar - The working calendar used to determine available time.
 * @returns The earliest working moment at or after `date`.
 * @throws Error if no working time is found within the calendar search limit.
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
 * Finds the start of the first working day after the day containing `date`.
 *
 * @param date - The date whose day is excluded from the search
 * @param calendar - The work calendar to search
 * @returns The UTC midnight at the start of the next working day
 * @throws Error if no working day is found within the search limit
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
 * Finds the end of the latest working window on the working day before the day containing `date`.
 *
 * @param date - The date whose preceding working day is searched
 * @param calendar - The work calendar used to identify working days
 * @returns The end of the preceding working day's working window
 * @throws Error if no preceding working day is found within the search limit
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
