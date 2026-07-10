import { describe, it, expect } from 'vitest'
import type {
  CapacitySlot,
  MaterialDeficit,
  Order,
  OrderResult,
  WorkCalendar,
} from '../types/index.ts'
import { buildOverview } from './build.ts'

const MS_PER_DAY = 86_400_000

function makeCalendar(startISO: string, days: number): WorkCalendar[] {
  const start = new Date(startISO).getTime()
  const out: WorkCalendar[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(start + i * MS_PER_DAY)
    const dow = date.getUTCDay()
    const isWorking = dow !== 0 && dow !== 6
    out.push({ date, isWorking, workingMinutes: isWorking ? 480 : 0 })
  }
  return out
}

const CAL = makeCalendar('2026-01-01', 40)

const order = (id: string): Order => ({
  id,
  productId: `P${id}`,
  qty: 1,
  dueDate: new Date('2026-01-15T00:00:00Z'),
})

const result = (id: string, delayDays: number): OrderResult => ({
  orderId: id,
  plannedReadyDate: new Date('2026-01-20T00:00:00Z'),
  delayDays,
  criticalPath: [],
})

const slot = (rcId: string, dateISO: string, loadPct: number): CapacitySlot => ({
  rcId,
  date: new Date(dateISO),
  usedMin: 0,
  totalMin: 480,
  loadPct,
})

describe('Scenario A — status counts and top-5 delays (FR-DASH-01)', () => {
  const orders = ['O1', 'O2', 'O3', 'O4', 'O5', 'O6'].map(order)
  const orderResults = [
    result('O1', 5),
    result('O2', 3),
    result('O3', 0),
    result('O4', 2),
    result('O5', 7),
    result('O6', 1),
  ]
  const view = buildOverview({ orders, orderResults, deficits: [], capacity: [], calendar: CAL })

  it('summarises status counts for all orders', () => {
    expect(view.statusCounts.total).toBe(6)
    expect(view.statusCounts.late).toBe(5) // O3 (delay 0) is not late
  })

  it('takes the top-5 delayed orders, sorted descending', () => {
    expect(view.topDelays.map((r) => r.orderId)).toEqual(['O5', 'O1', 'O2', 'O4', 'O6'])
    expect(view.topDelays.every((r) => r.delayDays > 0)).toBe(true)
  })
})

describe('Scenario B — critical deficits block (FR-DASH-01)', () => {
  const deficits: MaterialDeficit[] = [
    {
      nomenclatureId: 'M',
      grossNeed: 10,
      stock: 0,
      plannedReceipts: 0,
      netDeficit: 10,
      earliestCoverDate: null,
      blockedOrderIds: ['O1'],
    },
    {
      nomenclatureId: 'N',
      grossNeed: 5,
      stock: 0,
      plannedReceipts: 3,
      netDeficit: 2,
      earliestCoverDate: new Date('2026-01-15T00:00:00Z'),
      blockedOrderIds: ['O2'],
    },
  ]

  it('lists only uncovered (critical) materials', () => {
    const view = buildOverview({
      orders: [],
      orderResults: [],
      deficits,
      capacity: [],
      calendar: CAL,
    })
    expect(view.criticalDeficits.map((d) => d.nomenclatureId)).toEqual(['M'])
  })
})

describe('Scenario C — overloaded cells block (FR-DASH-01)', () => {
  const capacity = [
    slot('RC-1', '2026-01-05', 120),
    slot('RC-2', '2026-01-05', 80),
    slot('RC-3', '2026-01-05', 150),
    slot('RC-4', '2026-01-05', 100),
  ]

  it('keeps only slots above 100%, sorted descending', () => {
    const view = buildOverview({
      orders: [],
      orderResults: [],
      deficits: [],
      capacity,
      calendar: CAL,
    })
    expect(view.overloadedCells.map((c) => c.loadPct)).toEqual([150, 120])
    expect(view.overloadedCells.map((c) => c.rcId)).toEqual(['RC-3', 'RC-1'])
  })
})
