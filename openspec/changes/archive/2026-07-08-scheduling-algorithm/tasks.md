# Tasks: scheduling-algorithm

Чеклист для реалізації в Cursor. Виконувати строго по порядку —
кожна задача залежить від попередньої.

Перед початком скажи Cursor: "Read openspec/changes/scheduling-algorithm/ 
and implement tasks one by one, running tests after each task."

---

## Milestone 1 — Типи і каркас (lib/types/)

- [x] **1.1** Створити `lib/types/index.ts` з усіма інтерфейсами з design.md
      (Order, BomNode, RouteOperation, ResourceCenter, RcGroup,
      StockItem, PlannedReceipt, WorkCalendar, ScheduledOperation,
      OrderResult, CapacitySlot, MaterialDeficit, ScheduleResult,
      ScheduleInput, ScheduleMode)
- [x] **1.2** Перевірити що `tsc --noEmit` проходить без помилок
- [x] **1.3** Створити `lib/index.ts` що експортує тільки публічний API:
      `schedule`, `ScheduleInput`, `ScheduleResult`, `ScheduleMode`

---

## Milestone 2 — Виробничий календар (lib/scheduler/calendar.ts)

- [x] **2.1** Реалізувати `getWorkingMinutesForRc(rc, date, calendar)`:
      повертає кількість робочих хвилин РЦ в конкретний день
      з урахуванням shiftsPerDay і efficiencyPct
- [x] **2.2** Реалізувати `subtractMinutes(date, minutes, calendar)`:
      відняти N хвилин від дати з урахуванням робочого календаря
      (пропускати вихідні і неробочий час)
- [x] **2.3** Реалізувати `addMinutes(date, minutes, calendar)`:
      додати N хвилин до дати (для forward scheduling)
- [x] **2.4** Реалізувати `nextWorkingDayStart(date, calendar)`:
      повернути початок наступного робочого дня
- [x] **2.5** Написати unit-тести:
      - subtractMinutes через межу вихідного дня
      - subtractMinutes через кілька вихідних підряд
      - nextWorkingDayStart коли поточний день вже вихідний

---

## Milestone 3 — BOM expansion (lib/bom/)

- [x] **3.1** Реалізувати `expandBom(orders, bomNodes)` → `ExpandedNode[]`:
      рекурсивне розгортання з множенням кількостей
- [x] **3.2** Реалізувати `findSharedNodes(expandedNodes)` → `SharedNode[]`:
      знайти номенклатури що зустрічаються у >1 замовлення
- [x] **3.3** Реалізувати `topologicalSort(expandedNodes)` → `ExpandedNode[]`:
      листя (деталі без дочірніх) — перші; корінь (готовий виріб) — останній
- [x] **3.4** Написати unit-тести для Сценарію 1 і Сценарію 7 (specs/requirements.md)

---

## Milestone 4 — MRP (lib/mrp/)

- [x] **4.1** Реалізувати `calcGrossRequirements(expandedNodes)`:
      агрегувати effectiveQty по nomenclatureId для матеріальних вузлів
- [x] **4.2** Реалізувати `calcNetDeficits(gross, stock, receipts, operationStartDate)`:
      нетто = брутто − залишки − надходження до дати
- [x] **4.3** Реалізувати `buildMaterialDeficits(...)` → `MaterialDeficit[]`:
      повний розрахунок з earliestCoverDate і blockedOrderIds
- [x] **4.4** Написати unit-тести для Сценарію 3

---

## Milestone 5 — Призначення РЦ (lib/scheduler/assign-rc.ts)

- [x] **5.1** Реалізувати `findAvailableRc(rcGroup, opType, slot, occupiedSlots)`:
      повернути RC з мінімальним loadPct у слоті [startAt, endAt]
      що має opType у allowedOpTypes
- [x] **5.2** Реалізувати `findEarliestSlot(rcGroup, opType, notBefore, durationMin, occupiedSlots, calendar)`:
      найраніший вільний слот при перевантаженні всіх РЦ групи
- [x] **5.3** Написати unit-тести для Сценарію 4

---

## Milestone 6 — Critical Ratio (lib/scheduler/critical-ratio.ts)

- [x] **6.1** Реалізувати `calcCR(order, remainingOps, today, calendar)` → number:
      CR = робочих_днів_до_дедлайну / залишкова_трудомісткість_в_днях
- [x] **6.2** Реалізувати `sortByCR(operations)` → відсортований масив:
      менший CR = перший (вищий пріоритет)
- [x] **6.3** Написати unit-тести для Сценарію 4

---

## Milestone 7 — Backward scheduling (lib/scheduler/backward.ts)

- [x] **7.1** Реалізувати `scheduleBackward(node, routeOps, rcGroups, rcs, occupiedSlots, calendar, today)`:
      розставити операції МК вузла від cursor назад
      cursor оновлюється після кожної операції (nextWorkingDayStart)
- [x] **7.2** При старт < today → повернути `{ needsForward: true, fromOp: opNo }`
- [x] **7.3** Написати unit-тести для Сценарію 1 і Сценарію 2

---

## Milestone 8 — Forward scheduling (lib/scheduler/forward.ts)

- [x] **8.1** Реалізувати `scheduleForward(node, routeOps, startFrom, rcGroups, rcs, occupiedSlots, calendar)`:
      розставити операції від startFrom вперед
- [x] **8.2** Написати unit-тести для Сценарію 2

---

## Milestone 9 — Критичний шлях (lib/scheduler/critical-path.ts)

- [x] **9.1** Реалізувати `findCriticalPath(scheduledOps, orderId)` → `string[]`:
      повернути масив opId на критичному шляху (найдовший ланцюжок)
- [x] **9.2** Написати unit-тести: критичний шлях проходить через
      операції що визначають plannedReadyDate

---

## Milestone 10 — Головна функція (lib/scheduler/index.ts)

- [x] **10.1** Реалізувати `schedule(input, mode)` → `ScheduleResult`:
      інтегрувати всі модулі в порядку фаз з design.md
- [x] **10.2** Реалізувати збір `CapacitySlot[]` по кожному РЦ і дню
- [x] **10.3** Реалізувати збір `OrderResult[]` з delayDays і criticalPath
- [x] **10.4** Реалізувати `metrics` блок
- [x] **10.5** Написати інтеграційні тести для Сценаріїв 1–7
- [x] **10.6** Перфоманс-тест Сценарію 6: виміряти час, переконатися < 30 сек

---

## Milestone 11 — Фінальна перевірка

- [x] **11.1** `tsc --noEmit` — без помилок
- [x] **11.2** `vitest run` — всі тести зелені, coverage 100% для lib/
- [x] **11.3** Перевірити що `lib/` не імпортує нічого з `react`, `next`, DOM API
- [x] **11.4** Перевірити детермінованість: запустити schedule() двічі з
      однаковим input → результати ідентичні
- [x] **11.5** Задокументувати публічний API в `lib/index.ts` (JSDoc коментарі)

---

## Підказки для Cursor

При роботі з цим модулем завжди нагадуй Cursor:

```
- Всі функції в lib/ — чисті (pure functions), без side effects
- Одиниця часу внутрішньо — хвилини (number), Date тільки на вході/виході
- Міжопераційний час = nextWorkingDayStart після кінця попередньої операції
- РЦ обирається з ГРЦ за мінімальним завантаженням + allowedOpTypes
- При конфлікті пріоритет за CR (менший = вищий пріоритет)
- Спільні деталі між замовленнями плануються як один блок
```
