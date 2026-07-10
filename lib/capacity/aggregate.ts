import type {
  CapacitySlot,
  RcGroup,
  ResourceCenter,
  ScheduledOperation,
  WorkCalendar,
} from '../types/index.ts'
import { getWorkingMinutesForRc } from '../scheduler/calendar.ts'
import type {
  CapacityLevel,
  CapacityRow,
  CapacitySeries,
  CapacityUnit,
  CapacityView,
  CellOp,
} from './types.ts'
import { pickUnit } from './unit.ts'

const MS_PER_DAY = 86_400_000

export interface BuildCapacityOptions {
  capacity: CapacitySlot[]
  operations: ScheduledOperation[]
  resourceCenters: ResourceCenter[]
  rcGroups: RcGroup[]
  calendar: WorkCalendar[]
  today: Date
  horizon: Date
  level: CapacityLevel
}

/**
 * Gets the UTC timestamp for the start of the specified date.
 *
 * @param date - The date whose UTC calendar day determines the timestamp
 * @returns The timestamp at 00:00 UTC on the specified date
 */
function utcMidnightMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/**
 * Determines the UTC start timestamp for a histogram bucket containing a day.
 *
 * @param dayMs - The UTC midnight timestamp for the day
 * @param unit - The bucket granularity
 * @returns The UTC timestamp for the start of the day, Monday of its week, or first day of its month
 */
function bucketStartMs(dayMs: number, unit: CapacityUnit): number {
  if (unit === 'day') return dayMs
  const d = new Date(dayMs)
  if (unit === 'week') {
    const offset = (d.getUTCDay() + 6) % 7 // 0 = понеділок
    return dayMs - offset * MS_PER_DAY
  }
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
}

/**
 * Formats a UTC bucket start timestamp as a month or day label.
 *
 * @param startMs - The bucket start timestamp in milliseconds
 * @param unit - The time unit represented by the bucket
 * @returns A `MM.YYYY` label for month buckets or a `DD.MM` label otherwise
 */
function bucketLabel(startMs: number, unit: CapacityUnit): string {
  const d = new Date(startMs)
  const p = (n: number) => String(n).padStart(2, '0')
  if (unit === 'month') return `${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}`
}

/**
 * Rounds a number to two decimal places.
 *
 * @param x - The number to round
 * @returns The rounded number
 */
function round2(x: number): number {
  return Math.round(x * 100) / 100
}

/**
 * Builds a capacity utilization view for the requested date range and aggregation level.
 *
 * @param opts - Capacity data, calendar, resources, operations, and date boundaries used to build the view
 * @returns Utilization series and bucketed data, operations grouped by cell, and summary KPIs
 */
export function buildCapacityView(opts: BuildCapacityOptions): CapacityView {
  const unit = pickUnit(opts.today, opts.horizon)
  const rcById = new Map(opts.resourceCenters.map((rc) => [rc.id, rc]))
  const groupName = new Map(opts.rcGroups.map((g) => [g.id, g.name]))
  const level = opts.level

  const usedByRcDay = new Map<string, number>()
  for (const s of opts.capacity) {
    usedByRcDay.set(`${s.rcId}|${utcMidnightMs(s.date)}`, s.usedMin)
  }

  const seriesKeyOf = (rc: ResourceCenter) => (level === 'group' ? rc.groupId : rc.id)
  const seriesNameOf = (rc: ResourceCenter) =>
    level === 'group' ? (groupName.get(rc.groupId) ?? rc.groupId) : rc.name

  const cell = new Map<string, { used: number; avail: number }>()
  const buckets = new Set<number>()
  const seriesMap = new Map<string, string>()
  const usedByRc = new Map<string, number>()
  for (const rc of opts.resourceCenters) usedByRc.set(rc.id, 0)

  let totalUsed = 0
  let totalAvail = 0
  let overloadedSlots = 0

  const fromMs = utcMidnightMs(opts.today)
  const toMs = utcMidnightMs(opts.horizon)

  for (const entry of opts.calendar) {
    if (!entry.isWorking || entry.workingMinutes <= 0) continue
    const dayMs = utcMidnightMs(entry.date)
    if (dayMs < fromMs || dayMs > toMs) continue
    const bStart = bucketStartMs(dayMs, unit)
    buckets.add(bStart)

    for (const rc of opts.resourceCenters) {
      const avail = getWorkingMinutesForRc(rc, entry.date, opts.calendar)
      if (avail <= 0) continue
      const used = usedByRcDay.get(`${rc.id}|${dayMs}`) ?? 0
      totalUsed += used
      totalAvail += avail
      if (used > avail) overloadedSlots++
      usedByRc.set(rc.id, (usedByRc.get(rc.id) ?? 0) + used)

      const sk = seriesKeyOf(rc)
      if (!seriesMap.has(sk)) seriesMap.set(sk, seriesNameOf(rc))
      const ck = `${sk}|${bStart}`
      const acc = cell.get(ck) ?? { used: 0, avail: 0 }
      acc.used += used
      acc.avail += avail
      cell.set(ck, acc)
    }
  }

  const series: CapacitySeries[] = [...seriesMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, name]) => ({ key, name }))

  const data: CapacityRow[] = [...buckets]
    .sort((a, b) => a - b)
    .map((bStart) => {
      const row: CapacityRow = { bucket: bucketLabel(bStart, unit), bucketStart: bStart }
      for (const s of series) {
        const acc = cell.get(`${s.key}|${bStart}`)
        row[s.key] = acc && acc.avail > 0 ? round2((acc.used / acc.avail) * 100) : 0
      }
      return row
    })

  const opsByCell: Record<string, CellOp[]> = {}
  for (const op of opts.operations) {
    const dayMs = utcMidnightMs(op.startAt)
    if (dayMs < fromMs || dayMs > toMs) continue
    const rc = rcById.get(op.rcId)
    const sk = level === 'group' ? (rc?.groupId ?? op.rcGroupId) : op.rcId
    const key = `${sk}__${bucketStartMs(dayMs, unit)}`
    ;(opsByCell[key] ??= []).push({
      opName: op.opName,
      orderId: op.orderId,
      nomenclatureId: op.nomenclatureId,
      durationMin: op.durationMin,
    })
  }

  const zeroLoadRcs = [...usedByRc.values()].filter((v) => v === 0).length
  const avgLoadPct = totalAvail > 0 ? round2((totalUsed / totalAvail) * 100) : 0

  return {
    unit,
    level,
    series,
    data,
    opsByCell,
    kpis: { avgLoadPct, overloadedSlots, zeroLoadRcs },
  }
}
