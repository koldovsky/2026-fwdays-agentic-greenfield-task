import type { ScheduleMetrics, ScheduleMode } from '../types/index.ts'

/** Максимум одночасних сценаріїв (FR-SCEN-01). */
export const MAX_SCENARIOS = 3

/** Ключ метрики порівняння. */
export type MetricKey = keyof ScheduleMetrics

/** Напрямок «краще» для метрики. */
export type MetricDirection = 'lower' | 'higher'

/** Порядок метрик у таблиці порівняння (FR-SCEN-02). */
export const METRIC_KEYS: MetricKey[] = [
  'lateOrdersCount',
  'totalDelayDays',
  'avgLoadPct',
  'overloadedSlotsCount',
  'wipCount',
]

/** Напрямок «краще» для кожної метрики. */
export const DIRECTIONS: Record<MetricKey, MetricDirection> = {
  lateOrdersCount: 'lower',
  totalDelayDays: 'lower',
  avgLoadPct: 'higher',
  overloadedSlotsCount: 'lower',
  wipCount: 'lower',
}

/** Сценарій для порівняння (лише метрики). */
export interface ScenarioSummary {
  id: string
  name: string
  mode: ScheduleMode
  metrics: ScheduleMetrics
}

export interface ComparisonRow {
  id: string
  name: string
  mode: ScheduleMode
  metrics: ScheduleMetrics
  isAccepted: boolean
}

export interface Comparison {
  rows: ComparisonRow[]
  /** id сценаріїв, найкращих за кожною метрикою. */
  best: Record<MetricKey, string[]>
  directions: Record<MetricKey, MetricDirection>
}
