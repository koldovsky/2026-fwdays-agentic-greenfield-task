# Tasks: export

Побудова рядків — чисті функції у `lib/export/`; запис .xlsx і друк — у `src/`.

---

## Milestone 1 — Чиста побудова рядків (lib/export/)

- [x] **1.1** `types.ts`: `ExportCell`, `SheetData`
- [x] **1.2** `build.ts`: `buildOperationsSheet(operations, orders)` (FR-EXP-01)
- [x] **1.3** `build.ts`: `buildDeficitsSheet(deficits)` (FR-EXP-02)
- [x] **1.4** `build.ts`: `buildOrderSummarySheet(orderRows)` (FR-EXP-03)
- [x] **1.5** `index.ts` — публічний API
- [x] **1.6** Unit-тести Сценаріїв A, B, C

## Milestone 2 — Запис і друк (src/)

- [x] **2.1** `src/export/xlsx.ts`: `writeSheet(SheetData, filename)` (SheetJS, клієнт)
- [x] **2.2** `components/print.css`: print-стилі, що ізолюють Гантт (FR-EXP-04)

## Milestone 3 — Компонент (src/components)

- [x] **3.1** `ExportPanel.tsx`: кнопки експорту розкладу/дефіцитів/зведення
- [x] **3.2** Кнопка «Друк Гантта (PDF)» → `window.print()` (FR-EXP-04)
- [x] **3.3** Інтеграція в `App.tsx`

## Milestone 4 — Перевірка

- [x] **4.1** `tsc --noEmit` (lib) і `tsc -b` (app) — без помилок
- [x] **4.2** `vitest run` — усі тести зелені
- [x] **4.3** `oxlint` чисто; `vite build` успішно
- [x] **4.4** `openspec validate --all --strict`
