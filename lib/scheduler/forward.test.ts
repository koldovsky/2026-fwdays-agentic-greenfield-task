import { describe, it, expect } from 'vitest'
import type {
  ExpandedNode,
  RcGroup,
  ResourceCenter,
  RouteOperation,
  WorkCalendar,
} from '../types/index.ts'
import { scheduleForward } from './forward.ts'
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

const node = (effectiveQty: number): ExpandedNode => ({
  id: 'O1#D',
  orderId: 'O1',
  nomenclatureId: 'D',
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

describe('Scenario 2 — forward scheduling from today', () => {
  const calendar = makeCalendar('2026-01-01', 40)
  const rcGroups = new Map<string, RcGroup>([['G1', { id: 'G1', name: 'G1', rcIds: ['RC-1'] }]])
  const rcById = new Map<string, ResourceCenter>([['RC-1', rc('RC-1', 'G1', ['milling'])]])

  it('places a 3-day workload starting today, finishing ~3 working days later', () => {
    const result = scheduleForward({
      node: node(1),
      routeOps: [op(10, 'milling', 'G1', 1440)],
      startFrom: new Date('2026-01-05T00:00:00Z'), // Monday
      rcGroups,
      rcById,
      occupiedSlots: new Map(),
      calendar,
    })
    expect(result.placements).toHaveLength(1)
    const only = result.placements[0]!
    expect(fromEpochMin(only.start).toISOString()).toBe('2026-01-05T00:00:00.000Z')
    // 1440 min = 3 working days (Mon,Tue,Wed) → ends Wed 08:00
    expect(fromEpochMin(only.end).toISOString()).toBe('2026-01-07T08:00:00.000Z')
    expect(result.latestEnd).toBe(only.end)
  })
})

describe('forward scheduling — multi-op inter-operation day gap', () => {
  const calendar = makeCalendar('2026-01-01', 40)
  const rcGroups = new Map<string, RcGroup>([
    ['G1', { id: 'G1', name: 'G1', rcIds: ['RC-1'] }],
    ['G2', { id: 'G2', name: 'G2', rcIds: ['RC-2'] }],
  ])
  const rcById = new Map<string, ResourceCenter>([
    ['RC-1', rc('RC-1', 'G1', ['milling'])],
    ['RC-2', rc('RC-2', 'G2', ['drilling'])],
  ])

  it('starts op20 on the working day after op10 finishes', () => {
    const result = scheduleForward({
      node: node(1),
      routeOps: [op(10, 'milling', 'G1', 60), op(20, 'drilling', 'G2', 30)],
      startFrom: new Date('2026-01-05T00:00:00Z'),
      rcGroups,
      rcById,
      occupiedSlots: new Map(),
      calendar,
    })
    const [first, second] = result.placements
    expect(fromEpochMin(first!.start).toISOString()).toBe('2026-01-05T00:00:00.000Z')
    expect(fromEpochMin(first!.end).toISOString()).toBe('2026-01-05T01:00:00.000Z')
    // op20 not before start of next working day (Tue 06)
    expect(fromEpochMin(second!.start).toISOString()).toBe('2026-01-06T00:00:00.000Z')
    expect(fromEpochMin(second!.end).toISOString()).toBe('2026-01-06T00:30:00.000Z')
  })
})
