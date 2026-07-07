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

function utcMidnightMin(date: Date): number {
  return toEpochMin(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())),
  )
}

/**
 * 7.1 — Backward scheduling операцій маршруту вузла (FR-SCHED-02).
 *
 * Операції розставляються від `deadline` назад: остання операція завершується
 * до дедлайну, кожна попередня — до кінця попереднього робочого дня відносно
 * старту наступної (міжопераційний день, FR-SCHED-04). РЦ обирається як
 * найпізніший вільний слот у ГРЦ.
 *
 * 7.2 — Якщо старт будь-якої операції < `today`, повертає `needsForward: true`
 * з `fromOpNo`; розміщення не фіксуються (вузол перепланується forward).
 *
 * Функція чиста: `occupiedSlots` лише читається, не мутується.
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
