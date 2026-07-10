import type {
  ExpandedNode,
  RcGroup,
  ResourceCenter,
  RouteOperation,
  WorkCalendar,
} from '../types/index.ts'
import { findEarliestSlot, type OccupiedSlots } from './assign-rc.ts'
import { alignToWorkingTime, nextWorkingDayStart } from './calendar.ts'
import type { OpPlacement } from './backward.ts'
import { fromEpochMin, toEpochMin } from './time.ts'

export interface ForwardResult {
  /** Розміщення у порядку маршруту (opNo зростає). */
  placements: OpPlacement[]
  /** Кінець останньої операції вузла (epoch-min) або null. */
  latestEnd: number | null
}

export interface ForwardParams {
  node: ExpandedNode
  routeOps: RouteOperation[]
  /** Найраніший старт першої операції. */
  startFrom: Date
  rcGroups: Map<string, RcGroup>
  rcById: Map<string, ResourceCenter>
  occupiedSlots: OccupiedSlots
  calendar: WorkCalendar[]
}

/**
 * Schedules a node's route operations in ascending operation order.
 *
 * Operations start at or after `startFrom`, and each subsequent operation
 * begins on the next working day after the previous operation ends. Existing
 * occupied slots are read without modification.
 *
 * @param params - Scheduling inputs, including the node, route operations, resources, and work calendar
 * @returns The operation placements and the end time of the final placement, or `null` when no operations are scheduled
 * @throws Error if an operation references an unknown resource group or no eligible resource-center slot is available
 */
export function scheduleForward(params: ForwardParams): ForwardResult {
  const ops = [...params.routeOps].sort((a, b) => a.opNo - b.opNo)
  let notBefore = toEpochMin(alignToWorkingTime(params.startFrom, params.calendar))
  const placements: OpPlacement[] = []

  for (const op of ops) {
    const group = params.rcGroups.get(op.rcGroupId)
    if (!group) throw new Error(`scheduleForward: unknown rcGroup ${op.rcGroupId}`)
    const durationMin = op.durationMin * params.node.effectiveQty

    const found = findEarliestSlot(
      group,
      params.rcById,
      op.opType,
      notBefore,
      durationMin,
      params.occupiedSlots,
      params.calendar,
    )
    if (!found) {
      throw new Error(`scheduleForward: no allowed RC for op ${op.opNo} of ${op.nomenclatureId}`)
    }

    placements.push({ op, rcId: found.rcId, start: found.slot.start, end: found.slot.end })
    notBefore = toEpochMin(nextWorkingDayStart(fromEpochMin(found.slot.end), params.calendar))
  }

  return {
    placements,
    latestEnd: placements.length > 0 ? placements[placements.length - 1]!.end : null,
  }
}
