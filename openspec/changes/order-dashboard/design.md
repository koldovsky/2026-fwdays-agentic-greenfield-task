# Design: order-dashboard

## Розподіл: чиста логіка ↔ React-таблиця

```
lib/dashboard/
  types.ts     ← OrderStatus, OrderRow, DashboardSummary, OrderDashboard, BomTreeNode
  build.ts     ← buildOrderDashboard(...), buildBomTree(...)  — чисті функції
  index.ts     ← публічний API
src/
  components/
    OrderDashboard.tsx  ← таблиця з розкриттям рядків + підсумковий рядок
```

## Вхідні дані

З `ScheduleResult` + `ScheduleInput`:
- `orders: Order[]` (номер, виріб, кількість, дата здачі)
- `orderResults: OrderResult[]` (planned ready, delayDays, criticalPath)
- `operations: ScheduledOperation[]` (для дерева BOM: дати і статуси по вузлах)
- `deficits: MaterialDeficit[]` (заблоковані замовлення)
- `calendar: WorkCalendar[]` (робочі дні для розрахунку слаку)

## Статус замовлення (FR-ORD-02)

Пріоритет (від найкритичнішого):
1. **Заблоковано матеріалом** — замовлення у `deficit.blockedOrderIds`
2. **Запізнення** — `delayDays > 0`
3. **Під загрозою** — слак ≤ 2 робочі дні: `countWorkingDays(plannedReady, due) ≤ 2`
4. **В графіку** — інакше

```typescript
type OrderStatus = 'on-schedule' | 'at-risk' | 'late' | 'blocked-material'
```

## Рядок таблиці (FR-ORD-01)

```typescript
interface OrderRow {
  orderId: string
  productId: string
  qty: number
  dueDate: Date
  plannedReadyDate: Date
  delayDays: number      // робочих днів (0 = вчасно)
  status: OrderStatus
}
```

## Сортування (FR-ORD-04)

За замовчуванням: `delayDays` спадно; тай-брейк — важливість статусу спадно,
далі `orderId`. Найбільше запізнення — зверху.

## Підсумок (FR-ORD-05)

```typescript
interface DashboardSummary {
  total: number
  onSchedule: number
  atRisk: number
  late: number
  blocked: number
}
```

## Дерево BOM з датами і статусами (FR-ORD-03)

`buildBomTree(operations, orderId)` відновлює дерево з шляхових `bomNodeId`
(розділювач `/`): вузол = група операцій одного `bomNodeId`; для вузла
`plannedStart = min(start)`, `plannedEnd = max(end)`, `status` = найгірший статус
операцій. Батько визначається як префікс шляху; повертається масив коренів.

```typescript
interface BomTreeNode {
  bomNodeId: string
  nomenclatureId: string
  level: number
  plannedStart: Date
  plannedEnd: Date
  status: OrderStatus
  children: BomTreeNode[]
}
```

## Обмеження MVP

| Обмеження | Рішення |
|---|---|
| Вузол, спільний між замовленнями | У виводі операції мають первинне замовлення; дерево показує вузли з операціями цього замовлення |
| Вузол без операцій (напр. матеріал) | Не має власного рядка операцій → у дереві відсутній (показуються вузли з розкладом) |
