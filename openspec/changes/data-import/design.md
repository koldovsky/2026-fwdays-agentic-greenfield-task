# Design: data-import

## Архітектурний принцип

Парсинг і валідація — **чисті функції** у `lib/import/` (без React, DOM, idb).
Робота з файлами (SheetJS), станом (Zustand) і персистентністю (idb) — у `src/`.

```
lib/import/
  types.ts              ← RawRow, ValidationError, ParseResult, RowDiff, TableDiff, ImportTable
  fields.ts             ← читання клітинок за псевдонімами колонок + примітиви валідації
  parse-orders.ts       ← FR-IMP-02
  parse-bom.ts          ← FR-IMP-03
  parse-routes.ts       ← FR-IMP-04
  parse-resource-centers.ts ← FR-IMP-05 (ГРЦ + РЦ з одного звіту)
  parse-stock.ts        ← FR-IMP-06
  parse-receipts.ts     ← FR-IMP-07
  parse-calendar.ts     ← FR-IMP-08
  diff.ts               ← FR-IMP-10 (порядкове порівняння за ключем)
  registry.ts           ← ImportTable → parser (єдина точка)
  index.ts              ← публічний API
  *.test.ts

src/
  import/sheet.ts        ← SheetJS: File → RawRow[] (async, тільки клієнт)
  store/session-store.ts ← Zustand: таблиці, помилки, diff, гейт планування
  store/persistence.ts   ← idb: збереження/відновлення сеансу
  components/            ← DropZone, DropZoneGrid, EditableTable, ValidationErrors, DiffView, ImportPanel
```

## Потік даних

```
File → sheet.ts (SheetJS) → RawRow[]
     → parser (чистий) → { data: DomainType[], errors: ValidationError[] }
     → store (Zustand) → EditableTable (перегляд/редагування)
     → редагування RawRow[] → re-parse → оновлені data/errors
     → persistence (idb) ← автозбереження store
```

Кожна таблиця у store зберігає **сирі рядки** (`RawRow[]`, редаговані) окремо від
похідних доменних об'єктів і помилок — редагування завжди йде через re-parse.

## Ключові типи

```typescript
type ImportTable =
  | 'orders' | 'bom' | 'routes' | 'resourceCenters'
  | 'stock' | 'receipts' | 'calendar'

type RawRow = Record<string, string | number | boolean | null>

interface ValidationError {
  row: number        // 1-базовий індекс рядка даних (без заголовка)
  field: string      // логічна назва поля
  reason: string     // людяне пояснення
  severity: 'error' | 'warning'
}

interface ParseResult<T> {
  data: T[]                 // доменні об'єкти (валідні рядки)
  errors: ValidationError[] // усі помилки/попередження
}

type RowChange = 'added' | 'removed' | 'changed' | 'unchanged'

interface RowDiff {
  key: string
  change: RowChange
  changedFields?: string[]  // для 'changed'
}

interface TableDiff {
  added: number
  removed: number
  changed: number
  rows: RowDiff[]           // тільки added/removed/changed
}
```

Доменні типи (`Order`, `BomNode`, `RouteOperation`, `ResourceCenter`, `RcGroup`,
`StockItem`, `PlannedReceipt`, `WorkCalendar`) переиспользуються з `lib/types`.
Парсер `resourceCenters` повертає `{ rcGroups, resourceCenters }` з одного звіту.

## Мапінг колонок

Кожен парсер приймає рядки з довільним регістром/мовою заголовків. `fields.ts`
шукає клітинку за списком псевдонімів (укр. + англ.). Приклади:

| Таблиця | Поле | Псевдоніми |
|---|---|---|
| orders | id | `замовлення`, `номер`, `order`, `orderId` |
| orders | productId | `виріб`, `номенклатура`, `product`, `productId` |
| orders | qty | `кількість`, `qty` |
| orders | dueDate | `дата`, `дедлайн`, `dueDate` |
| routes | opType | `тип`, `opType` (опційно) |

**Рішення по `opType` (FR-IMP-04):** звіт МК з 1С не містить типу операції.
Парсер читає опційну колонку `opType`; якщо її немає — `opType` за замовчуванням
дорівнює `opName` (похідне значення, не помилка). Явна колонка перекриває default.

## Правила валідації (FR-IMP-09)

- **required**: порожнє обов'язкове поле → `error`
- **number**: нечислове значення в числовому полі → `error`; від'ємне де не можна → `error`
- **date**: непарсибельна дата → `error`
- **enum**: значення поза допустимим переліком (тип вузла BOM, статус надходження,
  тип дня календаря) → `error`
- **reference (warning)**: посилання на номенклатуру/ГРЦ, відсутню в інших
  таблицях → `warning` (не блокує, бо таблиці можуть завантажуватись у будь-якому
  порядку; крос-перевірка виконується коли є обидві таблиці)

Планування дозволене лише коли немає жодної помилки рівня `error` у всіх таблицях
(store-геттер `canPlan`).

## Diff при повторному імпорті (FR-IMP-10)

`diffRows(prev, next, keyOf)` зіставляє рядки за стабільним ключем (напр. для
orders — `id`; для bom — `parentId|childId`). Повертає `TableDiff` з переліком
`added / removed / changed` і для змінених — список полів що відрізняються.

## Персистентність (idb, NFR-SAVE-01)

Одна база `aps-session`, сховище `tables` (ключ — `ImportTable`), сховище `meta`.
Store підписується на зміни і зберігає `RawRow[]` кожної таблиці. При старті
застосунок читає IndexedDB і відновлює сеанс. Дані не покидають клієнт (NFR-DATA-01).

## Обмеження MVP

| Обмеження | Рішення |
|---|---|
| Формати з 1С нестабільні | Псевдоніми колонок + ручне редагування |
| Крос-таблична цілісність | `warning`, не `error`; повна перевірка перед плануванням |
| Великі файли (10 MB) | Парсинг на клієнті; SheetJS читає ArrayBuffer (NFR-PERF-03) |
