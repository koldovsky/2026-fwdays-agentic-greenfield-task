import { describe, it, expect } from 'vitest'
import type {
  ExpandedNode,
  RcGroup,
  ResourceCenter,
  RouteOperation,
  WorkCalendar,
} from '../types/index.ts'
import { scheduleBackward, type BackwardParams } from './backward.ts'
import { fromEpochMin } from './time.ts'

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

const node = (nomenclatureId: string, effectiveQty: number): ExpandedNode => ({
  id: `O1#${nomenclatureId}`,
  orderId: 'O1',
  nomenclatureId,
  effectiveQty,
  level: 2,
  type: 'part',
  parentExpandedId: null,
})

const rc = (id: string, groupId: string, allowed: string[]): ResourceCenter => ({
  id,
  groupId,
  name: id,
  capacityMinPerShift: 480,
  shiftsPerDay: 1,
  efficiencyPct: 100,
  allowedOpTypes: allowed,
})

const op = (opNo: number, opType: string, rcGroupId: string, durationMin: number): RouteOperation => ({
  nomenclatureId: 'D',
  opNo,
  opName: `op${opNo}`,
  opType,
  rcGroupId,
  durationMin,
})

describe('Scenario 1 — backward scheduling of a two-operation route', () => {
  const calendar = makeCalendar('2026-01-01', 40)
  const rcGroups = new Map<string, RcGroup>([
    ['G1', { id: 'G1', name: 'G1', rcIds: ['RC-1'] }],
    ['G2', { id: 'G2', name: 'G2', rcIds: ['RC-2'] }],
  ])
  const rcById = new Map<string, ResourceCenter>([
    ['RC-1', rc('RC-1', 'G1', ['milling'])],
    ['RC-2', rc('RC-2', 'G2', ['drilling'])],
  ])

  const params: BackwardParams = {
    node: node('D', 1),
    routeOps: [op(10, 'milling', 'G1', 60), op(20, 'drilling', 'G2', 30)],
    deadline: new Date('2026-01-30T08:00:00Z'), // Friday, end of window
    rcGroups,
    rcById,
    occupiedSlots: new Map(),
    calendar,
    today: new Date('2026-01-05T00:00:00Z'),
  }

  const result = scheduleBackward(params)

  it('does not require forward and places both operations', () => {
    expect(result.needsForward).toBe(false)
    expect(result.placements).toHaveLength(2)
  })

  it('places the last op ending at the deadline', () => {
    const last = result.placements[1]!
    expect(last.op.opNo).toBe(20)
    expect(fromEpochMin(last.end).toISOString()).toBe('2026-01-30T08:00:00.000Z')
    expect(last.rcId).toBe('RC-2')
  })

  it('places op10 on an earlier working day than op20 (inter-op day gap)', () => {
    const first = result.placements[0]!
    const second = result.placements[1]!
    expect(first.op.opNo).toBe(10)
    expect(first.rcId).toBe('RC-1')
    const firstEndDay = fromEpochMin(first.end).toISOString().slice(0, 10)
    const secondStartDay = fromEpochMin(second.start).toISOString().slice(0, 10)
    expect(firstEndDay < secondStartDay).toBe(true)
  })

  it('assigns each op to the RC whose allowedOpTypes matches its opType', () => {
    expect(result.placements[0]!.rcId).toBe('RC-1') // milling
    expect(result.placements[1]!.rcId).toBe('RC-2') // drilling
  })
})

describe('Scenario 2 — backward runs into the past → needsForward', () => {
  const calendar = makeCalendar('2026-01-01', 40)
  const rcGroups = new Map<string, RcGroup>([['G1', { id: 'G1', name: 'G1', rcIds: ['RC-1'] }]])
  const rcById = new Map<string, ResourceCenter>([['RC-1', rc('RC-1', 'G1', ['milling'])]])

  it('signals needsForward when workload cannot fit before the due date', () => {
    const result = scheduleBackward({
      node: node('D', 1),
      routeOps: [op(10, 'milling', 'G1', 1440)], // 3 working days of work
      deadline: new Date('2026-01-06T08:00:00Z'), // tomorrow
      rcGroups,
      rcById,
      occupiedSlots: new Map(),
      calendar,
      today: new Date('2026-01-05T00:00:00Z'),
    })
    expect(result.needsForward).toBe(true)
    expect(result.fromOpNo).toBe(10)
    expect(result.placements).toEqual([])
  })
})
