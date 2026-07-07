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

function rcLoadMinutes(occupied: TimeSlot[] | undefined): number {
  if (!occupied) return 0
  let sum = 0
  for (const i of occupied) sum += i.end - i.start
  return sum
}

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
 * 5.1 — Обрати РЦ всередині ГРЦ для слота `[startAt, endAt]` (FR-SCHED-07):
 *  (а) тип операції має бути у `allowedOpTypes`;
 *  (б) РЦ вільний у цьому слоті;
 *  (в) серед вільних — з мінімальним поточним завантаженням.
 *
 * Повертає `rcId` або `null`, якщо всі допустимі РЦ зайняті у слоті.
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
 * 5.2 — Найраніший вільний слот тривалості `durationMin` серед усіх РЦ групи,
 * коли всі перевантажені у бажаному слоті (FR-SCHED-08).
 *
 * Для кожного допустимого РЦ шукає найраніше робоче вікно, що не раніше
 * `notBefore` і не перетинається з його зайнятістю; повертає найраніший
 * (за початком) слот серед усіх РЦ.
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
 * Найпізніший вільний слот тривалості `durationMin`, що завершується не пізніше
 * `deadline`, серед усіх допустимих РЦ групи. Використовується у backward
 * scheduling (операція розміщується якомога пізніше до дедлайну).
 *
 * Вибір: максимальний `end`; при рівності — мінімальне завантаження, потім `rcId`.
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
