/**
 * Публічний API головного дашборду (без React/DOM). Композитить
 * `lib/dashboard` і `lib/material`.
 *
 * @module lib/overview
 */
export type { Overview, BuildOverviewOptions } from './types.ts'
export { buildOverview } from './build.ts'
