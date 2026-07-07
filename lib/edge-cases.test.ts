import { describe, it, expect } from 'vitest'
import type {
  BomNode,
  ExpandedNode,
  Order,
  RcGroup,
  ResourceCenter,
  RouteOperation,
  ScheduledOperation,
  ScheduleInput,
  WorkCalendar,
} from './types/index.ts'
import { expandBom } from './bom/expand.ts'
import { findSharedNodes } from './bom/shared-nodes.ts'
import { calcGrossRequirements } from './mrp/gross-requirements.ts'
import { buildMaterialDeficits } from './mrp/net-requirements.ts'
import {
  addMinutes,
  alignToWorkingTime,
  getWorkingMinutesForRc,
  nextWorkingDayStart,
  previousWorkingDayEnd,
  subtractMinutes,
} from './scheduler/calendar.ts'
import { calcCR } from './scheduler/critical-ratio.ts'
import {
  findAvailableRc,
  findEarliestSlot,
  findLatestSlot,
  type OccupiedSlots,
} from './scheduler/assign-rc.ts'
import { scheduleBackward } from './scheduler/backward.ts'
import { scheduleForward } from './scheduler/forward.ts'
import { findCriticalPath } from './scheduler/critical-path.ts'
import { schedule } from './scheduler/index.ts'
import { toEpochMin } from './scheduler/time.ts'

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

const rc = (id: string, groupId: string, allowed: string[], over: Partial<ResourceCenter> = {}): ResourceCenter => ({
  id,
  groupId,
  name: id,
  capacityMinPerShift: 480,
  shiftsPerDay: 1,
  efficiencyPct: 100,
  allowedOpTypes: allowed,
  ...over,
})

const en = (id: string, nom: string, qty: number, type: BomNode['type'], parent: string | null): ExpandedNode => ({
  id,
  orderId: 'O1',
  nomenclatureId: nom,
  effectiveQty: qty,
  level: parent === null ? 0 : 1,
  type,
  parentExpandedId: parent,
})

const CAL = makeCalendar('2026-01-01', 60)

describe('expandBom cycle guard', () => {
  it('throws on a cyclic BOM', () => {
    const bom: BomNode[] = [
      { parentId: null, childId: 'A', qtyPer: 1, type: 'assembly' },
      { parentId: 'A', childId: 'B', qtyPer: 1, type: 'assembly' },
      { parentId: 'B', childId: 'A', qtyPer: 1, type: 'assembly' },
    ]
    const order: Order = { id: 'O1', productId: 'A', qty: 1, dueDate: new Date('2026-02-01') }
    expect(() => expandBom([order], bom)).toThrow(/cycle or excessive depth/)
  })
})

describe('findSharedNodes sorting with multiple shared noms', () => {
  it('sorts shared nodes by nomenclatureId', () => {
    const nodes: ExpandedNode[] = [
      en('1', 'Z', 1, 'part', null),
      { ...en('2', 'Z', 2, 'part', null), orderId: 'O2' },
      en('3', 'A', 3, 'part', null),
      { ...en('4', 'A', 4, 'part', null), orderId: 'O2' },
    ]
    const shared = findSharedNodes(nodes)
    expect(shared.map((s) => s.nomenclatureId)).toEqual(['A', 'Z'])
  })
})

describe('MRP aggregation branches', () => {
  it('aggregates a material appearing in multiple nodes', () => {
    const nodes: ExpandedNode[] = [
      en('1', 'M', 4, 'material', null),
      { ...en('2', 'M', 6, 'material', null), orderId: 'O2' },
    ]
    const gross = calcGrossRequirements(nodes)
    expect(gross).toEqual([{ nomenclatureId: 'M', grossNeed: 10, orderIds: ['O1', 'O2'] }])
  })

  it('aggregates stock across multiple stock rows and counts all receipts without a demand date', () => {
    const gross = [{ nomenclatureId: 'M', grossNeed: 10, orderIds: ['O1'] }]
    const deficits = buildMaterialDeficits(
      gross,
      [
        { nomenclatureId: 'M', qty: 2 },
        { nomenclatureId: 'M', qty: 1 },
      ],
      [{ nomenclatureId: 'M', date: new Date('2026-01-10'), qty: 3, confirmed: true }],
    )
    // 10 − (2+1) − 3 = 4
    expect(deficits[0]!.netDeficit).toBe(4)
    expect(deficits[0]!.stock).toBe(3)
  })
})

describe('calendar defensive throws and empty-day handling', () => {
  it('returns 0 working minutes for a day absent from the calendar', () => {
    expect(getWorkingMinutesForRc(rc('RC', 'G', ['t']), new Date('2026-01-03'), CAL)).toBe(0)
  })

  it('throws when the calendar cannot satisfy the request', () => {
    const d = new Date('2026-01-05T00:00:00Z')
    expect(() => subtractMinutes(d, 60, [])).toThrow(/calendar exhausted/)
    expect(() => addMinutes(d, 60, [])).toThrow(/calendar exhausted/)
    expect(() => nextWorkingDayStart(d, [])).toThrow(/no working day/)
    expect(() => previousWorkingDayEnd(d, [])).toThrow(/no working day/)
    expect(() => alignToWorkingTime(d, [])).toThrow(/no working time/)
  })
})

describe('calcCR fallback to a standard day when no working day exists', () => {
  it('uses the 480-minute default (0 working days → CR 0)', () => {
    const nonWorking: WorkCalendar[] = [
      { date: new Date('2026-01-05'), isWorking: false, workingMinutes: 0 },
    ]
    const order: Order = { id: 'O1', productId: 'P', qty: 1, dueDate: new Date('2026-01-20') }
    expect(calcCR(order, [{ durationMin: 480 }], new Date('2026-01-05'), nonWorking)).toBe(0)
  })
})

describe('assign-rc multi-RC selection and null cases', () => {
  const group: RcGroup = { id: 'G', name: 'G', rcIds: ['RC-1', 'RC-2'] }
  const rcById = new Map([
    ['RC-1', rc('RC-1', 'G', ['t'])],
    ['RC-2', rc('RC-2', 'G', ['t'])],
  ])
  const base = toEpochMin(new Date('2026-01-05T00:00:00Z'))

  it('findEarliestSlot picks the RC with the earliest free slot', () => {
    const occupied: OccupiedSlots = new Map([['RC-1', [{ start: base, end: base + 200 }]]])
    const res = findEarliestSlot(group, rcById, 't', base, 60, occupied, CAL)
    expect(res!.rcId).toBe('RC-2') // RC-1 busy at the front → RC-2 earlier
    expect(res!.slot.start).toBe(base)
  })

  it('findLatestSlot breaks ties by lower load then id', () => {
    // both RCs free → both reach the deadline; RC-1 has more load, so RC-2 wins
    const deadline = base + 480
    const occupied: OccupiedSlots = new Map([['RC-1', [{ start: base - 1000, end: base - 500 }]]])
    const res = findLatestSlot(group, rcById, 't', deadline, 60, occupied, CAL)
    expect(res!.rcId).toBe('RC-2')
  })

  it('findAvailableRc returns null when the desired slot is busy on every allowed RC', () => {
    const occupied: OccupiedSlots = new Map([
      ['RC-1', [{ start: base, end: base + 100 }]],
      ['RC-2', [{ start: base, end: base + 100 }]],
    ])
    expect(findAvailableRc(group, rcById, 't', { start: base, end: base + 50 }, occupied)).toBeNull()
  })

  it('findLatestSlot returns null when no RC allows the op type', () => {
    expect(findLatestSlot(group, rcById, 'other', base + 480, 60, new Map(), CAL)).toBeNull()
  })
})

describe('backward/forward throw when no RC allows the op type', () => {
  const node = en('#D', 'D', 1, 'part', null)
  const rcGroups = new Map<string, RcGroup>([['G', { id: 'G', name: 'G', rcIds: ['RC-1'] }]])
  const rcById = new Map([['RC-1', rc('RC-1', 'G', ['milling'])]])
  const badOp: RouteOperation = {
    nomenclatureId: 'D',
    opNo: 10,
    opName: 'x',
    opType: 'welding',
    rcGroupId: 'G',
    durationMin: 60,
  }

  it('scheduleBackward throws', () => {
    expect(() =>
      scheduleBackward({
        node,
        routeOps: [badOp],
        deadline: new Date('2026-01-20T08:00:00Z'),
        rcGroups,
        rcById,
        occupiedSlots: new Map(),
        calendar: CAL,
        today: new Date('2026-01-05T00:00:00Z'),
      }),
    ).toThrow(/no allowed RC/)
  })

  it('scheduleForward throws', () => {
    expect(() =>
      scheduleForward({
        node,
        routeOps: [badOp],
        startFrom: new Date('2026-01-05T00:00:00Z'),
        rcGroups,
        rcById,
        occupiedSlots: new Map(),
        calendar: CAL,
      }),
    ).toThrow(/no allowed RC/)
  })
})

describe('critical-path tie-break between equal-length chains', () => {
  const so = (bomNodeId: string, opNo: number, dur: number, endISO: string): ScheduledOperation => ({
    orderId: 'O1',
    bomNodeId,
    nomenclatureId: bomNodeId.split('/').pop()!,
    opNo,
    opName: `op${opNo}`,
    rcGroupId: 'G',
    rcId: 'RC-1',
    startAt: new Date(endISO),
    endAt: new Date(endISO),
    durationMin: dur,
    status: 'ok',
  })

  it('prefers the lexicographically smaller predecessor on equal cumulative duration', () => {
    // Root R with children Z and A2 (equal-duration leaves); tie → A2 chosen.
    const ops: ScheduledOperation[] = [
      so('O1#R', 10, 5, '2026-01-07T00:00:00Z'),
      so('O1#R/Z', 10, 5, '2026-01-06T00:00:00Z'),
      so('O1#R/A2', 10, 5, '2026-01-06T00:00:00Z'),
    ]
    expect(findCriticalPath(ops, 'O1')).toEqual(['O1#R/A2#10', 'O1#R#10'])
  })
})

describe('schedule — assembly block without its own operations', () => {
  const groups: RcGroup[] = [{ id: 'G1', name: 'G1', rcIds: ['G1-RC'] }]
  const rcs: ResourceCenter[] = [rc('G1-RC', 'G1', ['generic'])]
  const input: ScheduleInput = {
    orders: [{ id: 'O1', productId: 'P', qty: 1, dueDate: new Date('2026-01-20T00:00:00Z') }],
    bom: [
      { parentId: null, childId: 'P', qtyPer: 1, type: 'assembly' },
      { parentId: 'P', childId: 'D', qtyPer: 1, type: 'part' },
    ],
    // P has no route operations; only D does.
    routes: [
      { nomenclatureId: 'D', opNo: 10, opName: 'd', opType: 'generic', rcGroupId: 'G1', durationMin: 60 },
    ],
    rcGroups: groups,
    resourceCenters: rcs,
    stock: [],
    plannedReceipts: [],
    calendar: CAL,
    horizon: new Date('2026-02-15T00:00:00Z'),
    today: new Date('2026-01-05T00:00:00Z'),
  }

  it('produces only D operations and a valid ready date', () => {
    const result = schedule(input, 'min-lateness')
    expect(result.operations.every((o) => o.nomenclatureId === 'D')).toBe(true)
    expect(result.operations).toHaveLength(1)
    expect(result.orders[0]!.delayDays).toBe(0)
  })
})

describe('schedule — reduced-efficiency RC yields overloaded capacity slots', () => {
  const groups: RcGroup[] = [{ id: 'G1', name: 'G1', rcIds: ['G1-RC'] }]
  const rcs: ResourceCenter[] = [rc('G1-RC', 'G1', ['generic'], { efficiencyPct: 80 })]
  const input: ScheduleInput = {
    orders: [{ id: 'O1', productId: 'P', qty: 1, dueDate: new Date('2026-01-20T00:00:00Z') }],
    bom: [{ parentId: null, childId: 'P', qtyPer: 1, type: 'assembly' }],
    routes: [
      { nomenclatureId: 'P', opNo: 10, opName: 'p', opType: 'generic', rcGroupId: 'G1', durationMin: 480 },
    ],
    rcGroups: groups,
    resourceCenters: rcs,
    stock: [],
    plannedReceipts: [],
    calendar: CAL,
    horizon: new Date('2026-02-15T00:00:00Z'),
    today: new Date('2026-01-05T00:00:00Z'),
  }

  it('flags the day as overloaded (>100%) since 480 min used vs 384 capacity', () => {
    const result = schedule(input, 'min-lateness')
    expect(result.metrics.overloadedSlotsCount).toBeGreaterThan(0)
    expect(result.capacity.some((s) => s.loadPct > 100)).toBe(true)
  })
})

describe('schedule — shared block picks the earliest-due order as primary', () => {
  const groups: RcGroup[] = [{ id: 'G1', name: 'G1', rcIds: ['G1-RC'] }]
  const rcs: ResourceCenter[] = [rc('G1-RC', 'G1', ['generic'])]
  const input: ScheduleInput = {
    orders: [
      { id: 'O1', productId: 'P1', qty: 1, dueDate: new Date('2026-02-10T00:00:00Z') },
      { id: 'O2', productId: 'P2', qty: 1, dueDate: new Date('2026-01-20T00:00:00Z') }, // earlier
    ],
    bom: [
      { parentId: null, childId: 'P1', qtyPer: 1, type: 'assembly' },
      { parentId: null, childId: 'P2', qtyPer: 1, type: 'assembly' },
      { parentId: 'P1', childId: 'D', qtyPer: 1, type: 'part' },
      { parentId: 'P2', childId: 'D', qtyPer: 1, type: 'part' },
    ],
    routes: [
      { nomenclatureId: 'D', opNo: 10, opName: 'd', opType: 'generic', rcGroupId: 'G1', durationMin: 30 },
    ],
    rcGroups: groups,
    resourceCenters: rcs,
    stock: [],
    plannedReceipts: [],
    calendar: CAL,
    horizon: new Date('2026-02-28T00:00:00Z'),
    today: new Date('2026-01-05T00:00:00Z'),
  }

  it('labels the shared D operation with the earlier-due order O2', () => {
    const result = schedule(input, 'min-lateness')
    const d = result.operations.find((o) => o.nomenclatureId === 'D')!
    expect(d.orderId).toBe('O2')
  })
})

describe('schedule — order with no operations anywhere', () => {
  const groups: RcGroup[] = [{ id: 'G1', name: 'G1', rcIds: ['G1-RC'] }]
  const rcs: ResourceCenter[] = [rc('G1-RC', 'G1', ['generic'])]
  const input: ScheduleInput = {
    orders: [{ id: 'O1', productId: 'P', qty: 1, dueDate: new Date('2026-01-20T00:00:00Z') }],
    bom: [
      { parentId: null, childId: 'P', qtyPer: 1, type: 'assembly' },
      { parentId: 'P', childId: 'M', qtyPer: 1, type: 'material' },
    ],
    routes: [], // no operations at all
    rcGroups: groups,
    resourceCenters: rcs,
    stock: [{ nomenclatureId: 'M', qty: 100 }],
    plannedReceipts: [],
    calendar: CAL,
    horizon: new Date('2026-02-15T00:00:00Z'),
    today: new Date('2026-01-05T00:00:00Z'),
  }

  it('falls back to the block completion / due date for the ready date', () => {
    const result = schedule(input, 'min-lateness')
    expect(result.operations).toEqual([])
    expect(result.orders[0]!.delayDays).toBe(0)
    expect(result.orders[0]!.criticalPath).toEqual([])
  })
})

describe('schedule — min-idle marks in-progress WIP crossing today', () => {
  const groups: RcGroup[] = [{ id: 'G1', name: 'G1', rcIds: ['G1-RC'] }]
  const rcs: ResourceCenter[] = [rc('G1-RC', 'G1', ['generic'])]
  const input: ScheduleInput = {
    orders: [{ id: 'O1', productId: 'P', qty: 1, dueDate: new Date('2026-01-20T00:00:00Z') }],
    bom: [{ parentId: null, childId: 'P', qtyPer: 1, type: 'assembly' }],
    routes: [
      { nomenclatureId: 'P', opNo: 10, opName: 'p', opType: 'generic', rcGroupId: 'G1', durationMin: 1440 },
    ],
    rcGroups: groups,
    resourceCenters: rcs,
    stock: [],
    plannedReceipts: [],
    calendar: CAL,
    horizon: new Date('2026-02-15T00:00:00Z'),
    today: new Date('2026-01-05T00:00:00Z'),
  }

  it('counts the block that starts today and finishes later as WIP', () => {
    const result = schedule(input, 'min-idle')
    expect(result.metrics.wipCount).toBeGreaterThan(0)
  })
})
