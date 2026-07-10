# Tasks: bom-engine

Реалізація вже існує у `lib/bom/` і `lib/mrp/` (створена у зміні
`scheduling-algorithm`). Ця зміна формалізує вимоги й покриття; код не
переписується.

---

## Milestone 1 — BOM (lib/bom/)

- [x] **1.1** `expandBom(orders, bomNodes)` → `ExpandedNode[]` — рекурсивне
      розгортання з множенням кількостей (FR-BOM-01)
- [x] **1.2** `findSharedNodes(expandedNodes)` → `SharedNode[]` — консолідація
      спільних вузлів (FR-BOM-03)
- [x] **1.3** `topologicalSort(expandedNodes)` → `ExpandedNode[]` — листя → корінь
      (FR-BOM-05); незалежні підзбірки паралельні (FR-BOM-04)

## Milestone 2 — MRP (lib/mrp/)

- [x] **2.1** `calcGrossRequirements(expandedNodes)` — брутто по матеріалах (FR-MRP-01)
- [x] **2.2** `calcNetDeficit(...)` — нетто = брутто − залишки − надходження (FR-MRP-02)
- [x] **2.3** `buildMaterialDeficits(...)` → `MaterialDeficit[]` — таблиця
      дефіцитів, критичний дефіцит (`earliestCoverDate = null`), заблоковані
      замовлення (FR-MRP-03..05)

## Milestone 3 — Тести сценаріїв

- [x] **3.1** Сценарій 1 (простий BOM) — розгортання + топологія
- [x] **3.2** Сценарій 7 (спільні вузли) — консолідація 25 шт між замовленнями
- [x] **3.3** Сценарій 3 (дефіцит матеріалу) — критичний дефіцит + заблоковані
      замовлення
- [x] **3.4** Інтеграційний тест рушія `lib/bom-engine.test.ts` (Сценарії 1, 7, 3
      через послідовність expand → shared → topology → gross → deficits)

## Milestone 4 — Перевірка

- [x] **4.1** `lib/bom/`, `lib/mrp/` — чисті функції (без React/DOM)
- [x] **4.2** `tsc --noEmit` (lib) без помилок
- [x] **4.3** `vitest run` — усі тести зелені
- [x] **4.4** Результат сумісний зі структурами планувальника
