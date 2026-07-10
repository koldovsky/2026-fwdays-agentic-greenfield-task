# Tasks: capacity-view

Агрегація — чисті функції у `lib/capacity/` з unit-тестами; графік — Recharts у
`src/`.

---

## Milestone 1 — Чиста агрегація (lib/capacity/)

- [x] **1.1** `types.ts`: `CapacityUnit`, `CapacitySeries`, `CapacityRow`,
      `CellOp`, `CapacityKpis`, `CapacityView`
- [x] **1.2** `unit.ts`: `pickUnit(today, horizon)` (FR-CAP-03)
- [x] **1.3** `aggregate.ts`: `buildCapacityView(opts)` — бакети, % завантаження
      по ГРЦ/РЦ, KPI, ops для тултипів (FR-CAP-01/02/04/05)
- [x] **1.4** `index.ts` — публічний API
- [x] **1.5** Unit-тести Сценаріїв A, B, C, D

## Milestone 2 — Компонент (src/components)

- [x] **2.1** `CapacityView.tsx`: Recharts `BarChart`, перемикач рівня ГРЦ/РЦ
- [x] **2.2** Лінія 100 % + червоний колір для перевантаження (FR-CAP-02)
- [x] **2.3** Кастомний тултип зі списком операцій (FR-CAP-04)
- [x] **2.4** KPI-рядок над графіком (FR-CAP-05)
- [x] **2.5** Інтеграція в `App.tsx`

## Milestone 3 — Перевірка

- [x] **3.1** `tsc --noEmit` (lib) і `tsc -b` (app) — без помилок
- [x] **3.2** `vitest run` — усі тести зелені
- [x] **3.3** `oxlint` чисто; `vite build` успішно
- [x] **3.4** `openspec validate --all --strict`
