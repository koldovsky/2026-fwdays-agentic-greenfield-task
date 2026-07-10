import { describe, it, expect } from 'vitest'
import type {
  MaterialDeficit,
  Order,
  OrderResult,
  ScheduledOperation,
  WorkCalendar,
} from '../types/index.ts'
import { buildBomTree, buildOrderDashboard } from './build.ts'

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

const CAL = makeCalendar('2026-01-01', 30)

const order = (id: string, productId: string, dueISO: string): Order => ({
  id,
  productId,
  qty: 1,
  dueDate: new Date(dueISO),
})

const result = (orderId: string, readyISO: string, delayDays: number): OrderResult => ({
  orderId,
  plannedReadyDate: new Date(readyISO),
  delayDays,
  criticalPath: [],
})

const orders = [
  order('O1', 'P1', '2026-01-19T00:00:00Z'),
  order('O2', 'P2', '2026-01-08T00:00:00Z'),
  order('O3', 'P3', '2026-01-10T00:00:00Z'),
  order('O4', 'P4', '2026-01-19T00:00:00Z'),
]
const orderResults = [
  result('O1', '2026-01-12T00:00:00Z', 0), // slack 5 → on-schedule
  result('O2', '2026-01-07T00:00:00Z', 0), // slack 1 → at-risk
  result('O3', '2026-01-16T00:00:00Z', 4), // late
  result('O4', '2026-01-19T00:00:00Z', 0), // blocked
]
const deficits: MaterialDeficit[] = [
  {
    nomenclatureId: 'M',
    grossNeed: 10,
    stock: 0,
    plannedReceipts: 0,
    netDeficit: 10,
    earliestCoverDate: null,
    blockedOrderIds: ['O4'],
  },
]

describe('Scenario A — derived order statuses (FR-ORD-02)', () => {
  const { rows } = buildOrderDashboard({ orders, orderResults, deficits, calendar: CAL })
  const byId = new Map(rows.map((r) => [r.orderId, r]))

  it('assigns on-schedule / at-risk / late / blocked-material', () => {
    expect(byId.get('O1')!.status).toBe('on-schedule')
    expect(byId.get('O2')!.status).toBe('at-risk')
    expect(byId.get('O3')!.status).toBe('late')
    expect(byId.get('O4')!.status).toBe('blocked-material')
  })
})

describe('Scenario B — default sort and summary (FR-ORD-04/05)', () => {
  const { rows, summary } = buildOrderDashboard({ orders, orderResults, deficits, calendar: CAL })

  it('sorts by delay desc, then status severity, then id', () => {
    expect(rows.map((r) => r.orderId)).toEqual(['O3', 'O4', 'O2', 'O1'])
  })

  it('summarises counts by status', () => {
    expect(summary).toEqual({ total: 4, onSchedule: 1, atRisk: 1, late: 1, blocked: 1 })
  })
})

describe('Scenario C — expandable BOM tree with dates and statuses (FR-ORD-03)', () => {
  const so = (
    bomNodeId: string,
    opNo: number,
    startISO: string,
    endISO: string,
    status: ScheduledOperation['status'],
  ): ScheduledOperation => ({
    orderId: 'O1',
    bomNodeId,
    nomenclatureId: bomNodeId.split('/').pop()!.replace(/^O1#/, ''),
    opNo,
    opName: `op${opNo}`,
    rcGroupId: 'G1',
    rcId: 'RC-1',
    startAt: new Date(startISO),
    endAt: new Date(endISO),
    durationMin: 60,
    status,
  })

  const ops: ScheduledOperation[] = [
    so('O1#A/B/D', 10, '2026-01-05T00:00:00Z', '2026-01-05T01:00:00Z', 'ok'),
    so('O1#A/B/D', 20, '2026-01-05T02:00:00Z', '2026-01-05T03:00:00Z', 'at-risk'),
    so('O1#A/B', 10, '2026-01-06T00:00:00Z', '2026-01-06T00:45:00Z', 'ok'),
    so('O1#A', 10, '2026-01-07T00:00:00Z', '2026-01-07T00:20:00Z', 'late'),
  ]

  const roots = buildBomTree(ops, 'O1')

  it('reconstructs the nested tree from bomNodeId paths', () => {
    expect(roots).toHaveLength(1)
    const a = roots[0]!
    expect(a.bomNodeId).toBe('O1#A')
    expect(a.level).toBe(0)
    const b = a.children[0]!
    expect(b.bomNodeId).toBe('O1#A/B')
    expect(b.level).toBe(1)
    const d = b.children[0]!
    expect(d.bomNodeId).toBe('O1#A/B/D')
    expect(d.level).toBe(2)
  })

  it('computes planned dates and worst status per node', () => {
    const d = roots[0]!.children[0]!.children[0]!
    expect(d.plannedStart.toISOString()).toBe('2026-01-05T00:00:00.000Z')
    expect(d.plannedEnd.toISOString()).toBe('2026-01-05T03:00:00.000Z')
    expect(d.status).toBe('at-risk') // worst of ok + at-risk
    expect(roots[0]!.status).toBe('late') // node A op is late
    expect(roots[0]!.children[0]!.status).toBe('on-schedule')
  })

  it('returns empty for an unknown order', () => {
    expect(buildBomTree(ops, 'NOPE')).toEqual([])
  })
})
