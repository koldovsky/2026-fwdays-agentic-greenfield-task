# Tasks: gantt

Чиста логіка (мапінг, кольори, перерахунок) — у `lib/` з unit-тестами;
імперативна обгортка dhtmlx — у `src/`.

---

## Milestone 1 — Чиста логіка Гантта (lib/gantt/)

- [x] **1.1** `types.ts`: `GanttTask`, `GanttData`, `TaskKind`
- [x] **1.2** `status.ts`: `taskCssClass(status, locked)` — кольори (FR-GANTT-03)
- [x] **1.3** `to-gantt.ts`: `buildGanttData(...)` — дерево ГРЦ→РЦ→операція
      (FR-GANTT-01/02)
- [x] **1.4** Unit-тести Сценарію A

## Milestone 2 — Перерахунок при drag (lib/scheduler/reschedule.ts)

- [x] **2.1** `applyManualMove(operations, movedOpId, newStart, orders, calendar)` —
      forward-propagation залежних операцій (FR-GANTT-07)
- [x] **2.2** Перерахунок `plannedReadyDate` / `delayDays` / `criticalPath`
- [x] **2.3** Unit-тести Сценаріїв B і C

## Milestone 3 — Стан планування (src/store)

- [x] **3.1** Розширити session-store: `plan`, `planInput`, `runPlanning`,
      `moveOperation`, `lockedOpIds`

## Milestone 4 — Компонент Гантта (src/components)

- [x] **4.1** `GanttChart.tsx` — init dhtmlx, дерево, кольори, текст смуги
- [x] **4.2** Лінія «Сьогодні» (marker) завжди видима (FR-GANTT-09)
- [x] **4.3** Перемикання масштабу година/день/тиждень/місяць (FR-GANTT-05)
- [x] **4.4** Фільтри ГРЦ/РЦ/замовлення/номенклатура/статус/критичний шлях (FR-GANTT-06)
- [x] **4.5** Бокова панель деталей операції (FR-GANTT-04)
- [x] **4.6** Кнопка критичного шляху (FR-GANTT-08)
- [x] **4.7** Drag → `moveOperation` → перерахунок і нова дата замовлення (FR-GANTT-07)
- [x] **4.8** `GanttView.tsx` + інтеграція в `App.tsx`

## Milestone 5 — Перевірка

- [x] **5.1** `tsc --noEmit` (lib) і `tsc -b` (app) — без помилок
- [x] **5.2** `vitest run` — усі тести зелені
- [x] **5.3** `oxlint` чисто; `vite build` успішно
- [x] **5.4** `openspec validate --all --strict`
