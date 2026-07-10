import type {
  CapacitySlot,
  MaterialDeficit,
  Order,
  OrderResult,
  WorkCalendar,
} from '../types/index.ts'
import type { DashboardSummary, OrderRow } from '../dashboard/index.ts'

/** Зведення головного дашборду — 4 KPI-блоки (FR-DASH-01). */
export interface Overview {
  statusCounts: DashboardSummary
  /** До 5 замовлень із найбільшим відхиленням (delayDays > 0). */
  topDelays: OrderRow[]
  /** Матеріали з критичним дефіцитом (без надходжень, що покривають). */
  criticalDeficits: MaterialDeficit[]
  /** Слоти завантаженості > 100 % (спадно). */
  overloadedCells: CapacitySlot[]
}

export interface BuildOverviewOptions {
  orders: Order[]
  orderResults: OrderResult[]
  deficits: MaterialDeficit[]
  capacity: CapacitySlot[]
  calendar: WorkCalendar[]
}
