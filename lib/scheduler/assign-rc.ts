import type { RcGroup, ResourceCenter, WorkCalendar } from '../types/index.ts'
import { addMinutes, alignToWorkingTime, subtractMinutes } from './calendar.ts'
import { fromEpochMin, overlaps, toEpochMin, type TimeSlot } from './time.ts'

/** Зайняті інтервали по кожному РЦ (епоха-хвилини). Один РЦ — одна операція. */
export type OccupiedSlots = Map<string, TimeSlot[]>

/** Результат постановки операції у найраніший вільний слот. */
export interface EarliestSlot {
  rcId: string
  slot: TimeSlot
}

/** Захист від нескінченних циклів при пошуку вільного слота. */
const MAX_SLOT_ITERATIONS = 100_000

/**
 * Calculates the total occupied time for a resource center.
 *
 * @param occupied - The resource center's occupied time intervals
 * @returns The total occupied duration in minutes
 */
function rcLoadMinutes(occupied: TimeSlot[] | undefined): number {
  if (!occupied) return 0
  let sum = 0
  for (const i of occupied) sum += i.end - i.start
  return sum
}

/**
 * Determines whether a time slot is available.
 *
 * @param occupied - Intervals currently occupied by a resource center
 * @param slot - Time slot to check
 * @returns `true` if the slot does not overlap any occupied interval, `false` otherwise
 */
function isFree(occupied: TimeSlot[] | undefined, slot: TimeSlot): boolean {
  if (!occupied) return true
  return !occupied.some((i) => overlaps(i, slot))
}

/** РЦ групи, що дозволяють `opType`, у детермінованому порядку `rcIds`. */
function allowedRcs(
  rcGroup: RcGroup,
  rcById: Map<string, ResourceCenter>,
  opType: string,
): ResourceCenter[] {
  const out: ResourceCenter[] = []
  for (const id of rcGroup.rcIds) {
    const rc = rcById.get(id)
    if (rc && rc.allowedOpTypes.includes(opType)) out.push(rc)
  }
  return out
}

/**
 * Selects an eligible resource center with the lowest occupied load for a time slot.
 *
 * @param opType - Operation type used to filter eligible resource centers
 * @param slot - Time interval that must be available
 * @returns The selected resource center ID, or `null` if no eligible resource center is available
 */
export function findAvailableRc(
  rcGroup: RcGroup,
  rcById: Map<string, ResourceCenter>,
  opType: string,
  slot: TimeSlot,
  occupiedSlots: OccupiedSlots,
): string | null {
  const candidates = allowedRcs(rcGroup, rcById, opType).filter((rc) =>
    isFree(occupiedSlots.get(rc.id), slot),
  )
  if (candidates.length === 0) return null

  let best = candidates[0]!
  let bestLoad = rcLoadMinutes(occupiedSlots.get(best.id))
  for (const rc of candidates.slice(1)) {
    const load = rcLoadMinutes(occupiedSlots.get(rc.id))
    if (load < bestLoad || (load === bestLoad && rc.id.localeCompare(best.id) < 0)) {
      best = rc
      bestLoad = load
    }
  }
  return best.id
}

/**
 * Finds the earliest available working slot of the specified duration among the allowed resource centers.
 *
 * @param notBefore - The earliest permitted start time in epoch minutes
 * @param durationMin - The required slot duration in minutes
 * @returns The earliest available resource center and slot, or `null` if no allowed resource center has a feasible slot
 */
export function findEarliestSlot(
  rcGroup: RcGroup,
  rcById: Map<string, ResourceCenter>,
  opType: string,
  notBefore: number,
  durationMin: number,
  occupiedSlots: OccupiedSlots,
  calendar: WorkCalendar[],
): EarliestSlot | null {
  const candidates = allowedRcs(rcGroup, rcById, opType)
  if (candidates.length === 0) return null

  let best: EarliestSlot | null = null
  for (const rc of candidates) {
    const occupied = occupiedSlots.get(rc.id)
    let startMin = toEpochMin(alignToWorkingTime(fromEpochMin(notBefore), calendar))
    let found: TimeSlot | null = null
    for (let i = 0; i < MAX_SLOT_ITERATIONS; i++) {
      const endMin = toEpochMin(addMinutes(fromEpochMin(startMin), durationMin, calendar))
      const slot: TimeSlot = { start: startMin, end: endMin }
      const conflict = occupied?.find((iv) => overlaps(iv, slot))
      if (!conflict) {
        found = slot
        break
      }
      // Перестрибнути за зайнятий інтервал і знову вирівняти на робочий час.
      startMin = toEpochMin(alignToWorkingTime(fromEpochMin(conflict.end), calendar))
    }
    if (!found) continue
    if (
      best === null ||
      found.start < best.slot.start ||
      (found.start === best.slot.start && rc.id.localeCompare(best.rcId) < 0)
    ) {
      best = { rcId: rc.id, slot: found }
    }
  }
  return best
}

/**
 * Finds the latest feasible working slot for an operation that ends by the deadline.
 *
 * @param opType - The operation type the resource center must support
 * @param deadline - The latest permitted slot end time in epoch minutes
 * @param durationMin - The required working duration in minutes
 * @returns The selected resource center and slot, or `null` if no eligible slot is available
 */
export function findLatestSlot(
  rcGroup: RcGroup,
  rcById: Map<string, ResourceCenter>,
  opType: string,
  deadline: number,
  durationMin: number,
  occupiedSlots: OccupiedSlots,
  calendar: WorkCalendar[],
): EarliestSlot | null {
  const candidates = allowedRcs(rcGroup, rcById, opType)
  if (candidates.length === 0) return null

  let best: EarliestSlot | null = null
  for (const rc of candidates) {
    const occupied = occupiedSlots.get(rc.id)
    let endMin = deadline
    let found: TimeSlot | null = null
    for (let i = 0; i < MAX_SLOT_ITERATIONS; i++) {
      const startMin = toEpochMin(subtractMinutes(fromEpochMin(endMin), durationMin, calendar))
      // Фактичний кінець роботи (≤ deadline): може бути раніше за нерабочий дедлайн.
      const actualEnd = toEpochMin(addMinutes(fromEpochMin(startMin), durationMin, calendar))
      const slot: TimeSlot = { start: startMin, end: actualEnd }
      const conflicts = occupied?.filter((iv) => overlaps(iv, slot)) ?? []
      if (conflicts.length === 0) {
        found = slot
        break
      }
      // Зсунути кінець до початку найранішого конфлікту, щоб звільнити слот.
      let earliestConflictStart = Number.POSITIVE_INFINITY
      for (const c of conflicts) {
        if (c.start < earliestConflictStart) earliestConflictStart = c.start
      }
      endMin = earliestConflictStart
    }
    if (!found) continue
    const load = rcLoadMinutes(occupied)
    if (best === null) {
      best = { rcId: rc.id, slot: found }
      continue
    }
    const bestLoad = rcLoadMinutes(occupiedSlots.get(best.rcId))
    if (
      found.end > best.slot.end ||
      (found.end === best.slot.end && load < bestLoad) ||
      (found.end === best.slot.end && load === bestLoad && rc.id.localeCompare(best.rcId) < 0)
    ) {
      best = { rcId: rc.id, slot: found }
    }
  }
  return best
}
