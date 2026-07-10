import { describe, it, expect } from 'vitest'
import type { ResourceCenter, WorkCalendar } from '../types/index.ts'
import {
  getWorkingMinutesForRc,
  subtractMinutes,
  addMinutes,
  nextWorkingDayStart,
} from './calendar.ts'

const MS_PER_DAY = 86_400_000

/**
 * Побудувати календар на `days` днів від `startISO` (включно).
 * Субота/неділя (UTC) — неробочі; додаткові неробочі дати — через `holidays`.
 */
function makeCalendar(
  startISO: string,
  days: number,
  opts: { workingMinutes?: number; holidays?: string[] } = {},
): WorkCalendar[] {
  const workingMinutes = opts.workingMinutes ?? 480
  const holidays = new Set(opts.holidays ?? [])
  const start = new Date(startISO).getTime()
  const out: WorkCalendar[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(start + i * MS_PER_DAY)
    const dow = date.getUTCDay()
    const key = date.toISOString().slice(0, 10)
    const isWeekend = dow === 0 || dow === 6
    const isWorking = !isWeekend && !holidays.has(key)
    out.push({ date, isWorking, workingMinutes: isWorking ? workingMinutes : 0 })
  }
  return out
}

const rc = (over: Partial<ResourceCenter> = {}): ResourceCenter => ({
  id: 'RC-1',
  groupId: 'G-1',
  name: 'RC 1',
  capacityMinPerShift: 480,
  shiftsPerDay: 1,
  efficiencyPct: 100,
  allowedOpTypes: ['turning'],
  ...over,
})

describe('getWorkingMinutesForRc', () => {
  const calendar = makeCalendar('2026-01-01', 31)

  it('returns full capacity on a working day', () => {
    expect(getWorkingMinutesForRc(rc(), new Date('2026-01-05'), calendar)).toBe(480)
  })

  it('returns 0 on a weekend', () => {
    expect(getWorkingMinutesForRc(rc(), new Date('2026-01-03'), calendar)).toBe(0)
  })

  it('applies efficiency coefficient', () => {
    expect(
      getWorkingMinutesForRc(rc({ efficiencyPct: 90 }), new Date('2026-01-05'), calendar),
    ).toBe(432)
  })

  it('caps multi-shift nominal by the calendar day window (shortened-day rule)', () => {
    expect(
      getWorkingMinutesForRc(rc({ shiftsPerDay: 2 }), new Date('2026-01-05'), calendar),
    ).toBe(480)
  })
})

describe('subtractMinutes', () => {
  it('crosses a single weekend boundary', () => {
    const calendar = makeCalendar('2026-01-01', 31)
    // Mon 2026-01-05 04:00Z − 480 min: 240 min back to Mon 00:00,
    // skip Sun/Sat, remaining 240 min consumed from Fri window end.
    const result = subtractMinutes(new Date('2026-01-05T04:00:00Z'), 480, calendar)
    expect(result.toISOString()).toBe('2026-01-02T04:00:00.000Z')
  })

  it('crosses several consecutive non-working days (holiday block)', () => {
    // Jan 6,7,8 are holidays (Tue-Thu). Fri 09 08:00Z − 600 min:
    // 480 from Fri, skip Thu/Wed/Tue holidays, remaining 120 from Mon 05.
    const calendar = makeCalendar('2026-01-01', 31, {
      holidays: ['2026-01-06', '2026-01-07', '2026-01-08'],
    })
    const result = subtractMinutes(new Date('2026-01-09T08:00:00Z'), 600, calendar)
    expect(result.toISOString()).toBe('2026-01-05T06:00:00.000Z')
  })

  it('returns the same instant for zero minutes', () => {
    const calendar = makeCalendar('2026-01-01', 31)
    const d = new Date('2026-01-05T03:00:00Z')
    expect(subtractMinutes(d, 0, calendar).toISOString()).toBe(d.toISOString())
  })
})

describe('addMinutes', () => {
  it('spans a weekend forward', () => {
    const calendar = makeCalendar('2026-01-01', 31)
    // Fri 2026-01-02 06:00Z + 240 min: 120 min to Fri 08:00,
    // skip weekend, remaining 120 from Mon 00:00 → Mon 02:00.
    const result = addMinutes(new Date('2026-01-02T06:00:00Z'), 240, calendar)
    expect(result.toISOString()).toBe('2026-01-05T02:00:00.000Z')
  })

  it('returns the same instant for zero minutes', () => {
    const calendar = makeCalendar('2026-01-01', 31)
    const d = new Date('2026-01-05T03:00:00Z')
    expect(addMinutes(d, 0, calendar).toISOString()).toBe(d.toISOString())
  })
})

describe('nextWorkingDayStart', () => {
  const calendar = makeCalendar('2026-01-01', 31)

  it('skips the weekend when the current day is Saturday', () => {
    const result = nextWorkingDayStart(new Date('2026-01-03T10:00:00Z'), calendar)
    expect(result.toISOString()).toBe('2026-01-05T00:00:00.000Z')
  })

  it('moves from Friday to Monday', () => {
    const result = nextWorkingDayStart(new Date('2026-01-02T12:00:00Z'), calendar)
    expect(result.toISOString()).toBe('2026-01-05T00:00:00.000Z')
  })

  it('returns the very next day when it is a working day', () => {
    const result = nextWorkingDayStart(new Date('2026-01-05T09:00:00Z'), calendar)
    expect(result.toISOString()).toBe('2026-01-06T00:00:00.000Z')
  })
})
