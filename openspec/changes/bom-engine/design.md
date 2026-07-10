# Design: bom-engine

## Модулі (чисті функції)

```
lib/bom/
  expand.ts        ← expandBom(orders, bomNodes): ExpandedNode[]      (FR-BOM-01)
  shared-nodes.ts  ← findSharedNodes(expandedNodes): SharedNode[]     (FR-BOM-03)
  topology.ts      ← topologicalSort(expandedNodes): ExpandedNode[]   (FR-BOM-05)
lib/mrp/
  gross-requirements.ts ← calcGrossRequirements(nodes): GrossRequirement[]  (FR-MRP-01)
  net-requirements.ts   ← calcNetDeficit(...) , buildMaterialDeficits(...)  (FR-MRP-02..05)
```

Усі функції детерміновані, без побічних ефектів; на вхід/вихід — plain-обʼєкти.
Час всередині відсутній (BOM/MRP оперують кількостями і датами покриття як `Date`).

## Ключові типи (переиспользуються з `lib/types`)

```typescript
interface ExpandedNode {
  id: string                 // стабільний шляховий id (унікальний на замовлення)
  orderId: string
  nomenclatureId: string
  effectiveQty: number       // qty × qtyPer рекурсивно
  level: number              // 0 = корінь
  type: 'assembly' | 'part' | 'material'
  parentExpandedId: string | null
}

interface SharedNode { nomenclatureId: string; totalQty: number; orderIds: string[] }

interface GrossRequirement { nomenclatureId: string; grossNeed: number; orderIds: string[] }

interface MaterialDeficit {
  nomenclatureId: string
  grossNeed: number
  stock: number
  plannedReceipts: number
  netDeficit: number
  earliestCoverDate: Date | null   // null = критичний дефіцит (FR-MRP-04)
  blockedOrderIds: string[]
}
```

## Алгоритм

### BOM expansion (FR-BOM-01)
Для кожного замовлення обхід дерева від `order.productId`; на кожному ребрі
`effectiveQty(child) = effectiveQty(parent) × qtyPer`. Кожен розгорнутий вузол
отримує шляховий `id`, тому одна номенклатура під різними батьками — окремі
вузли (консолідація виконується окремо).

### Shared nodes (FR-BOM-03)
Групування за `nomenclatureId`; номенклатури, присутні у > 1 замовленні,
повертаються з сумарною `totalQty` і переліком `orderIds`.

### Топологія (FR-BOM-05)
Пост-порядковий DFS за ребрами батько→дитина: листя перші, корінь останній.
Незалежні підзбірки не мають взаємного порядку — їх можна планувати паралельно
(FR-BOM-04) як наслідок структури DAG.

### MRP (FR-MRP-01..05)
- Брутто = сума `effectiveQty` вузлів типу `material` за `nomenclatureId`.
- Нетто-дефіцит = брутто − залишки − підтверджені надходження до дати споживання.
- Дефіцит із `earliestCoverDate === null` — критичний (жодне надходження не
  покриває, FR-MRP-04).
- Кожен дефіцит несе `blockedOrderIds` — замовлення-споживачі (FR-MRP-05).

## Рішення по представленню критичного дефіциту

FR-MRP-04 («critical-deficit») представлений не окремим прапорцем, а значенням
`earliestCoverDate === null`, щоб зберегти сумісність із наявним контрактом
`MaterialDeficit`, який споживає планувальник. Похідний предикат:
`isCritical(d) = d.earliestCoverDate === null`.

## Обмеження MVP

| Обмеження | Рішення |
|---|---|
| Дата споживання невідома до планування | `demandDateByMaterial` опційний; без нього враховуються всі підтверджені надходження |
| Цикли в BOM | Захист за глибиною у `expandBom` (кидає помилку) |
| Одиниці виміру | Кількості трактуються в одиницях BOM без конвертації |
