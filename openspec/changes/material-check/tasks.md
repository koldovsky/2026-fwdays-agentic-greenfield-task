# Tasks: material-check

Похідні дані (дефіцити, критичність, дата споживання) — чисті функції у
`lib/material/`; таблиця і правки — React у `src/`.

---

## Milestone 1 — Чиста логіка (lib/material/)

- [x] **1.1** `check.ts`: `isCriticalDeficit`, `splitDeficits` (FR-MAT-02)
- [x] **1.2** `check.ts`: `computeMaterialCheck(grossReqs, stock, receipts, demandDates?)`
      — таблиця дефіцитів + поділ (FR-MAT-01/02, перерахунок для FR-MAT-03)
- [x] **1.3** `check.ts`: `demandDatesByMaterial(operations, bom)` — дата споживання
- [x] **1.4** `index.ts` — публічний API
- [x] **1.5** Unit-тести Сценаріїв A, B, C, D

## Milestone 2 — Стан і перерахунок (src/store)

- [x] **2.1** session-store: `grossReqs`, `demandDates` (фіксуються при плануванні)
- [x] **2.2** `stockAdjustments`, `extraReceipts`, `setStockAdjustment`,
      `addReceipt`, `resetMaterialEdits` (FR-MAT-03)

## Milestone 3 — Компонент (src/components)

- [x] **3.1** `MaterialCheck.tsx`: критичний блок-попередження (FR-MAT-02)
- [x] **3.2** Таблиця дефіциту з усіма колонками (FR-MAT-01)
- [x] **3.3** Редагування залишку в рядку + форма додавання надходження →
      миттєвий перерахунок (FR-MAT-03)
- [x] **3.4** Інтеграція в `App.tsx`

## Milestone 4 — Перевірка

- [x] **4.1** `tsc --noEmit` (lib) і `tsc -b` (app) — без помилок
- [x] **4.2** `vitest run` — усі тести зелені
- [x] **4.3** `oxlint` чисто; `vite build` успішно
- [x] **4.4** `openspec validate --all --strict`
