/**
 * Публічний API порівняння сценаріїв (без React/DOM).
 *
 * @module lib/scenario
 */
export type {
  MetricKey,
  MetricDirection,
  ScenarioSummary,
  ComparisonRow,
  Comparison,
} from './types.ts'
export { MAX_SCENARIOS, METRIC_KEYS, DIRECTIONS } from './types.ts'
export { buildComparison, canAddScenario } from './compare.ts'
