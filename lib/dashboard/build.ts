import type {
  MaterialDeficit,
  OperationStatus,
  Order,
  OrderResult,
  ScheduledOperation,
  WorkCalendar,
} from '../types/index.ts'
import type {
  BomTreeNode,
  DashboardSummary,
  OrderDashboard,
  OrderRow,
  OrderStatus,
} from './types.ts'

const SEVERITY: Record<OrderStatus, number> = {
  'on-schedule': 0,
  'at-risk': 1,
  late: 2,
  'blocked-material': 3,
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

/** Найгірший (найкритичніший) статус із набору статусів операцій. */
function worstStatus(statuses: OperationStatus[]): OrderStatus {
  let worst: OrderStatus = 'on-schedule'
  for (const s of statuses) {
    const mapped: OrderStatus = s === 'ok' ? 'on-schedule' : s
    if (SEVERITY[mapped] > SEVERITY[worst]) worst = mapped
  }
  return worst
}

export interface BuildDashboardOptions {
  orders: Order[]
  orderResults: OrderResult[]
  deficits: MaterialDeficit[]
  calendar: WorkCalendar[]
}

/**
 * 1.2 — Таблиця замовлень зі статусами, сортуванням і підсумком
 * (FR-ORD-01/02/04/05). Чиста функція.
 */
export function buildOrderDashboard(opts: BuildDashboardOptions): OrderDashboard {
  const resultById = new Map(opts.orderResults.map((r) => [r.orderId, r]))
  const blocked = new Set<string>()
  for (const d of opts.deficits) for (const oid of d.blockedOrderIds) blocked.add(oid)

  const rows: OrderRow[] = opts.orders.map((order) => {
    const result = resultById.get(order.id)
    const plannedReadyDate = result?.plannedReadyDate ?? order.dueDate
    const delayDays = result?.delayDays ?? 0

    let status: OrderStatus
    if (blocked.has(order.id)) {
      status = 'blocked-material'
    } else if (delayDays > 0) {
      status = 'late'
    } else if (countWorkingDays(opts.calendar, plannedReadyDate, order.dueDate) <= 2) {
      status = 'at-risk'
    } else {
      status = 'on-schedule'
    }

    return {
      orderId: order.id,
      productId: order.productId,
      qty: order.qty,
      dueDate: order.dueDate,
      plannedReadyDate,
      delayDays,
      status,
    }
  })

  rows.sort((a, b) => {
    if (a.delayDays !== b.delayDays) return b.delayDays - a.delayDays
    if (SEVERITY[a.status] !== SEVERITY[b.status]) return SEVERITY[b.status] - SEVERITY[a.status]
    return a.orderId.localeCompare(b.orderId)
  })

  const summary: DashboardSummary = {
    total: rows.length,
    onSchedule: rows.filter((r) => r.status === 'on-schedule').length,
    atRisk: rows.filter((r) => r.status === 'at-risk').length,
    late: rows.filter((r) => r.status === 'late').length,
    blocked: rows.filter((r) => r.status === 'blocked-material').length,
  }

  return { rows, summary }
}

function parentBomNodeId(bomNodeId: string): string | null {
  const idx = bomNodeId.lastIndexOf('/')
  return idx === -1 ? null : bomNodeId.slice(0, idx)
}

/**
 * 1.3 — Дерево BOM замовлення з плановими датами і статусами вузлів (FR-ORD-03).
 *
 * Вузол = група операцій одного `bomNodeId`: `plannedStart = min(start)`,
 * `plannedEnd = max(end)`, статус = найгірший статус операцій. Ієрархія
 * відновлюється з шляхових id; повертаються корені. Чиста функція.
 */
export function buildBomTree(operations: ScheduledOperation[], orderId: string): BomTreeNode[] {
  const own = operations.filter((o) => o.orderId === orderId)
  if (own.length === 0) return []

  const byNode = new Map<string, ScheduledOperation[]>()
  for (const op of own) {
    const arr = byNode.get(op.bomNodeId)
    if (arr) arr.push(op)
    else byNode.set(op.bomNodeId, [op])
  }

  const nodes = new Map<string, BomTreeNode>()
  for (const [bomNodeId, ops] of byNode) {
    const plannedStart = ops.reduce(
      (min, o) => (o.startAt.getTime() < min.getTime() ? o.startAt : min),
      ops[0]!.startAt,
    )
    const plannedEnd = ops.reduce(
      (max, o) => (o.endAt.getTime() > max.getTime() ? o.endAt : max),
      ops[0]!.endAt,
    )
    nodes.set(bomNodeId, {
      bomNodeId,
      nomenclatureId: ops[0]!.nomenclatureId,
      level: 0,
      plannedStart,
      plannedEnd,
      status: worstStatus(ops.map((o) => o.status)),
      children: [],
    })
  }

  const roots: BomTreeNode[] = []
  for (const node of [...nodes.values()].sort((a, b) => a.bomNodeId.localeCompare(b.bomNodeId))) {
    const parentId = parentBomNodeId(node.bomNodeId)
    const parent = parentId ? nodes.get(parentId) : undefined
    if (parent) {
      node.level = 0 // тимчасово; глибина проставляється нижче
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Проставити рівні від коренів.
  const setLevels = (node: BomTreeNode, level: number): void => {
    node.level = level
    for (const child of node.children) setLevels(child, level + 1)
  }
  for (const root of roots) setLevels(root, 0)

  return roots
}
