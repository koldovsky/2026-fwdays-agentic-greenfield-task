import type { MetricKey, Comparison, ScenarioSummary } from './types.ts'
import { DIRECTIONS, MAX_SCENARIOS, METRIC_KEYS } from './types.ts'

/**
 * Determines whether another scenario can be added within the configured scenario limit.
 *
 * @param count - The number of scenarios currently present
 * @returns `true` if the count is below the maximum, `false` otherwise
 */
export function canAddScenario(count: number): boolean {
  return count < MAX_SCENARIOS
}

/**
 * Builds a comparison table for scenarios and identifies the best scenario or scenarios for each metric.
 *
 * @param scenarios - The scenario summaries to compare
 * @param acceptedId - The ID of the accepted scenario, or `null` if none is accepted
 * @returns Comparison rows, best scenario IDs by metric, and metric directions
 */
export function buildComparison(
  scenarios: ScenarioSummary[],
  acceptedId: string | null,
): Comparison {
  const rows = scenarios.map((s) => ({
    id: s.id,
    name: s.name,
    mode: s.mode,
    metrics: s.metrics,
    isAccepted: s.id === acceptedId,
  }))

  const best = {} as Record<MetricKey, string[]>
  for (const key of METRIC_KEYS) {
    if (scenarios.length === 0) {
      best[key] = []
      continue
    }
    const dir = DIRECTIONS[key]
    let bestVal = dir === 'lower' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
    for (const s of scenarios) {
      const v = s.metrics[key]
      if (dir === 'lower' ? v < bestVal : v > bestVal) bestVal = v
    }
    best[key] = scenarios
      .filter((s) => Math.abs(s.metrics[key] - bestVal) < 1e-9)
      .map((s) => s.id)
  }

  return { rows, best, directions: DIRECTIONS }
}
