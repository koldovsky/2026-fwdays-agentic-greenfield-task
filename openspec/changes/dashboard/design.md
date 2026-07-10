# Design: dashboard

## Розподіл: чиста агрегація ↔ картки

```
lib/overview/
  types.ts   ← Overview, BuildOverviewOptions
  build.ts   ← buildOverview(...): 4 KPI-блоки (композиція наявних lib-функцій)
  index.ts   ← публічний API
src/
  components/OverviewDashboard.tsx  ← 4 картки-KPI з deep-link
  components/overview.css
  App.tsx  ← секції-якорі (view-orders / view-gantt / view-materials / view-capacity)
```

## Модель

```typescript
interface Overview {
  statusCounts: DashboardSummary       // total / onSchedule / atRisk / late / blocked
  topDelays: OrderRow[]                // до 5, delayDays > 0, спадно
  criticalDeficits: MaterialDeficit[]  // earliestCoverDate === null
  overloadedCells: CapacitySlot[]      // loadPct > 100, спадно
}
```

## Агрегація (чиста функція)

`buildOverview({ orders, orderResults, deficits, capacity, calendar })`:
- `statusCounts` і `topDelays` — з `buildOrderDashboard` (lib/dashboard): summary
  і перші 5 рядків із `delayDays > 0` (рядки вже відсортовані за запізненням);
- `criticalDeficits` — `splitDeficits(deficits).critical` (lib/material);
- `overloadedCells` — `capacity.filter(loadPct > 100)`, відсортовані спадно.

Композиція наявних чистих функцій — нової логіки статусів/дефіцитів немає.

## Deep-link (FR-DASH-02)

Кожна секція детального розділу в `App` має id-якір:

| Блок | Ціль | Якір |
|---|---|---|
| Статуси замовлень | Зведення по замовленнях | `view-orders` |
| Топ-5 запізнень | Гантт | `view-gantt` |
| Критичні дефіцити | Матеріальне забезпечення | `view-materials` |
| Перевантажені РЦ | Завантаженість | `view-capacity` |

Клік по картці → `document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' })`.
Так усі 4 детальні розділи (Гантт, таблиця замовлень, матеріали, завантаженість)
досяжні з дашборду (FR-DASH-02).

## Обмеження MVP

| Обмеження | Рішення |
|---|---|
| KPI потребують розкладу | Дашборд рендериться, коли є `plan` (після планування) |
| Навігація в межах одного SPA-скролу | Deep-link = скрол до секції-якоря, без роутера |
