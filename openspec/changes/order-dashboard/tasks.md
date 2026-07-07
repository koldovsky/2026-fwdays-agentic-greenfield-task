# Tasks: order-dashboard

Похідні дані (статуси, сортування, підсумок, дерево) — чисті функції у
`lib/dashboard/` з unit-тестами; таблиця — React у `src/`.

---

## Milestone 1 — Чиста логіка (lib/dashboard/)

- [x] **1.1** `types.ts`: `OrderStatus`, `OrderRow`, `DashboardSummary`,
      `OrderDashboard`, `BomTreeNode`
- [x] **1.2** `build.ts`: `buildOrderDashboard(...)` — статуси, сортування за
      відхиленням, підсумок (FR-ORD-01/02/04/05)
- [x] **1.3** `build.ts`: `buildBomTree(operations, orderId)` — дерево з датами і
      статусами вузлів (FR-ORD-03)
- [x] **1.4** `index.ts` — публічний API
- [x] **1.5** Unit-тести Сценаріїв A, B, C

## Milestone 2 — Компонент (src/components)

- [x] **2.1** `OrderDashboard.tsx`: таблиця замовлень зі статусами і відхиленням
- [x] **2.2** Розкриття рядка → дерево BOM (FR-ORD-03)
- [x] **2.3** Підсумковий рядок (FR-ORD-05)
- [x] **2.4** Інтеграція в `App.tsx`

## Milestone 3 — Перевірка

- [x] **3.1** `tsc --noEmit` (lib) і `tsc -b` (app) — без помилок
- [x] **3.2** `vitest run` — усі тести зелені
- [x] **3.3** `oxlint` чисто; `vite build` успішно
- [x] **3.4** `openspec validate --all --strict`
