import { describe, it, expect } from 'vitest'
import type { ScheduleMetrics } from '../types/index.ts'
import type { ScenarioSummary } from './types.ts'
import { MAX_SCENARIOS } from './types.ts'
import { buildComparison, canAddScenario } from './compare.ts'

const metrics = (
  lateOrdersCount: number,
  totalDelayDays: number,
  avgLoadPct: number,
  overloadedSlotsCount: number,
  wipCount: number,
): ScheduleMetrics => ({
  lateOrdersCount,
  totalDelayDays,
  avgLoadPct,
  overloadedSlotsCount,
  wipCount,
})

const scenarios: ScenarioSummary[] = [
  { id: 'S1', name: 'Мінімум запізнень', mode: 'min-lateness', metrics: metrics(0, 0, 60, 0, 2) },
  { id: 'S2', name: 'Мінімум простоїв', mode: 'min-idle', metrics: metrics(1, 3, 80, 1, 5) },
]

describe('Scenario A — best per metric (FR-SCEN-02)', () => {
  const { best } = buildComparison(scenarios, null)

  it('lower-is-better metrics pick S1', () => {
    expect(best.lateOrdersCount).toEqual(['S1'])
    expect(best.totalDelayDays).toEqual(['S1'])
    expect(best.overloadedSlotsCount).toEqual(['S1'])
    expect(best.wipCount).toEqual(['S1'])
  })

  it('higher-is-better avg load picks S2', () => {
    expect(best.avgLoadPct).toEqual(['S2'])
  })

  it('marks both scenarios best on a tied metric', () => {
    const tied: ScenarioSummary[] = [
      { id: 'A', name: 'A', mode: 'min-lateness', metrics: metrics(0, 0, 50, 0, 3) },
      { id: 'B', name: 'B', mode: 'min-idle', metrics: metrics(0, 0, 50, 0, 3) },
    ]
    expect(buildComparison(tied, null).best.avgLoadPct.sort()).toEqual(['A', 'B'])
  })
})

describe('Scenario B — at most 3 scenarios (FR-SCEN-01)', () => {
  it('allows 0..2, blocks at 3', () => {
    expect(MAX_SCENARIOS).toBe(3)
    expect(canAddScenario(0)).toBe(true)
    expect(canAddScenario(2)).toBe(true)
    expect(canAddScenario(3)).toBe(false)
  })
})

describe('Scenario C — accepted scenario flag (FR-SCEN-03)', () => {
  it('marks the accepted scenario', () => {
    const { rows } = buildComparison(scenarios, 'S2')
    expect(rows.find((r) => r.id === 'S1')!.isAccepted).toBe(false)
    expect(rows.find((r) => r.id === 'S2')!.isAccepted).toBe(true)
  })

  it('handles an empty scenario set', () => {
    const cmp = buildComparison([], null)
    expect(cmp.rows).toEqual([])
    expect(cmp.best.wipCount).toEqual([])
  })
})
