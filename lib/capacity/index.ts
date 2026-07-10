/**
 * Публічний API чистої агрегації завантаженості (без залежностей від Recharts,
 * React чи DOM).
 *
 * @module lib/capacity
 */
export type {
  CapacityUnit,
  CapacityLevel,
  CapacitySeries,
  CellOp,
  CapacityKpis,
  CapacityRow,
  CapacityView,
} from './types.ts'
export { pickUnit } from './unit.ts'
export { buildCapacityView, type BuildCapacityOptions } from './aggregate.ts'
