import type {
  ExpandedNode,
  RcGroup,
  ResourceCenter,
  RouteOperation,
  WorkCalendar,
} from '../types/index.ts'
import { findLatestSlot, type OccupiedSlots } from './assign-rc.ts'
import { previousWorkingDayEnd } from './calendar.ts'
import { fromEpochMin, toEpochMin } from './time.ts'

/** Розміщена операція (епоха-хвилини). */
export interface OpPlacement {
  op: RouteOperation
  rcId: string
  start: number
  end: number
}

export interface BackwardResult {
  /** Розміщення у порядку маршруту (opNo зростає). Порожньо якщо needsForward. */
  placements: OpPlacement[]
  /** Початок найранішої операції вузла (epoch-min) або null. */
  earliestStart: number | null
  /** Backward дав старт раніше `today` — потрібен forward (FR-SCHED-03). */
  needsForward: boolean
  /** opNo операції, на якій backward «випав» у минуле. */
  fromOpNo: number | null
}

export interface BackwardParams {
  node: ExpandedNode
  /** Операції МК цього вузла (будь-який порядок). */
  routeOps: RouteOperation[]
  /** Дедлайн завершення вузла. */
  deadline: Date
  rcGroups: Map<string, RcGroup>
  rcById: Map<string, ResourceCenter>
  /** Зайнятість РЦ від уже розставлених вузлів (лише для читання). */
  occupiedSlots: OccupiedSlots
  calendar: WorkCalendar[]
  today: Date
}

/**
 * Converts a date to the epoch-minute value for midnight UTC on the same calendar day.
 *
 * @param date - The date whose UTC calendar day determines the result
 * @returns The epoch-minute value at UTC midnight
 */
function utcMidnightMin(date: Date): number {
  return toEpochMin(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())),
  )
}

/**
 * Schedules route operations backward from the node deadline.
 *
 * Each operation uses the latest available slot in its resource group, with
 * preceding operations constrained to end by the end of the previous working
 * day. If scheduling reaches before `today`, no placements are returned and
 * the result identifies the operation where forward scheduling should begin.
 *
 * @param params - Scheduling inputs, including route operations, resources,
 *   occupancy, calendar, deadline, and reference date
 * @returns The placements in route order, earliest start time, and whether
 *   forward scheduling is required
 */
export function scheduleBackward(params: BackwardParams): BackwardResult {
  const ops = [...params.routeOps].sort((a, b) => a.opNo - b.opNo)
  const todayMin = utcMidnightMin(params.today)
  let cursorEnd = toEpochMin(params.deadline)
  const placements: OpPlacement[] = []

  for (let k = ops.length - 1; k >= 0; k--) {
    const op = ops[k]!
    const group = params.rcGroups.get(op.rcGroupId)
    if (!group) throw new Error(`scheduleBackward: unknown rcGroup ${op.rcGroupId}`)
    const durationMin = op.durationMin * params.node.effectiveQty

    const found = findLatestSlot(
      group,
      params.rcById,
      op.opType,
      cursorEnd,
      durationMin,
      params.occupiedSlots,
      params.calendar,
    )
    if (!found) {
      throw new Error(
        `scheduleBackward: no allowed RC for op ${op.opNo} of ${op.nomenclatureId}`,
      )
    }

    if (found.slot.start < todayMin) {
      return { placements: [], earliestStart: null, needsForward: true, fromOpNo: op.opNo }
    }

    placements.unshift({
      op,
      rcId: found.rcId,
      start: found.slot.start,
      end: found.slot.end,
    })

    // Попередня операція маршруту має завершитись до кінця попереднього
    // робочого дня відносно старту цієї операції (міжопераційний день).
    cursorEnd = toEpochMin(previousWorkingDayEnd(fromEpochMin(found.slot.start), params.calendar))
  }

  return {
    placements,
    earliestStart: placements.length > 0 ? placements[0]!.start : null,
    needsForward: false,
    fromOpNo: null,
  }
}
