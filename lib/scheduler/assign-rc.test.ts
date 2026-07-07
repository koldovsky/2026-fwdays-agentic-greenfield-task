import { describe, it, expect } from 'vitest'
import type { RcGroup, ResourceCenter, WorkCalendar } from '../types/index.ts'
import { findAvailableRc, findEarliestSlot, type OccupiedSlots } from './assign-rc.ts'
import { toEpochMin } from './time.ts'

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

const rc = (id: string, allowed: string[]): ResourceCenter => ({
  id,
  groupId: 'G1',
  name: id,
  capacityMinPerShift: 480,
  shiftsPerDay: 1,
  efficiencyPct: 100,
  allowedOpTypes: allowed,
})

const BASE = toEpochMin(new Date('2026-01-05T00:00:00Z')) // Monday 00:00

describe('findAvailableRc', () => {
  it('returns null when the only allowed RC is busy in the slot', () => {
    const group: RcGroup = { id: 'G1', name: 'G1', rcIds: ['RC-1'] }
    const rcById = new Map([['RC-1', rc('RC-1', ['t'])]])
    const occupied: OccupiedSlots = new Map([['RC-1', [{ start: BASE, end: BASE + 120 }]]])
    expect(findAvailableRc(group, rcById, 't', { start: BASE, end: BASE + 120 }, occupied)).toBeNull()
  })

  it('returns the RC when the slot is free', () => {
    const group: RcGroup = { id: 'G1', name: 'G1', rcIds: ['RC-1'] }
    const rcById = new Map([['RC-1', rc('RC-1', ['t'])]])
    const occupied: OccupiedSlots = new Map([['RC-1', [{ start: BASE, end: BASE + 120 }]]])
    expect(
      findAvailableRc(group, rcById, 't', { start: BASE + 200, end: BASE + 320 }, occupied),
    ).toBe('RC-1')
  })

  it('filters by allowedOpTypes', () => {
    const group: RcGroup = { id: 'G1', name: 'G1', rcIds: ['RC-1', 'RC-2'] }
    const rcById = new Map([
      ['RC-1', rc('RC-1', ['t'])],
      ['RC-2', rc('RC-2', ['x'])],
    ])
    const occupied: OccupiedSlots = new Map()
    expect(findAvailableRc(group, rcById, 't', { start: BASE, end: BASE + 60 }, occupied)).toBe('RC-1')
  })

  it('picks the RC with the least current load', () => {
    const group: RcGroup = { id: 'G1', name: 'G1', rcIds: ['RC-1', 'RC-2'] }
    const rcById = new Map([
      ['RC-1', rc('RC-1', ['t'])],
      ['RC-2', rc('RC-2', ['t'])],
    ])
    // RC-1 already loaded 300 min elsewhere; RC-2 only 60 → choose RC-2.
    const occupied: OccupiedSlots = new Map([
      ['RC-1', [{ start: BASE - 1000, end: BASE - 700 }]],
      ['RC-2', [{ start: BASE - 1000, end: BASE - 940 }]],
    ])
    expect(findAvailableRc(group, rcById, 't', { start: BASE, end: BASE + 60 }, occupied)).toBe('RC-2')
  })
})

describe('Scenario 4 — competing operation queues to the earliest free slot', () => {
  const calendar = makeCalendar('2026-01-05', 5)
  const group: RcGroup = { id: 'G1', name: 'G1', rcIds: ['RC-1'] }
  const rcById = new Map([['RC-1', rc('RC-1', ['t'])]])

  it('places the second op right after the first on the single RC', () => {
    // Order B (higher priority) already occupies [BASE, BASE+120].
    const occupied: OccupiedSlots = new Map([['RC-1', [{ start: BASE, end: BASE + 120 }]]])
    const result = findEarliestSlot(group, rcById, 't', BASE, 120, occupied, calendar)
    expect(result).not.toBeNull()
    expect(result!.rcId).toBe('RC-1')
    expect(result!.slot).toEqual({ start: BASE + 120, end: BASE + 240 })
  })

  it('returns null when no RC in the group allows the op type', () => {
    const result = findEarliestSlot(group, rcById, 'other', BASE, 120, new Map(), calendar)
    expect(result).toBeNull()
  })
})
