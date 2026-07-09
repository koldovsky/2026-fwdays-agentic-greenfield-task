import { describe, it, expect } from 'vitest'
import type { Order, WorkCalendar } from '../types/index.ts'
import { calcCR, sortByCR } from './critical-ratio.ts'

const MS_PER_DAY = 86_400_000

function makeCalendar(startISO: string, days: number, workingMinutes = 480): WorkCalendar[] {
  const start = new Date(startISO).getTime()
  const out: WorkCalendar[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(start + i * MS_PER_DAY)
    const dow = date.getUTCDay()
    const isWorking = dow !== 0 && dow !== 6
    out.push({ date, isWorking, workingMinutes: isWorking ? workingMinutes : 0 })
  }
  return out
}

const order = (id: string, dueISO: string): Order => ({
  id,
  productId: 'P',
  qty: 1,
  dueDate: new Date(dueISO),
})

describe('Scenario 4 — Critical Ratio priority', () => {
  const today = new Date('2026-01-05T00:00:00Z') // Monday
  const calendar = makeCalendar('2026-01-05', 14)
  // 960 min = 2 working days at 480 min/day.
  const twoDayWorkload = [{ durationMin: 480 }, { durationMin: 480 }]

  it('Order A: 5 working days to due / 2 days workload → CR 2.5', () => {
    // due Mon 2026-01-12: working days (05,12] = Tue6,Wed7,Thu8,Fri9,Mon12 = 5
    const cr = calcCR(order('A', '2026-01-12T00:00:00Z'), twoDayWorkload, today, calendar)
    expect(cr).toBeCloseTo(2.5, 10)
  })

  it('Order B: 3 working days to due / 2 days workload → CR 1.5', () => {
    // due Thu 2026-01-08: working days (05,08] = Tue6,Wed7,Thu8 = 3
    const cr = calcCR(order('B', '2026-01-08T00:00:00Z'), twoDayWorkload, today, calendar)
    expect(cr).toBeCloseTo(1.5, 10)
  })

  it('scales workload by quantity when computing CR', () => {
    const cr = calcCR(order('C', '2026-01-08T00:00:00Z'), twoDayWorkload, today, calendar, 2)
    expect(cr).toBeCloseTo(0.75, 10)
  })

  it('sorts B (lower CR) ahead of A (higher CR)', () => {
    const ops = [
      { id: 'A', cr: 2.5 },
      { id: 'B', cr: 1.5 },
    ]
    expect(sortByCR(ops).map((o) => o.id)).toEqual(['B', 'A'])
  })

  it('returns Infinity when there is no remaining work', () => {
    expect(calcCR(order('A', '2026-01-12T00:00:00Z'), [], today, calendar)).toBe(Infinity)
  })
})
