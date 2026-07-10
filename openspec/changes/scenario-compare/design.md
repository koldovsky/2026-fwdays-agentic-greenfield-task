# Design: scenario-compare

## Розподіл: чиста логіка ↔ React

```
lib/scenario/
  types.ts     ← ScenarioSummary, ComparisonRow, MetricKey, MetricDirection,
                 Comparison, MAX_SCENARIOS, METRIC_KEYS, DIRECTIONS
  compare.ts   ← buildComparison(scenarios, acceptedId), canAddScenario(count)
  index.ts     ← публічний API
src/
  store/session-store.ts  ← scenarios[], acceptedScenarioId, addScenario,
                            confirmScenario, removeScenario
  components/ScenarioCompare.tsx  ← додати варіант, таблиця порівняння, підтвердження
```

## Модель

```typescript
// Сценарій у store (з повним результатом)
interface Scenario { id: string; name: string; mode: ScheduleMode; result: ScheduleResult }

// Для порівняння достатньо метрик
interface ScenarioSummary {
  id: string
  name: string
  mode: ScheduleMode
  metrics: ScheduleMetrics   // lateOrdersCount, totalDelayDays, avgLoadPct,
                              // overloadedSlotsCount, wipCount
}

type MetricKey = keyof ScheduleMetrics
type MetricDirection = 'lower' | 'higher'  // напрямок «краще»

interface Comparison {
  rows: ComparisonRow[]                        // рядок = сценарій
  best: Record<MetricKey, string[]>            // id сценаріїв, найкращих за метрикою
  directions: Record<MetricKey, MetricDirection>
}
```

## Метрики і напрямок «краще» (FR-SCEN-02)

| Метрика | Напрямок |
|---|---|
| `lateOrdersCount` — кількість запізнень | менше = краще |
| `totalDelayDays` — сумарне запізнення (днів) | менше = краще |
| `avgLoadPct` — середня завантаженість РЦ (%) | більше = краще (менше простою) |
| `overloadedSlotsCount` — перевантажені слоти | менше = краще |
| `wipCount` — незавершені вузли (WIP) | менше = краще |

`buildComparison` для кожної метрики знаходить найкраще значення за її напрямком і
позначає всі сценарії, що його досягають (з допуском для float `avgLoadPct`).

## Обмеження «до 3» (FR-SCEN-01)

`MAX_SCENARIOS = 3`; `canAddScenario(count) = count < MAX_SCENARIOS`. Store не
додає понад ліміт.

## Підтвердження активного (FR-SCEN-03, BC-UX-03)

- `addScenario(name, mode, today, horizon)` — будує вхід, викликає `schedule`,
  додає сценарій (до 3), фіксує `planInput`.
- Користувач обирає сценарій (radio) і натискає «Підтвердити активний» →
  `confirmScenario(id)`: `acceptedScenarioId = id`, `plan = scenario.result`,
  перерахунок `grossReqs`/`demandDates`, скидання ручних правок. Лише після цього
  розклад активний для решти екранів.
- `removeScenario(id)` — прибрати; якщо був активним — `acceptedScenarioId = null`.

## Обмеження MVP

| Обмеження | Рішення |
|---|---|
| Порівняння понад 3 | Заблоковано; треба видалити зайвий |
| «Найкраще» для avgLoadPct | Трактуємо як більше завантаження = краще (ціль мін. простою); перевантаження окремою метрикою |
