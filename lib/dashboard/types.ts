/** Статус замовлення / вузла BOM (FR-ORD-02). */
export type OrderStatus = 'on-schedule' | 'at-risk' | 'late' | 'blocked-material'

/** Рядок таблиці замовлень (FR-ORD-01). */
export interface OrderRow {
  orderId: string
  productId: string
  qty: number
  dueDate: Date
  plannedReadyDate: Date
  /** Відхилення у робочих днях (0 = вчасно). */
  delayDays: number
  status: OrderStatus
}

/** Підсумковий рядок (FR-ORD-05). */
export interface DashboardSummary {
  total: number
  onSchedule: number
  atRisk: number
  late: number
  blocked: number
}

export interface OrderDashboard {
  rows: OrderRow[]
  summary: DashboardSummary
}

/** Вузол дерева BOM із плановими датами і статусом (FR-ORD-03). */
export interface BomTreeNode {
  bomNodeId: string
  nomenclatureId: string
  level: number
  plannedStart: Date
  plannedEnd: Date
  status: OrderStatus
  children: BomTreeNode[]
}
