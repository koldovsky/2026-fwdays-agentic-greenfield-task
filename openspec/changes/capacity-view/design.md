# Design: capacity-view

## Розподіл: чиста агрегація ↔ Recharts

```
lib/capacity/
  types.ts       ← CapacityUnit, CapacitySeries, CapacityRow, CellOp, CapacityKpis, CapacityView
  unit.ts        ← pickUnit(today, horizon): 'day' | 'week' | 'month'  (FR-CAP-03)
  aggregate.ts   ← buildCapacityView(opts): бакети, % завантаження, KPI, ops (FR-CAP-01/02/04/05)
  index.ts       ← публічний API
src/
  components/
    CapacityView.tsx  ← Recharts BarChart + перемикач рівня + KPI-рядок + тултип
```

## Вхід агрегації

```typescript
interface BuildCapacityOptions {
  capacity: CapacitySlot[]         // з ScheduleResult (активні слоти, used > 0)
  operations: ScheduledOperation[] // для тултипів (FR-CAP-04)
  resourceCenters: ResourceCenter[]
  rcGroups: RcGroup[]
  calendar: WorkCalendar[]         // доступний фонд (знаменник)
  today: Date
  horizon: Date
  level: 'group' | 'rc'            // рівень перегляду (FR-CAP-01)
}
```

## Одиниця осі X (FR-CAP-03)

`pickUnit(today, horizon)` за довжиною горизонту в днях:
- ≤ 35 днів → `day` (≈ 3 тижні)
- ≤ 110 днів → `week` (≈ 3 місяці)
- інакше → `month` (рік)

Бакет визначається початком періоду: день — UTC-північ; тиждень — понеділок
цього тижня; місяць — перше число.

## Розрахунок завантаження (FR-CAP-02)

Прохід по всіх **робочих днях** горизонту × усіх РЦ:
- `avail = getWorkingMinutesForRc(rc, day, calendar)` — доступний фонд (з
  урахуванням змін і ефективності);
- `used` — з `capacity` (0 якщо слоту немає);
- накопичення `used` і `avail` по (серія, бакет), де серія = ГРЦ (рівень group)
  або РЦ (рівень rc);
- `loadPct(серія, бакет) = Σused / Σavail × 100` (0 якщо avail = 0).

Знаменник із календаря включає дні з нульовим завантаженням, тому середній % і
простій рахуються коректно (на відміну від `ScheduleMetrics.avgLoadPct`, що
рахує лише активні слоти).

## KPI-рядок (FR-CAP-05)

`buildCapacityView(...).kpis`:
- `avgLoadPct = Σused / Σavail × 100` по всіх РЦ і робочих днях;
- `overloadedSlots` = кількість (РЦ, день) з `used > avail` (avail > 0);
- `zeroLoadRcs` = кількість РЦ із сумарним `used = 0` за весь горизонт.

## Тултип (FR-CAP-04)

`opsByCell[ `${seriesKey}__${bucketStart}` ]` → список
`{ opName, orderId, nomenclatureId, durationMin }`. Операція відноситься до
бакета за датою старту. Кастомний тултип Recharts показує список для наведеного
стовпця.

## Компонент CapacityView

- Перемикач рівня `ГРЦ | РЦ` → перебудова серій (FR-CAP-01).
- `BarChart` (Recharts): X = бакети, по одному `Bar` на серію; `ReferenceLine`
  на 100 %; `Cell` червоний, якщо значення > 100 % (FR-CAP-02).
- KPI-рядок над графіком (FR-CAP-05).
- Кастомний `Tooltip` зі списком операцій (FR-CAP-04).

## Обмеження MVP

| Обмеження | Рішення |
|---|---|
| Операція, що перетинає кілька бакетів | У тултипі відноситься до бакета старту |
| Багато серій РЦ | Рівень РЦ показує всі РЦ; за потреби — фільтр (майбутнє) |
| % > 100 при ефективності < 100 | Коректно: used рахується у календарних хв, avail — у фонді РЦ |
