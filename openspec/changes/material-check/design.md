# Design: material-check

## Розподіл: чиста логіка ↔ React

```
lib/material/
  check.ts   ← isCriticalDeficit, splitDeficits, computeMaterialCheck,
               demandDatesByMaterial (чисті функції)
  index.ts   ← публічний API
src/
  store/session-store.ts  ← grossReqs, demandDates, stockAdjustments, extraReceipts,
                            setStockAdjustment, addReceipt, resetMaterialEdits
  components/MaterialCheck.tsx  ← критичний блок + таблиця дефіцитів + ручні правки
```

## Дані і перерахунок (FR-MAT-03)

```
grossReqs = calcGrossRequirements(expandBom(orders, bom))   // фіксується при плануванні
demandDates = demandDatesByMaterial(operations, bom)        // дата споживання матеріалу
--- перерахунок при правці (миттєво, без re-plan) ---
stock'    = base stock ⊕ stockAdjustments
receipts' = base receipts ⊕ extraReceipts
deficits  = buildMaterialDeficits(grossReqs, stock', receipts', demandDates)
{ critical, coverable } = splitDeficits(deficits)
```

Оскільки `grossReqs` не залежить від залишків/надходжень, правки лише повторно
викликають чистий `buildMaterialDeficits` — розклад операцій не перебудовується.

## Дата споживання (для дати закриття і критичності)

`demandDatesByMaterial(operations, bom)`: для матеріалу M його батьки в BOM —
вузли-споживачі; дата споживання = найраніший старт операції такого вузла.
Надходження після дати споживання не зменшують нетто-дефіцит, але враховуються
при пошуку дати закриття — тому зʼявляється категорія «покривний дефіцит»
(net > 0, дата закриття задана) поряд із «критичним» (дата закриття = null).

## Критичний дефіцит (FR-MAT-02)

`isCriticalDeficit(d) = d.earliestCoverDate === null`. `splitDeficits` ділить на
`critical` і `coverable`; критичні виводяться окремим блоком-попередженням.

## Таблиця дефіциту (FR-MAT-01)

Колонки: матеріал, брутто-потреба, залишок, план надходжень, нетто-дефіцит,
дата закриття, заблоковані замовлення — усі з `MaterialDeficit`.

## Ручні правки (FR-MAT-03)

- Редаговане поле «залишок» у рядку → `setStockAdjustment(nom, qty)` (абсолютне
  перевизначення).
- Форма «додати надходження» (матеріал, кількість, дата) → `addReceipt(receipt)`.
- «Скинути правки» → `resetMaterialEdits()`.
Правки — накладення (what-if) поверх імпортованих даних; повне перепланування
зафіксує їх у розкладі.

## Обмеження MVP

| Обмеження | Рішення |
|---|---|
| Матеріал без операцій-споживачів | Без дати споживання → надходження рахуються всі; дефіцит критичний лише якщо не покривається взагалі |
| Правки не змінюють розклад | За задумом (FR-MAT-03 — без re-plan); для застосування потрібне перепланування |
