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
 * 8.1 — Forward scheduling операцій маршруту вузла (FR-SCHED-03).
 *
 * Операції розставляються від `startFrom` вперед: перша — не раніше `startFrom`,
 * кожна наступна — з початку наступного робочого дня після завершення
 * попередньої (міжопераційний день, FR-SCHED-04). РЦ обирається як найраніший
 * вільний слот у ГРЦ.
 *
 * Функція чиста: `occupiedSlots` лише читається.
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
