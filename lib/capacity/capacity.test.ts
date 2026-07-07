import { describe, it, expect } from 'vitest'
import type {
  CapacitySlot,
  RcGroup,
  ResourceCenter,
  ScheduledOperation,
  WorkCalendar,
} from '../types/index.ts'
import { pickUnit } from './unit.ts'
import { buildCapacityView } from './aggregate.ts'

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

const rc = (id: string, groupId: string, over: Partial<ResourceCenter> = {}): ResourceCenter => ({
  id,
  groupId,
  name: `Name-${id}`,
  capacityMinPerShift: 480,
  shiftsPerDay: 1,
  efficiencyPct: 100,
  allowedOpTypes: ['generic'],
  ...over,
})

const slot = (rcId: string, dateISO: string, usedMin: number): CapacitySlot => ({
  rcId,
  date: new Date(dateISO),
  usedMin,
  totalMin: 480,
  loadPct: (usedMin / 480) * 100,
})

describe('Scenario A — axis unit follows horizon (FR-CAP-03)', () => {
  const today = new Date('2026-01-01T00:00:00Z')
  it('picks day / week / month by horizon length', () => {
    expect(pickUnit(today, new Date('2026-01-22T00:00:00Z'))).toBe('day') // ~3 weeks
    expect(pickUnit(today, new Date('2026-04-01T00:00:00Z'))).toBe('week') // ~3 months
    expect(pickUnit(today, new Date('2026-12-31T00:00:00Z'))).toBe('month') // ~year
  })
})

describe('Scenario B — load percent by RC and by RC-group', () => {
  const calendar = makeCalendar('2026-01-05', 1) // single working Monday
  const resourceCenters = [rc('RC-1', 'G1'), rc('RC-2', 'G1')]
  const rcGroups: RcGroup[] = [{ id: 'G1', name: 'Група 1', rcIds: ['RC-1', 'RC-2'] }]
  const capacity = [slot('RC-1', '2026-01-05', 240), slot('RC-2', '2026-01-05', 480)]
  const base = {
    capacity,
    operations: [] as ScheduledOperation[],
    resourceCenters,
    rcGroups,
    calendar,
    today: new Date('2026-01-05T00:00:00Z'),
    horizon: new Date('2026-01-05T00:00:00Z'),
  }

  it('rc level: RC-1 = 50%, RC-2 = 100%', () => {
    const view = buildCapacityView({ ...base, level: 'rc' })
    expect(view.unit).toBe('day')
    expect(view.data).toHaveLength(1)
    expect(view.data[0]!['RC-1']).toBe(50)
    expect(view.data[0]!['RC-2']).toBe(100)
  })

  it('group level: G1 = 75%', () => {
    const view = buildCapacityView({ ...base, level: 'group' })
    expect(view.series).toEqual([{ key: 'G1', name: 'Група 1' }])
    expect(view.data[0]!['G1']).toBe(75)
  })
})

describe('Scenario C — KPIs (avg, overload, idle)', () => {
  const calendar = makeCalendar('2026-01-05', 1)
  const resourceCenters = [rc('RC-1', 'G1'), rc('RC-2', 'G1'), rc('RC-3', 'G2')]
  const rcGroups: RcGroup[] = [
    { id: 'G1', name: 'G1', rcIds: ['RC-1', 'RC-2'] },
    { id: 'G2', name: 'G2', rcIds: ['RC-3'] },
  ]
  const capacity = [
    slot('RC-1', '2026-01-05', 480), // 100%
    slot('RC-2', '2026-01-05', 600), // overloaded
    // RC-3 has no slot → idle
  ]

  it('computes avg load, overloaded slots, and zero-load RCs', () => {
    const view = buildCapacityView({
      capacity,
      operations: [],
      resourceCenters,
      rcGroups,
      calendar,
      today: new Date('2026-01-05T00:00:00Z'),
      horizon: new Date('2026-01-05T00:00:00Z'),
      level: 'rc',
    })
    expect(view.kpis.avgLoadPct).toBe(75) // (480+600+0)/(480*3)
    expect(view.kpis.overloadedSlots).toBe(1) // RC-2
    expect(view.kpis.zeroLoadRcs).toBe(1) // RC-3
  })
})

describe('Scenario D — tooltip operations per cell (FR-CAP-04)', () => {
  const calendar = makeCalendar('2026-01-05', 1)
  const resourceCenters = [rc('RC-1', 'G1')]
  const rcGroups: RcGroup[] = [{ id: 'G1', name: 'G1', rcIds: ['RC-1'] }]
  const op: ScheduledOperation = {
    orderId: 'O1',
    bomNodeId: 'O1#A',
    nomenclatureId: 'A',
    opNo: 10,
    opName: 'Фрезерування',
    rcGroupId: 'G1',
    rcId: 'RC-1',
    startAt: new Date('2026-01-05T02:00:00Z'),
    endAt: new Date('2026-01-05T06:00:00Z'),
    durationMin: 240,
    status: 'ok',
  }

  it('indexes operations by series and bucket', () => {
    const view = buildCapacityView({
      capacity: [slot('RC-1', '2026-01-05', 240)],
      operations: [op],
      resourceCenters,
      rcGroups,
      calendar,
      today: new Date('2026-01-05T00:00:00Z'),
      horizon: new Date('2026-01-05T00:00:00Z'),
      level: 'rc',
    })
    const bucketStart = Date.UTC(2026, 0, 5)
    const cell = view.opsByCell[`RC-1__${bucketStart}`]
    expect(cell).toEqual([{ opName: 'Фрезерування', orderId: 'O1', nomenclatureId: 'A', durationMin: 240 }])
  })
})
