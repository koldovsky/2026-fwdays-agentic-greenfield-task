import { describe, it, expect } from 'vitest'
import type {
  BomNode,
  Order,
  RcGroup,
  ResourceCenter,
  RouteOperation,
  ScheduleInput,
  ScheduledOperation,
  WorkCalendar,
} from '../types/index.ts'
import { schedule } from './index.ts'

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

const oneRcGroup = (gid: string): { group: RcGroup; rc: ResourceCenter } => ({
  group: { id: gid, name: gid, rcIds: [`${gid}-RC`] },
  rc: {
    id: `${gid}-RC`,
    groupId: gid,
    name: `${gid}-RC`,
    capacityMinPerShift: 480,
    shiftsPerDay: 1,
    efficiencyPct: 100,
    allowedOpTypes: ['generic'],
  },
})

const op = (
  nom: string,
  opNo: number,
  gid: string,
  durationMin: number,
): RouteOperation => ({
  nomenclatureId: nom,
  opNo,
  opName: `${nom}-op${opNo}`,
  opType: 'generic',
  rcGroupId: gid,
  durationMin,
})

const order = (id: string, productId: string, qty: number, dueISO: string): Order => ({
  id,
  productId,
  qty,
  dueDate: new Date(dueISO),
})

function find(ops: ScheduledOperation[], nom: string, opNo: number): ScheduledOperation | undefined {
  return ops.find((o) => o.nomenclatureId === nom && o.opNo === opNo)
}

const CALENDAR = makeCalendar('2026-01-01', 160)
const TODAY = new Date('2026-01-05T00:00:00Z')

function baseGroups(ids: string[]): { rcGroups: RcGroup[]; resourceCenters: ResourceCenter[] } {
  const rcGroups: RcGroup[] = []
  const resourceCenters: ResourceCenter[] = []
  for (const id of ids) {
    const { group, rc } = oneRcGroup(id)
    rcGroups.push(group)
    resourceCenters.push(rc)
  }
  return { rcGroups, resourceCenters }
}

describe('Scenario 1 — simple order, no deficit', () => {
  const bom: BomNode[] = [
    { parentId: null, childId: 'A', qtyPer: 1, type: 'assembly' },
    { parentId: 'A', childId: 'B', qtyPer: 1, type: 'assembly' },
    { parentId: 'A', childId: 'C', qtyPer: 1, type: 'assembly' },
    { parentId: 'B', childId: 'D', qtyPer: 1, type: 'part' },
    { parentId: 'C', childId: 'D', qtyPer: 1, type: 'part' },
  ]
  const routes: RouteOperation[] = [
    op('D', 10, 'G1', 60),
    op('D', 20, 'G2', 30),
    op('B', 10, 'G1', 45),
    op('C', 10, 'G3', 30),
    op('A', 10, 'G4', 20),
  ]
  const { rcGroups, resourceCenters } = baseGroups(['G1', 'G2', 'G3', 'G4'])
  const input: ScheduleInput = {
    orders: [order('O1', 'A', 1, '2026-01-19T00:00:00Z')],
    bom,
    routes,
    rcGroups,
    resourceCenters,
    stock: [],
    plannedReceipts: [],
    calendar: CALENDAR,
    horizon: new Date('2026-03-01T00:00:00Z'),
    today: TODAY,
  }
  const result = schedule(input, 'min-lateness')

  it('finishes on time', () => {
    expect(result.orders[0]!.delayDays).toBe(0)
    expect(result.deficits).toEqual([])
  })

  it('produces D before B and C (child-before-parent)', () => {
    const d10 = find(result.operations, 'D', 10)!
    const d20 = find(result.operations, 'D', 20)!
    const dEnd = Math.max(d10.endAt.getTime(), d20.endAt.getTime())
    const b = find(result.operations, 'B', 10)!
    const c = find(result.operations, 'C', 10)!
    expect(dEnd).toBeLessThanOrEqual(b.startAt.getTime())
    expect(dEnd).toBeLessThanOrEqual(c.startAt.getTime())
  })

  it('produces A after B and C', () => {
    const a = find(result.operations, 'A', 10)!
    const b = find(result.operations, 'B', 10)!
    const c = find(result.operations, 'C', 10)!
    expect(a.startAt.getTime()).toBeGreaterThanOrEqual(b.endAt.getTime())
    expect(a.startAt.getTime()).toBeGreaterThanOrEqual(c.endAt.getTime())
  })

  it('schedules the shared D exactly once per operation', () => {
    expect(result.operations.filter((o) => o.nomenclatureId === 'D').length).toBe(2)
  })
})

describe('Scenario 2 — backward runs into the past → forward, order is late', () => {
  const { rcGroups, resourceCenters } = baseGroups(['G1'])
  const input: ScheduleInput = {
    orders: [order('O1', 'X', 1, '2026-01-06T00:00:00Z')], // due tomorrow
    bom: [{ parentId: null, childId: 'X', qtyPer: 1, type: 'assembly' }],
    routes: [op('X', 10, 'G1', 1440)], // 3 working days of work
    rcGroups,
    resourceCenters,
    stock: [],
    plannedReceipts: [],
    calendar: CALENDAR,
    horizon: new Date('2026-03-01T00:00:00Z'),
    today: TODAY,
  }
  const result = schedule(input, 'min-lateness')

  it('marks the order late and uses a forward schedule from today', () => {
    expect(result.orders[0]!.delayDays).toBeGreaterThan(0)
    const x = find(result.operations, 'X', 10)!
    expect(x.startAt.toISOString()).toBe('2026-01-05T00:00:00.000Z')
    expect(x.endAt.toISOString()).toBe('2026-01-07T08:00:00.000Z')
  })
})

describe('Scenario 3 — material deficit blocks operations', () => {
  const { rcGroups, resourceCenters } = baseGroups(['G1'])
  const input: ScheduleInput = {
    orders: [order('O1', 'X', 2, '2026-01-19T00:00:00Z')],
    bom: [
      { parentId: null, childId: 'X', qtyPer: 1, type: 'assembly' },
      { parentId: 'X', childId: 'M', qtyPer: 5, type: 'material' },
    ],
    routes: [op('X', 10, 'G1', 60)],
    rcGroups,
    resourceCenters,
    stock: [],
    plannedReceipts: [],
    calendar: CALENDAR,
    horizon: new Date('2026-03-01T00:00:00Z'),
    today: TODAY,
  }
  const result = schedule(input, 'min-lateness')

  it('records a critical deficit for M blocking the order', () => {
    expect(result.deficits).toHaveLength(1)
    const d = result.deficits[0]!
    expect(d.nomenclatureId).toBe('M')
    expect(d.netDeficit).toBe(10)
    expect(d.earliestCoverDate).toBeNull()
    expect(d.blockedOrderIds).toEqual(['O1'])
  })

  it("marks X operations as blocked-material", () => {
    const x = find(result.operations, 'X', 10)!
    expect(x.status).toBe('blocked-material')
    expect(x.blockedByMaterialId).toBe('M')
  })
})

describe('Scenario 4 — CR resolves contention on a single RC', () => {
  // PB has 2 days of work (lower CR → higher priority); PA has 1 day.
  const { rcGroups, resourceCenters } = baseGroups(['G1'])
  const input: ScheduleInput = {
    orders: [
      order('OA', 'PA', 1, '2026-01-09T00:00:00Z'),
      order('OB', 'PB', 1, '2026-01-09T00:00:00Z'),
    ],
    bom: [
      { parentId: null, childId: 'PA', qtyPer: 1, type: 'assembly' },
      { parentId: null, childId: 'PB', qtyPer: 1, type: 'assembly' },
    ],
    routes: [op('PA', 10, 'G1', 480), op('PB', 10, 'G1', 960)],
    rcGroups,
    resourceCenters,
    stock: [],
    plannedReceipts: [],
    calendar: CALENDAR,
    horizon: new Date('2026-03-01T00:00:00Z'),
    today: TODAY,
  }
  const result = schedule(input, 'min-lateness')

  it('gives the lower-CR order (PB) the contested later slot; PA shifts earlier', () => {
    const a = find(result.operations, 'PA', 10)!
    const b = find(result.operations, 'PB', 10)!
    expect(a.rcId).toBe(b.rcId) // same single RC
    expect(b.endAt.getTime()).toBeGreaterThan(a.endAt.getTime())
    // serialized (no overlap) on the shared RC
    const overlap =
      a.startAt.getTime() < b.endAt.getTime() && b.startAt.getTime() < a.endAt.getTime()
    expect(overlap).toBe(false)
  })
})

describe('Scenario 5 — two modes satisfy the documented inequalities', () => {
  const { rcGroups, resourceCenters } = baseGroups(['G1', 'G2', 'G3'])
  const input: ScheduleInput = {
    orders: [
      order('O1', 'P1', 1, '2026-01-19T00:00:00Z'),
      order('O2', 'P2', 1, '2026-01-16T00:00:00Z'),
      order('O3', 'P3', 1, '2026-01-14T00:00:00Z'),
    ],
    bom: [
      { parentId: null, childId: 'P1', qtyPer: 1, type: 'assembly' },
      { parentId: null, childId: 'P2', qtyPer: 1, type: 'assembly' },
      { parentId: null, childId: 'P3', qtyPer: 1, type: 'assembly' },
    ],
    routes: [
      op('P1', 10, 'G1', 240),
      op('P2', 10, 'G1', 300),
      op('P3', 10, 'G1', 180),
    ],
    rcGroups,
    resourceCenters,
    stock: [],
    plannedReceipts: [],
    calendar: CALENDAR,
    horizon: new Date('2026-03-01T00:00:00Z'),
    today: TODAY,
  }
  const minLate = schedule(input, 'min-lateness')
  const minIdle = schedule(input, 'min-idle')

  it('min-lateness has no more late orders than min-idle', () => {
    expect(minLate.metrics.lateOrdersCount).toBeLessThanOrEqual(minIdle.metrics.lateOrdersCount)
  })

  it('min-idle has at least the average load of min-lateness', () => {
    expect(minIdle.metrics.avgLoadPct).toBeGreaterThanOrEqual(minLate.metrics.avgLoadPct - 1e-9)
  })
})

describe('Scenario 7 — shared detail across two orders is consolidated', () => {
  const { rcGroups, resourceCenters } = baseGroups(['G1'])
  const input: ScheduleInput = {
    orders: [
      order('O1', 'P1', 1, '2026-01-26T00:00:00Z'),
      order('O2', 'P2', 1, '2026-01-26T00:00:00Z'),
    ],
    bom: [
      { parentId: null, childId: 'P1', qtyPer: 1, type: 'assembly' },
      { parentId: null, childId: 'P2', qtyPer: 1, type: 'assembly' },
      { parentId: 'P1', childId: 'D', qtyPer: 10, type: 'part' },
      { parentId: 'P2', childId: 'D', qtyPer: 15, type: 'part' },
    ],
    routes: [op('D', 10, 'G1', 1), op('P1', 10, 'G1', 5), op('P2', 10, 'G1', 5)],
    rcGroups,
    resourceCenters,
    stock: [],
    plannedReceipts: [],
    calendar: CALENDAR,
    horizon: new Date('2026-03-01T00:00:00Z'),
    today: TODAY,
  }
  const result = schedule(input, 'min-lateness')

  it('schedules D once with consolidated quantity 25', () => {
    const dOps = result.operations.filter((o) => o.nomenclatureId === 'D')
    expect(dOps).toHaveLength(1)
    expect(dOps[0]!.durationMin).toBe(25) // 1 min/unit × (10 + 15)
  })
})

describe('Scenario 6 — performance and determinism', () => {
  function bigInput(): ScheduleInput {
    const orders: Order[] = []
    const bom: BomNode[] = []
    const routes: RouteOperation[] = []
    const groupIds = Array.from({ length: 20 }, (_, i) => `G${i}`)
    const { rcGroups, resourceCenters } = baseGroups(groupIds)
    // add a second RC per group for capacity
    for (const gid of groupIds) {
      rcGroups.find((g) => g.id === gid)!.rcIds.push(`${gid}-RC2`)
      resourceCenters.push({
        id: `${gid}-RC2`,
        groupId: gid,
        name: `${gid}-RC2`,
        capacityMinPerShift: 480,
        shiftsPerDay: 1,
        efficiencyPct: 100,
        allowedOpTypes: ['generic'],
      })
    }
    for (let i = 0; i < 1000; i++) {
      const p = `P${i}`
      const d = `Dp${i}`
      orders.push(order(`O${i}`, p, 1, '2026-02-27T00:00:00Z'))
      bom.push({ parentId: null, childId: p, qtyPer: 1, type: 'assembly' })
      bom.push({ parentId: p, childId: d, qtyPer: 2, type: 'part' })
      routes.push(op(p, 10, groupIds[i % 20]!, 10))
      routes.push(op(d, 10, groupIds[(i + 1) % 20]!, 8))
      routes.push(op(d, 20, groupIds[(i + 2) % 20]!, 6))
    }
    return {
      orders,
      bom,
      routes,
      rcGroups,
      resourceCenters,
      stock: [],
      plannedReceipts: [],
      calendar: CALENDAR,
      horizon: new Date('2026-03-01T00:00:00Z'),
      today: TODAY,
    }
  }

  it('schedules 1000 orders in well under 30 seconds', () => {
    const input = bigInput()
    const t0 = performance.now()
    const result = schedule(input, 'min-lateness')
    const elapsed = performance.now() - t0
    expect(result.operations.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(30_000)
  }, 60_000)

  it('is deterministic across identical runs', () => {
    const input = bigInput()
    const a = schedule(input, 'min-lateness')
    const b = schedule(input, 'min-lateness')
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  }, 60_000)
})
