/**
 * Публічний API чистої логіки зведення по замовленнях (без React/DOM).
 *
 * @module lib/dashboard
 */
export type {
  OrderStatus,
  OrderRow,
  DashboardSummary,
  OrderDashboard,
  BomTreeNode,
} from './types.ts'
export { buildOrderDashboard, buildBomTree, type BuildDashboardOptions } from './build.ts'
