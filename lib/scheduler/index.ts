import type {
  BomNode,
  CapacitySlot,
  ExpandedNode,
  MaterialDeficit,
  Order,
  OrderResult,
  RcGroup,
  ResourceCenter,
  RouteOperation,
  ScheduledOperation,
  ScheduleInput,
  ScheduleMode,
  ScheduleResult,
  WorkCalendar,
} from '../types/index.ts'
import { expandBom } from '../bom/expand.ts'
import { calcGrossRequirements } from '../mrp/gross-requirements.ts'
import { buildMaterialDeficits } from '../mrp/net-requirements.ts'
import { scheduleBackward, type OpPlacement } from './backward.ts'
import { scheduleForward } from './forward.ts'
import { findCriticalPath } from './critical-path.ts'
import { calcCR } from './critical-ratio.ts'
import type { OccupiedSlots } from './assign-rc.ts'
import {
  getWorkingMinutesForRc,
  nextWorkingDayStart,
  previousWorkingDayEnd,
} from './calendar.ts'
import { countWorkingDays, fromEpochMin, toEpochMin, utcMidnightMs } from './time.ts'

const MS_PER_DAY = 86_400_000

/** Консолідований виробничий блок (одна номенклатура = один блок). */
interface Block {
  nomenclatureId: string
  type: BomNode['type']
  totalQty: number
  orderIds: string[]
  routeOps: RouteOperation[]
  childNoms: string[]
  parentNoms: string[]
  /** Дочірні матеріали з дефіцитом (для позначення blocked-material). */
  deficitMaterialId: string | null
}


/**
 * Consolidates expanded nodes into blocks grouped by nomenclature.
 *
 * Each block aggregates required quantity and order identifiers, and includes
 * route operations, BOM relationships, and the first child nomenclature with a
 * material deficit, when applicable.
 *
 * @param expandedNodes - Expanded BOM nodes to consolidate
 * @param bom - BOM relationships used to build parent and child nomenclature links
 * @param routes - Route operations associated with each nomenclature
 * @param deficits - Material deficits associated with child nomenclatures
 * @returns Blocks keyed by nomenclature identifier
 */
function buildBlocks(
  expandedNodes: ExpandedNode[],
  bom: BomNode[],
  routes: RouteOperation[],
  deficits: MaterialDeficit[],
): Map<string, Block> {
  const routesByNom = new Map<string, RouteOperation[]>()
  for (const r of routes) {
    const arr = routesByNom.get(r.nomenclatureId)
    if (arr) arr.push(r)
    else routesByNom.set(r.nomenclatureId, [r])
  }
  const deficitByNom = new Map(deficits.map((d) => [d.nomenclatureId, d]))

  // Ребра батько → дитина на рівні номенклатур.
  const childNoms = new Map<string, Set<string>>()
  const parentNoms = new Map<string, Set<string>>()
  for (const edge of bom) {
    if (edge.parentId === null) continue
    if (!childNoms.has(edge.parentId)) childNoms.set(edge.parentId, new Set())
    childNoms.get(edge.parentId)!.add(edge.childId)
    if (!parentNoms.has(edge.childId)) parentNoms.set(edge.childId, new Set())
    parentNoms.get(edge.childId)!.add(edge.parentId)
  }

  const blocks = new Map<string, Block>()
  for (const node of expandedNodes) {
    const existing = blocks.get(node.nomenclatureId)
    if (existing) {
      existing.totalQty += node.effectiveQty
      if (!existing.orderIds.includes(node.orderId)) existing.orderIds.push(node.orderId)
    } else {
      const children = [...(childNoms.get(node.nomenclatureId) ?? [])]
      const deficitMaterial = children.find((c) => deficitByNom.has(c)) ?? null
      blocks.set(node.nomenclatureId, {
        nomenclatureId: node.nomenclatureId,
        type: node.type,
        totalQty: node.effectiveQty,
        orderIds: [node.orderId],
        routeOps: routesByNom.get(node.nomenclatureId) ?? [],
        childNoms: children,
        parentNoms: [...(parentNoms.get(node.nomenclatureId) ?? [])],
        deficitMaterialId: deficitMaterial,
      })
    }
  }
  // Відсортувати orderIds для детермінізму.
  for (const b of blocks.values()) b.orderIds.sort()
  return blocks
}

/**
 * Creates a synthetic expanded node representing a scheduling block.
 *
 * @param block - The block to represent as an expanded node
 * @returns An expanded node containing the block's nomenclature, quantity, type, and primary order
 */
function syntheticNode(block: Block): ExpandedNode {
  return {
    id: `#${block.nomenclatureId}`,
    orderId: block.orderIds[0] ?? '',
    nomenclatureId: block.nomenclatureId,
    effectiveQty: block.totalQty,
    level: 0,
    type: block.type,
    parentExpandedId: null,
  }
}

interface PlacementState {
  placements: Map<string, OpPlacement[]>
  startByBlock: Map<string, number>
  completionByBlock: Map<string, number>
}

/**
 * Records operation placements in the occupied time slots for each resource center.
 *
 * @param occupied - The shared map of occupied time slots keyed by resource center ID.
 * @param placements - The operation placements to record.
 */
function commit(occupied: OccupiedSlots, placements: OpPlacement[]): void {
  for (const p of placements) {
    const arr = occupied.get(p.rcId)
    if (arr) arr.push({ start: p.start, end: p.end })
    else occupied.set(p.rcId, [{ start: p.start, end: p.end }])
  }
}

/**
 * Computes the scheduling priority ratio for a block across its consuming orders.
 *
 * @param block - The block whose consuming orders are evaluated
 * @param orderById - Orders indexed by identifier
 * @param today - The date used for the calculation
 * @param calendar - The working calendar used for the calculation
 * @returns The smallest ratio among matching orders, or `Infinity` when none are found
 */
function blockCR(
  block: Block,
  orderById: Map<string, Order>,
  today: Date,
  calendar: WorkCalendar[],
): number {
  let min = Number.POSITIVE_INFINITY
  for (const orderId of block.orderIds) {
    const order = orderById.get(orderId)
    if (!order) continue
    const cr = calcCR(order, block.routeOps, today, calendar, block.totalQty)
    if (cr < min) min = cr
  }
  return min
}

/**
 * Schedules blocks backward from their deadlines using critical-ratio priority and dependency ordering.
 *
 * @param blocks - Blocks to schedule, keyed by nomenclature identifier
 * @param orders - Orders that determine block deadlines
 * @param orderById - Orders indexed by identifier
 * @param rcGroups - Resource-center groups available for scheduling
 * @param rcById - Resource centers indexed by identifier
 * @param calendar - Working calendar used for scheduling and deadline calculations
 * @param today - Current scheduling date
 * @returns Placement state containing block operation placements, start times, and completion times
 */
function backwardPass(
  blocks: Map<string, Block>,
  orders: Order[],
  orderById: Map<string, Order>,
  rcGroups: Map<string, RcGroup>,
  rcById: Map<string, ResourceCenter>,
  calendar: WorkCalendar[],
  today: Date,
): PlacementState {
  const deadlineMin = new Map<string, number>()
  for (const order of orders) {
    const cur = deadlineMin.get(order.productId)
    const due = toEpochMin(order.dueDate)
    deadlineMin.set(order.productId, cur === undefined ? due : Math.min(cur, due))
  }

  // Kahn корінь-перший: in-degree = кількість батьків серед блоків.
  const remainingParents = new Map<string, number>()
  for (const b of blocks.values()) {
    remainingParents.set(b.nomenclatureId, b.parentNoms.filter((p) => blocks.has(p)).length)
  }

  const occupied: OccupiedSlots = new Map()
  const state: PlacementState = {
    placements: new Map(),
    startByBlock: new Map(),
    completionByBlock: new Map(),
  }

  // CR кожного блоку статичний упродовж проходу — обчислити один раз.
  const crByBlock = new Map<string, number>()
  for (const b of blocks.values()) {
    crByBlock.set(b.nomenclatureId, blockCR(b, orderById, today, calendar))
  }
  const defaultDeadlineMin = toEpochMin(defaultDeadline(orders))

  const ready = [...blocks.values()].filter((b) => (remainingParents.get(b.nomenclatureId) ?? 0) === 0)
  const done = new Set<string>()

  while (ready.length > 0) {
    // Лінійний вибір найурочнішого (менший CR), тай-брейк за номенклатурою.
    let bestIdx = 0
    for (let i = 1; i < ready.length; i++) {
      const cand = ready[i]!
      const best = ready[bestIdx]!
      const cc = crByBlock.get(cand.nomenclatureId)!
      const cb = crByBlock.get(best.nomenclatureId)!
      if (cc < cb || (cc === cb && cand.nomenclatureId < best.nomenclatureId)) bestIdx = i
    }
    const block = ready[bestIdx]!
    ready.splice(bestIdx, 1)
    if (done.has(block.nomenclatureId)) continue
    done.add(block.nomenclatureId)

    const deadline = deadlineMin.get(block.nomenclatureId) ?? defaultDeadlineMin
    let placements: OpPlacement[] = []
    let startMin = deadline
    let completionMin = deadline

    if (block.type !== 'material' && block.routeOps.length > 0) {
      const node = syntheticNode(block)
      const res = scheduleBackward({
        node,
        routeOps: block.routeOps,
        deadline: fromEpochMin(deadline),
        rcGroups,
        rcById,
        occupiedSlots: occupied,
        calendar,
        today,
      })
      if (res.needsForward) {
        const fwd = scheduleForward({
          node,
          routeOps: block.routeOps,
          startFrom: today,
          rcGroups,
          rcById,
          occupiedSlots: occupied,
          calendar,
        })
        placements = fwd.placements
      } else {
        placements = res.placements
      }
      commit(occupied, placements)
      if (placements.length > 0) {
        startMin = placements[0]!.start
        completionMin = placements.reduce((m, p) => Math.max(m, p.end), placements[0]!.end)
      }
    }

    state.placements.set(block.nomenclatureId, placements)
    state.startByBlock.set(block.nomenclatureId, startMin)
    state.completionByBlock.set(block.nomenclatureId, completionMin)

    // Дедлайн дітей = кінець попереднього робочого дня відносно старту блоку.
    const childDeadline = toEpochMin(previousWorkingDayEnd(fromEpochMin(startMin), calendar))
    for (const childNom of block.childNoms) {
      if (!blocks.has(childNom)) continue
      const cur = deadlineMin.get(childNom)
      deadlineMin.set(childNom, cur === undefined ? childDeadline : Math.min(cur, childDeadline))
      const rp = (remainingParents.get(childNom) ?? 1) - 1
      remainingParents.set(childNom, rp)
      if (rp === 0) ready.push(blocks.get(childNom)!)
    }
  }

  return state
}

/**
 * Schedules blocks forward from today using shortest-processing-time priority, progressing from leaf blocks to their parents.
 *
 * Blocks start after all scheduled child blocks complete and the next working day begins. Blocks without route operations or representing materials receive no placements.
 *
 * @returns The resulting placements and start and completion times for each block.
 */
function forwardPass(
  blocks: Map<string, Block>,
  rcGroups: Map<string, RcGroup>,
  rcById: Map<string, ResourceCenter>,
  calendar: WorkCalendar[],
  today: Date,
): PlacementState {
  const remainingChildren = new Map<string, number>()
  for (const b of blocks.values()) {
    remainingChildren.set(b.nomenclatureId, b.childNoms.filter((c) => blocks.has(c)).length)
  }

  const occupied: OccupiedSlots = new Map()
  const state: PlacementState = {
    placements: new Map(),
    startByBlock: new Map(),
    completionByBlock: new Map(),
  }
  const todayMin = toEpochMin(today)

  const workloadByBlock = new Map<string, number>()
  for (const b of blocks.values()) {
    workloadByBlock.set(
      b.nomenclatureId,
      b.routeOps.reduce((s, op) => s + op.durationMin * b.totalQty, 0),
    )
  }

  const ready = [...blocks.values()].filter(
    (b) => (remainingChildren.get(b.nomenclatureId) ?? 0) === 0,
  )
  const done = new Set<string>()

  while (ready.length > 0) {
    // Лінійний вибір найкоротшої трудомісткості (SPT), тай-брейк за номенклатурою.
    let bestIdx = 0
    for (let i = 1; i < ready.length; i++) {
      const cand = ready[i]!
      const best = ready[bestIdx]!
      const wc = workloadByBlock.get(cand.nomenclatureId)!
      const wb = workloadByBlock.get(best.nomenclatureId)!
      if (wc < wb || (wc === wb && cand.nomenclatureId < best.nomenclatureId)) bestIdx = i
    }
    const block = ready[bestIdx]!
    ready.splice(bestIdx, 1)
    if (done.has(block.nomenclatureId)) continue
    done.add(block.nomenclatureId)

    // Старт не раніше завершення всіх дітей + міжопераційний день.
    let startFromMin = todayMin
    for (const childNom of block.childNoms) {
      if (!blocks.has(childNom)) continue
      const childCompletion = state.completionByBlock.get(childNom)
      if (childCompletion === undefined) continue
      const gated = toEpochMin(nextWorkingDayStart(fromEpochMin(childCompletion), calendar))
      if (gated > startFromMin) startFromMin = gated
    }

    let placements: OpPlacement[] = []
    let startMin = startFromMin
    let completionMin = startFromMin

    if (block.type !== 'material' && block.routeOps.length > 0) {
      const node = syntheticNode(block)
      const fwd = scheduleForward({
        node,
        routeOps: block.routeOps,
        startFrom: fromEpochMin(startFromMin),
        rcGroups,
        rcById,
        occupiedSlots: occupied,
        calendar,
      })
      placements = fwd.placements
      commit(occupied, placements)
      if (placements.length > 0) {
        startMin = placements[0]!.start
        completionMin = fwd.latestEnd ?? startFromMin
      }
    }

    state.placements.set(block.nomenclatureId, placements)
    state.startByBlock.set(block.nomenclatureId, startMin)
    state.completionByBlock.set(block.nomenclatureId, completionMin)

    for (const parentNom of block.parentNoms) {
      if (!blocks.has(parentNom)) continue
      const rc = (remainingChildren.get(parentNom) ?? 1) - 1
      remainingChildren.set(parentNom, rc)
      if (rc === 0) ready.push(blocks.get(parentNom)!)
    }
  }

  return state
}

/**
 * Determines the fallback deadline for blocks without a root order deadline.
 *
 * @param orders - Orders whose due dates are considered
 * @returns The latest order due date, or the Unix epoch when no orders are provided
 */
function defaultDeadline(orders: Order[]): Date {
  // Найпізніший дедлайн як запасний варіант для блоків без замовлення-кореня.
  let latest = orders[0]?.dueDate ?? new Date(0)
  for (const o of orders) if (o.dueDate > latest) latest = o.dueDate
  return latest
}

/**
 * Converts scheduled block placements into operations with order references, timing, duration, and delivery status.
 *
 * @returns Deterministically ordered scheduled operations, including material-blocking and delivery-risk statuses.
 */
function buildOperations(
  blocks: Map<string, Block>,
  state: PlacementState,
  orderById: Map<string, Order>,
  expandedNodes: ExpandedNode[],
  calendar: WorkCalendar[],
): ScheduledOperation[] {
  // Канонічний bomNodeId блоку = id першого входження первинного замовлення.
  const primaryOrderOf = (block: Block): string => {
    let best = block.orderIds[0] ?? ''
    let bestDue = orderById.get(best)?.dueDate.getTime() ?? Number.POSITIVE_INFINITY
    for (const oid of block.orderIds) {
      const due = orderById.get(oid)?.dueDate.getTime() ?? Number.POSITIVE_INFINITY
      if (due < bestDue || (due === bestDue && oid < best)) {
        best = oid
        bestDue = due
      }
    }
    return best
  }
  const expandedIdOf = new Map<string, string>()
  for (const en of expandedNodes) {
    const key = `${en.orderId}|${en.nomenclatureId}`
    if (!expandedIdOf.has(key)) expandedIdOf.set(key, en.id)
  }

  const operations: ScheduledOperation[] = []
  for (const block of blocks.values()) {
    const placements = state.placements.get(block.nomenclatureId) ?? []
    if (placements.length === 0) continue
    const primaryOrder = primaryOrderOf(block)
    const bomNodeId = expandedIdOf.get(`${primaryOrder}|${block.nomenclatureId}`) ?? `#${block.nomenclatureId}`
    const due = orderById.get(primaryOrder)?.dueDate ?? null

    for (const p of placements) {
      const endDate = fromEpochMin(p.end)
      let status: ScheduledOperation['status'] = 'ok'
      if (block.deficitMaterialId) {
        status = 'blocked-material'
      } else if (due) {
        if (endDate.getTime() > due.getTime()) status = 'late'
        else if (countWorkingDays(calendar, endDate, due) <= 2) status = 'at-risk'
      }
      operations.push({
        orderId: primaryOrder,
        bomNodeId,
        nomenclatureId: block.nomenclatureId,
        opNo: p.op.opNo,
        opName: p.op.opName,
        rcGroupId: p.op.rcGroupId,
        rcId: p.rcId,
        startAt: fromEpochMin(p.start),
        endAt: endDate,
        durationMin: p.op.durationMin * block.totalQty,
        status,
        ...(block.deficitMaterialId ? { blockedByMaterialId: block.deficitMaterialId } : {}),
      })
    }
  }
  // Детермінований порядок виводу.
  operations.sort((a, b) => {
    if (a.startAt.getTime() !== b.startAt.getTime()) return a.startAt.getTime() - b.startAt.getTime()
    if (a.nomenclatureId !== b.nomenclatureId) return a.nomenclatureId.localeCompare(b.nomenclatureId)
    return a.opNo - b.opNo
  })
  return operations
}

/**
 * Builds per-order scheduling results from the expanded BOM and block placements.
 *
 * @param orders - Orders for which to build results
 * @param state - Scheduling placements and block completion times
 * @param expandedNodes - BOM-expanded nodes associated with each order
 * @param routes - Route operations for the expanded nomenclatures
 * @param calendar - Work calendar used to calculate delay days
 * @returns Scheduling results in the same order as `orders`
 */
function buildOrderResults(
  orders: Order[],
  state: PlacementState,
  expandedNodes: ExpandedNode[],
  routes: RouteOperation[],
  calendar: WorkCalendar[],
): OrderResult[] {
  const routesByNom = new Map<string, RouteOperation[]>()
  for (const r of routes) {
    const arr = routesByNom.get(r.nomenclatureId)
    if (arr) arr.push(r)
    else routesByNom.set(r.nomenclatureId, [r])
  }
  // Розміщення блоку за opNo для швидкого зіставлення.
  const placementByNomOp = new Map<string, OpPlacement>()
  for (const [nom, placements] of state.placements) {
    for (const p of placements) placementByNomOp.set(`${nom}|${p.op.opNo}`, p)
  }

  const nodesByOrder = new Map<string, ExpandedNode[]>()
  for (const en of expandedNodes) {
    const arr = nodesByOrder.get(en.orderId)
    if (arr) arr.push(en)
    else nodesByOrder.set(en.orderId, [en])
  }

  const results: OrderResult[] = []
  for (const order of orders) {
    const orderNodes = nodesByOrder.get(order.id) ?? []
    // Per-order подання операцій (bomNodeId — шлях цього замовлення).
    const view: ScheduledOperation[] = []
    for (const en of orderNodes) {
      const ops = routesByNom.get(en.nomenclatureId) ?? []
      for (const op of ops) {
        const p = placementByNomOp.get(`${en.nomenclatureId}|${op.opNo}`)
        if (!p) continue
        view.push({
          orderId: order.id,
          bomNodeId: en.id,
          nomenclatureId: en.nomenclatureId,
          opNo: op.opNo,
          opName: op.opName,
          rcGroupId: op.rcGroupId,
          rcId: p.rcId,
          startAt: fromEpochMin(p.start),
          endAt: fromEpochMin(p.end),
          durationMin: p.end - p.start,
          status: 'ok',
        })
      }
    }

    let plannedReadyMin: number
    if (view.length > 0) {
      plannedReadyMin = view.reduce((m, o) => Math.max(m, toEpochMin(o.endAt)), toEpochMin(view[0]!.endAt))
    } else {
      // Немає операцій — готовність визначається завершенням кореня/дедлайном.
      plannedReadyMin = state.completionByBlock.get(order.productId) ?? toEpochMin(order.dueDate)
    }
    const plannedReadyDate = fromEpochMin(plannedReadyMin)
    const delayDays =
      plannedReadyDate.getTime() > order.dueDate.getTime()
        ? countWorkingDays(calendar, order.dueDate, plannedReadyDate)
        : 0

    results.push({
      orderId: order.id,
      plannedReadyDate,
      delayDays,
      criticalPath: findCriticalPath(view, order.id),
    })
  }
  return results
}

/**
 * Computes resource-center capacity utilization for each working day covered by scheduled operations.
 *
 * @param operations - Scheduled operations whose resource-center usage is measured
 * @param resourceCenters - Resource centers used to determine daily capacity
 * @param calendar - Working calendar used to determine daily planning windows
 * @returns Capacity slots containing used minutes, total capacity, and utilization percentage
 */
function buildCapacity(
  operations: ScheduledOperation[],
  resourceCenters: ResourceCenter[],
  calendar: WorkCalendar[],
): CapacitySlot[] {
  const rcById = new Map(resourceCenters.map((rc) => [rc.id, rc]))
  // Вікно доби плану (плановий фонд заводу) — для обчислення фактично зайнятих хв.
  const dayWindowMin = new Map<number, number>()
  for (const entry of calendar) {
    if (entry.isWorking && entry.workingMinutes > 0) {
      dayWindowMin.set(utcMidnightMs(entry.date), entry.workingMinutes)
    }
  }
  const used = new Map<string, number>() // `${rcId}|${dayMs}` → usedMin

  for (const op of operations) {
    const startMs = op.startAt.getTime()
    const endMs = op.endAt.getTime()
    let dayMs = utcMidnightMs(op.startAt)
    const lastDay = utcMidnightMs(op.endAt)
    while (dayMs <= lastDay) {
      const windowMin = dayWindowMin.get(dayMs) ?? 0
      const windowStart = dayMs
      const windowEnd = dayMs + windowMin * 60_000
      const overlapMs = Math.max(0, Math.min(endMs, windowEnd) - Math.max(startMs, windowStart))
      if (overlapMs > 0) {
        const key = `${op.rcId}|${dayMs}`
        used.set(key, (used.get(key) ?? 0) + overlapMs / 60_000)
      }
      dayMs += MS_PER_DAY
    }
  }

  const slots: CapacitySlot[] = []
  for (const [key, usedMin] of used) {
    const sep = key.lastIndexOf('|')
    const rcId = key.slice(0, sep)
    const dayMs = Number(key.slice(sep + 1))
    const rc = rcById.get(rcId)
    const totalMin = rc ? getWorkingMinutesForRc(rc, new Date(dayMs), calendar) : 0
    slots.push({
      rcId,
      date: new Date(dayMs),
      usedMin: Math.round(usedMin),
      totalMin,
      loadPct: totalMin > 0 ? (usedMin / totalMin) * 100 : 0,
    })
  }
  slots.sort((a, b) => {
    if (a.date.getTime() !== b.date.getTime()) return a.date.getTime() - b.date.getTime()
    return a.rcId.localeCompare(b.rcId)
  })
  return slots
}

/**
 * Builds a production schedule from orders, BOM data, materials, routes, resources, and calendar constraints.
 *
 * @param input - Production data and scheduling horizon.
 * @param mode - Scheduling strategy: `min-lateness` uses backward scheduling with critical-ratio priority; `min-idle` uses forward scheduling with shortest-processing-time priority.
 * @returns The scheduled operations, per-order results, capacity utilization, material deficits, and aggregate scheduling metrics.
 */
export function schedule(input: ScheduleInput, mode: ScheduleMode): ScheduleResult {
  const orderById = new Map(input.orders.map((o) => [o.id, o]))
  const rcGroups = new Map(input.rcGroups.map((g) => [g.id, g]))
  const rcById = new Map(input.resourceCenters.map((rc) => [rc.id, rc]))

  // Фаза 1 — розгортання BOM.
  const expandedNodes = expandBom(input.orders, input.bom)

  // Фаза 2 — MRP і дефіцити.
  const gross = calcGrossRequirements(expandedNodes)
  const deficits = buildMaterialDeficits(gross, input.stock, input.plannedReceipts)

  // Консолідація у блоки.
  const blocks = buildBlocks(expandedNodes, input.bom, input.routes, deficits)

  // Фази 3–5 — розклад операцій.
  const state =
    mode === 'min-lateness'
      ? backwardPass(blocks, input.orders, orderById, rcGroups, rcById, input.calendar, input.today)
      : forwardPass(blocks, rcGroups, rcById, input.calendar, input.today)

  // Вихідні структури.
  const operations = buildOperations(blocks, state, orderById, expandedNodes, input.calendar)
  const orderResults = buildOrderResults(
    input.orders,
    state,
    expandedNodes,
    input.routes,
    input.calendar,
  )
  const capacity = buildCapacity(operations, input.resourceCenters, input.calendar)

  // Метрики.
  const lateOrders = orderResults.filter((o) => o.delayDays > 0)
  const activeSlots = capacity.filter((s) => s.usedMin > 0)
  const avgLoadPct =
    activeSlots.length > 0
      ? activeSlots.reduce((s, c) => s + c.loadPct, 0) / activeSlots.length
      : 0
  const overloadedSlotsCount = capacity.filter((s) => s.loadPct > 100 + 1e-9).length

  const todayMin = toEpochMin(input.today)
  let wipCount = 0
  for (const [nom, start] of state.startByBlock) {
    const completion = state.completionByBlock.get(nom) ?? start
    const placements = state.placements.get(nom) ?? []
    if (placements.length > 0 && start <= todayMin && todayMin < completion) wipCount++
  }

  return {
    operations,
    orders: orderResults,
    capacity,
    deficits,
    metrics: {
      lateOrdersCount: lateOrders.length,
      totalDelayDays: lateOrders.reduce((s, o) => s + o.delayDays, 0),
      avgLoadPct,
      overloadedSlotsCount,
      wipCount,
    },
  }
}
