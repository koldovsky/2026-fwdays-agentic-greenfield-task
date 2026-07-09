import type {
  Order,
  OrderResult,
  ScheduledOperation,
  WorkCalendar,
} from '../types/index.ts'
import { addMinutes, nextWorkingDayStart } from './calendar.ts'
import { findCriticalPath } from './critical-path.ts'
import { buildPredecessors, operationId } from './dependencies.ts'
import { countWorkingDays } from './time.ts'
import { fromEpochMin, toEpochMin } from './time.ts'

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
  let head = 0
  while (head < queue.length) {
    const id = queue[head++]!
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
