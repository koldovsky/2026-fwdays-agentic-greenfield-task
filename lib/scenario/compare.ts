import type { MetricKey, Comparison, ScenarioSummary } from './types.ts'
import { DIRECTIONS, MAX_SCENARIOS, METRIC_KEYS } from './types.ts'

/** 1.3 — Чи можна додати ще один сценарій (ліміт 3, FR-SCEN-01). */
export function canAddScenario(count: number): boolean {
  return count < MAX_SCENARIOS
}

/**
 * 1.2 — Таблиця порівняння сценаріїв (FR-SCEN-02). Для кожної метрики визначає
 * найкращий(і) сценарій(ї) за напрямком «краще»; позначає прийнятий сценарій.
 * Чиста функція.
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
