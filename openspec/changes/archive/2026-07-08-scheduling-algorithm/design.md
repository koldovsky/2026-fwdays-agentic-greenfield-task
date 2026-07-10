# Design: scheduling-algorithm

## Структура модулів

```
lib/
  types/
    index.ts              ← всі shared-типи (Order, BomNode, Operation, ...)
  bom/
    expand.ts             ← розгортання BOM у плоске дерево з кількостями
    topology.ts           ← топологічне сортування (листя → корінь)
    shared-nodes.ts       ← виявлення спільних вузлів між замовленнями
  mrp/
    gross-requirements.ts ← брутто-потреба з розгорнутого BOM
    net-requirements.ts   ← нетто = брутто − залишки − надходження до дати
  scheduler/
    calendar.ts           ← робочий фонд часу РЦ, next-working-day
    critical-ratio.ts     ← CR = залишок часу / залишкова трудомісткість
    backward.ts           ← backward scheduling для одного вузла
    forward.ts            ← forward scheduling (fallback при CR < 0)
    assign-rc.ts          ← вибір РЦ всередині ГРЦ (мін. завантаження)
    conflict.ts           ← черга операцій при перевантаженні РЦ
    critical-path.ts      ← визначення критичного шляху замовлення
    index.ts              ← головна функція schedule()
  index.ts                ← публічний API бібліотеки
```

## Ключові типи (TypeScript)

```typescript
// Вхідні дані

interface Order {
  id: string
  productId: string        // номенклатура готового виробу
  qty: number
  dueDate: Date
  priority?: number
}

interface BomNode {
  parentId: string | null  // null = корінь
  childId: string          // номенклатура
  qtyPer: number           // кількість на одиницю батька
  type: 'assembly' | 'part' | 'material'
}

interface RouteOperation {
  nomenclatureId: string
  opNo: number             // порядковий номер операції в МК
  opName: string
  rcGroupId: string        // ГРЦ
  durationMin: number      // хвилин на одиницю
}

interface ResourceCenter {
  id: string
  groupId: string
  name: string
  capacityMinPerShift: number
  shiftsPerDay: number
  efficiencyPct: number    // 0–100
  allowedOpTypes: string[] // типи операцій які дозволені на цьому РЦ
}

interface RcGroup {
  id: string
  name: string
  rcIds: string[]
}

interface StockItem {
  nomenclatureId: string
  qty: number
}

interface PlannedReceipt {
  nomenclatureId: string
  date: Date
  qty: number
  confirmed: boolean
}

interface WorkCalendar {
  date: Date
  isWorking: boolean
  workingMinutes: number
}

// Вихідні дані

interface ScheduledOperation {
  orderId: string
  bomNodeId: string        // який вузол BOM
  nomenclatureId: string
  opNo: number
  opName: string
  rcGroupId: string
  rcId: string             // конкретний РЦ (обраний алгоритмом)
  startAt: Date
  endAt: Date
  durationMin: number
  status: 'ok' | 'at-risk' | 'late' | 'blocked-material'
  blockedByMaterialId?: string
}

interface OrderResult {
  orderId: string
  plannedReadyDate: Date
  delayDays: number        // > 0 = запізнення, 0 = вчасно
  criticalPath: string[]   // масив opId на критичному шляху
}

interface CapacitySlot {
  rcId: string
  date: Date
  usedMin: number
  totalMin: number
  loadPct: number
}

interface MaterialDeficit {
  nomenclatureId: string
  grossNeed: number
  stock: number
  plannedReceipts: number
  netDeficit: number
  earliestCoverDate: Date | null  // null = дефіцит не покривається
  blockedOrderIds: string[]
}

interface ScheduleResult {
  operations: ScheduledOperation[]
  orders: OrderResult[]
  capacity: CapacitySlot[]
  deficits: MaterialDeficit[]
  metrics: {
    lateOrdersCount: number
    totalDelayDays: number
    avgLoadPct: number
    overloadedSlotsCount: number
    wipCount: number         // незавершені вузли BOM
  }
}

// Головна функція

interface ScheduleInput {
  orders: Order[]
  bom: BomNode[]
  routes: RouteOperation[]
  rcGroups: RcGroup[]
  resourceCenters: ResourceCenter[]
  stock: StockItem[]
  plannedReceipts: PlannedReceipt[]
  calendar: WorkCalendar[]
  horizon: Date            // кінець горизонту планування
  today: Date
}

type ScheduleMode = 'min-lateness' | 'min-idle'

function schedule(
  input: ScheduleInput,
  mode: ScheduleMode
): ScheduleResult
```

## Алгоритм покроково

### Фаза 1 — BOM expansion

```
для кожного замовлення order:
  рекурсивно обійти BOM починаючи з order.productId
  для кожного вузла: effectiveQty = order.qty × qtyPer рекурсивно
  зібрати плоский список ExpandedNode { orderId, nomenclatureId,
    effectiveQty, level, parentExpandedId }

спільні деталі між замовленнями:
  згрупувати ExpandedNode за nomenclatureId
  якщо nomenclatureId зустрічається у >1 замовлення →
    SharedNode { nomenclatureId, totalQty, orderIds[] }
```

### Фаза 2 — MRP

```
для кожного матеріального вузла (type = 'material'):
  grossNeed = сума effectiveQty по всіх замовленнях
  netDeficit = grossNeed − stock[nomenclatureId]
               − sum(receipts до дати starтOperації)
  якщо netDeficit > 0 → MaterialDeficit
  позначити всі операції що споживають цей матеріал як 'blocked-material'
```

### Фаза 3 — Топологічне сортування

```
побудувати граф залежностей вузлів BOM:
  ребро A → B означає "A залежить від B" (B має завершитись першим)
topologicalSort(graph) → відсортований масив вузлів (листя перші)
```

### Фаза 4 — Backward scheduling (основний режим)

```
cursor = order.dueDate (кінець останнього робочого дня)

для кожного вузла у зворотному топологічному порядку:
  для кожної операції МК у зворотному порядку (остання → перша):
    durationMin = op.durationMin × node.effectiveQty
    endAt = cursor
    startAt = calendar.subtractMinutes(endAt, durationMin)
    якщо startAt < today:
      → перейти на forward scheduling для цієї операції і всіх наступних
      → зафіксувати delayDays для замовлення
    assign RC:
      rcGroup = rcGroups.find(g => g.id === op.rcGroupId)
      candidates = rcGroup.rcIds
        .map(rcId => resourceCenters.find(rc => rc.id === rcId))
        .filter(rc => rc.allowedOpTypes.includes(op.opType))
        .filter(rc → слот [startAt, endAt] не перевантажений)
      якщо candidates порожній:
        найти найраніший вільний слот серед усіх RC групи
      обрати RC з мінімальним loadPct у цьому слоті
    cursor = startAt − межа_наступного_робочого_дня
             (тобто кінець попереднього робочого дня)
```

### Фаза 5 — Вирішення конфліктів на РЦ

```
якщо кілька операцій претендують на один РЦ в один час:
  для кожної операції розрахувати CR:
    CR = (order.dueDate − today) / remainingDurationDays
    менший CR = вищий пріоритет
  операція з вищим пріоритетом займає слот
  решта — зсуваються на наступний доступний слот
```

### Фаза 6 — Критичний шлях

```
для кожного замовлення:
  побудувати граф операцій з тривалостями і залежностями
  знайти найдовший шлях (алгоритм Беллмана-Форда або DFS)
  → criticalPath: масив opId
```

### Фаза 7 — Метрики і повернення результату

```
зібрати CapacitySlot по кожному РЦ і дню:
  usedMin = сума тривалостей операцій на цьому РЦ в цей день
  loadPct = usedMin / totalMin × 100

зібрати OrderResult:
  plannedReadyDate = max(endAt) по всіх операціях замовлення
  delayDays = max(0, plannedReadyDate − dueDate) у робочих днях

повернути ScheduleResult
```

## Режим 'min-idle' (варіант 2)

Відрізняється тільки кроком 4: замість backward від дедлайну —
forward від сьогодні, з пріоритетом заповнення слотів без пробілів
(Shortest Processing Time всередині ГРЦ). Решта фаз ідентичні.

## Обмеження і спрощення MVP

| Обмеження | Рішення в MVP |
|---|---|
| Міжопераційний час невідомий | Фіксовано: старт наступної оп = наступний робочий день після кінця попередньої |
| Переналагодження між операціями | Не враховується в MVP |
| Один РЦ — одна операція одночасно | Не паралелізується |
| Брак і повторні операції | Не враховується в MVP |
