# Tasks: scenario-compare

Порівняння (метрики, найкраще, ліміт) — чисті функції у `lib/scenario/`;
керування сценаріями і UI — у `src/`.

---

## Milestone 1 — Чиста логіка (lib/scenario/)

- [x] **1.1** `types.ts`: `ScenarioSummary`, `ComparisonRow`, `MetricKey`,
      `MetricDirection`, `Comparison`, `MAX_SCENARIOS`, `METRIC_KEYS`, `DIRECTIONS`
- [x] **1.2** `compare.ts`: `buildComparison(scenarios, acceptedId)` — рядки,
      найкраще за метрикою (FR-SCEN-02)
- [x] **1.3** `compare.ts`: `canAddScenario(count)` — ліміт 3 (FR-SCEN-01)
- [x] **1.4** `index.ts` — публічний API
- [x] **1.5** Unit-тести Сценаріїв A, B, C

## Milestone 2 — Керування сценаріями (src/store)

- [x] **2.1** session-store: `scenarios`, `acceptedScenarioId`, `scenarioSeq`
- [x] **2.2** `addScenario` (до 3), `confirmScenario` (робить активним `plan`),
      `removeScenario` (FR-SCEN-01/03, BC-UX-03)

## Milestone 3 — Компонент (src/components)

- [x] **3.1** `ScenarioCompare.tsx`: додати варіант (режими), кнопки з лімітом
- [x] **3.2** Таблиця порівняння з підсвіткою найкращого (FR-SCEN-02)
- [x] **3.3** Вибір і підтвердження активного варіанту (FR-SCEN-03)
- [x] **3.4** Інтеграція в `App.tsx`

## Milestone 4 — Перевірка

- [x] **4.1** `tsc --noEmit` (lib) і `tsc -b` (app) — без помилок
- [x] **4.2** `vitest run` — усі тести зелені
- [x] **4.3** `oxlint` чисто; `vite build` успішно
- [x] **4.4** `openspec validate --all --strict`
