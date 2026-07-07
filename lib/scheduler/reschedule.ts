import type {
  Order,
  OrderResult,
  ScheduledOperation,
  WorkCalendar,
} from '../types/index.ts'
import { addMinutes, nextWorkingDayStart } from './calendar.ts'
import { findCriticalPath, operationId } from './critical-path.ts'
import { fromEpochMin, toEpochMin } from './time.ts'

function parentBomNodeId(bomNodeId: string): string | null {
  const idx = bomNodeId.lastIndexOf('/')
  return idx === -1 ? null : bomNodeId.slice(0, idx)
}

function utcMidnightMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/** Робочі дні у діапазоні `(from, to]`. */
function countWorkingDays(calendar: WorkCalendar[], from: Date, to: Date): number {
  const fromMs = utcMidnightMs(from)
  const toMs = utcMidnightMs(to)
  if (toMs <= fromMs) return 0
  let count = 0
  for (const entry of calendar) {
    if (!entry.isWorking) continue
    const d = utcMidnightMs(entry.date)
    if (d > fromMs && d <= toMs) count++
  }
  return count
}

/** Предки-предшественники кожної операції (маршрут + дочірні вузли BOM). */
function buildPredecessors(ops: ScheduledOperation[]): Map<string, string[]> {
  const byNode = new Map<string, ScheduledOperation[]>()
  for (const op of ops) {
    const arr = byNode.get(op.bomNodeId)
    if (arr) arr.push(op)
    else byNode.set(op.bomNodeId, [op])
  }
  for (const arr of byNode.values()) arr.sort((a, b) => a.opNo - b.opNo)

  const childrenByParent = new Map<string, string[]>()
  for (const nodeId of byNode.keys()) {
    const parent = parentBomNodeId(nodeId)
    if (parent === null || !byNode.has(parent)) continue
    const arr = childrenByParent.get(parent)
    if (arr) arr.push(nodeId)
    else childrenByParent.set(parent, [nodeId])
  }

  const preds = new Map<string, string[]>()
  for (const [nodeId, nodeOps] of byNode) {
    for (let i = 0; i < nodeOps.length; i++) {
      const id = operationId(nodeOps[i]!)
      if (i > 0) {
        preds.set(id, [operationId(nodeOps[i - 1]!)])
      } else {
        const childPreds: string[] = []
        for (const childId of childrenByParent.get(nodeId) ?? []) {
          const childOps = byNode.get(childId)!
          childPreds.push(operationId(childOps[childOps.length - 1]!))
        }
        preds.set(id, childPreds)
      }
    }
  }
  return preds
}

/** Топологічний порядок opId за предшественниками (Kahn). */
function topoOrder(ids: string[], preds: Map<string, string[]>): string[] {
  const indeg = new Map<string, number>()
  const succ = new Map<string, string[]>()
  for (const id of ids) {
    indeg.set(id, (preds.get(id) ?? []).length)
    for (const p of preds.get(id) ?? []) {
      const arr = succ.get(p)
      if (arr) arr.push(id)
      else succ.set(p, [id])
    }
  }
  const queue = ids.filter((id) => (indeg.get(id) ?? 0) === 0).sort()
  const order: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    order.push(id)
    for (const s of (succ.get(id) ?? []).slice().sort()) {
      const d = (indeg.get(s) ?? 0) - 1
      indeg.set(s, d)
      if (d === 0) queue.push(s)
    }
  }
  // Будь-які невідсортовані (цикл — не має бути) — у кінець.
  for (const id of ids) if (!order.includes(id)) order.push(id)
  return order
}

function recomputeOrders(
  ops: ScheduledOperation[],
  orders: Order[],
  calendar: WorkCalendar[],
): OrderResult[] {
  const results: OrderResult[] = []
  for (const order of orders) {
    const own = ops.filter((o) => o.orderId === order.id)
    if (own.length === 0) {
      results.push({ orderId: order.id, plannedReadyDate: order.dueDate, delayDays: 0, criticalPath: [] })
      continue
    }
    const plannedReadyDate = own.reduce(
      (latest, o) => (o.endAt.getTime() > latest.getTime() ? o.endAt : latest),
      own[0]!.endAt,
    )
    const delayDays =
      plannedReadyDate.getTime() > order.dueDate.getTime()
        ? countWorkingDays(calendar, order.dueDate, plannedReadyDate)
        : 0
    results.push({
      orderId: order.id,
      plannedReadyDate,
      delayDays,
      criticalPath: findCriticalPath(own, order.id),
    })
  }
  return results
}

/**
 * 2.1 — Перерахунок розкладу після ручного перетягування операції (FR-GANTT-07).
 *
 * Переміщена операція фіксується на `newStart`; залежні операції (наступні у
 * маршруті та операції батьківських вузлів BOM) зсуваються вперед так, щоб
 * `start ≥ nextWorkingDayStart(кінець предка)`. Розповсюдження лише вперед —
 * залежні ніколи не тягнуться раніше свого поточного старту. РЦ-призначення не
 * змінюються (MVP). Функція чиста: повертає нові масиви, не мутуючи вхід.
 */
export function applyManualMove(
  operations: ScheduledOperation[],
  movedOpId: string,
  newStart: Date,
  orders: Order[],
  calendar: WorkCalendar[],
): { operations: ScheduledOperation[]; orders: OrderResult[] } {
  const ops = operations.map((o) => ({ ...o }))
  const byId = new Map(ops.map((o) => [operationId(o), o]))
  const moved = byId.get(movedOpId)
  if (!moved) {
    return { operations: ops, orders: recomputeOrders(ops, orders, calendar) }
  }

  const startMin = toEpochMin(newStart)
  moved.startAt = fromEpochMin(startMin)
  moved.endAt = addMinutes(fromEpochMin(startMin), moved.durationMin, calendar)

  const preds = buildPredecessors(ops)
  const order = topoOrder([...byId.keys()], preds)

  for (const id of order) {
    if (id === movedOpId) continue // закріплена
    const op = byId.get(id)
    if (!op) continue
    let earliest = toEpochMin(op.startAt) // не тягнути раніше поточного
    for (const p of preds.get(id) ?? []) {
      const pop = byId.get(p)
      if (!pop) continue
      const req = toEpochMin(nextWorkingDayStart(pop.endAt, calendar))
      if (req > earliest) earliest = req
    }
    if (earliest !== toEpochMin(op.startAt)) {
      op.startAt = fromEpochMin(earliest)
      op.endAt = addMinutes(fromEpochMin(earliest), op.durationMin, calendar)
    }
  }

  return { operations: ops, orders: recomputeOrders(ops, orders, calendar) }
}
