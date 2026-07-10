# Tasks: data-import

Виконувати по порядку. Парсери/валідація/diff — чисті функції у `lib/import/`
з unit-тестами; UI і персистентність — у `src/`.

---

## Milestone 1 — Типи і примітиви (lib/import/)

- [x] **1.1** `types.ts`: `ImportTable`, `RawRow`, `ValidationError`, `ParseResult<T>`,
      `RowDiff`, `TableDiff`
- [x] **1.2** `fields.ts`: читання клітинки за псевдонімами + примітиви
      `requireString`, `requireNumber`, `optionalNumber`, `requireDate`, `requireEnum`

## Milestone 2 — Парсери таблиць (FR-IMP-02..08)

- [x] **2.1** `parse-orders.ts` (FR-IMP-02)
- [x] **2.2** `parse-bom.ts` (FR-IMP-03)
- [x] **2.3** `parse-routes.ts` (FR-IMP-04, opType default = opName)
- [x] **2.4** `parse-resource-centers.ts` (FR-IMP-05 → rcGroups + resourceCenters)
- [x] **2.5** `parse-stock.ts` (FR-IMP-06)
- [x] **2.6** `parse-receipts.ts` (FR-IMP-07)
- [x] **2.7** `parse-calendar.ts` (FR-IMP-08)
- [x] **2.8** `registry.ts` + `index.ts` (публічний API)
- [x] **2.9** Unit-тести Сценаріїв 1–4, 6

## Milestone 3 — Diff (FR-IMP-10)

- [x] **3.1** `diff.ts`: `diffRows(prev, next, keyOf)` → `TableDiff`
- [x] **3.2** Unit-тести Сценарію 5

## Milestone 4 — Файли і персистентність (src/)

- [x] **4.1** `src/import/sheet.ts`: SheetJS `File` → `RawRow[]` (async, клієнт)
- [x] **4.2** `src/store/persistence.ts`: idb save/load сеансу
- [x] **4.3** `src/store/session-store.ts`: Zustand store (таблиці, помилки, diff,
      `canPlan`, автозбереження)

## Milestone 5 — UI (FR-IMP-01, 09, 10, 11)

- [x] **5.1** `DropZone` + `DropZoneGrid` (сім зон, drag-and-drop / кнопка)
- [x] **5.2** `ValidationErrors` (таблиця: рядок, поле, причина)
- [x] **5.3** `EditableTable` (перегляд/редагування рядків)
- [x] **5.4** `DiffView` (added / removed / changed)
- [x] **5.5** `ImportPanel` + інтеграція в `App.tsx`, гейт «Запустити планування»

## Milestone 6 — Перевірка

- [x] **6.1** `tsc --noEmit` (lib) і `tsc -b` (app) — без помилок
- [x] **6.2** `vitest run` — усі тести зелені
- [x] **6.3** `oxlint` — чисто; `vite build` — успішно
- [x] **6.4** Сумісність зібраного результату зі `ScheduleInput` (Сценарій 7)
