/**
 * Публічний API модуля імпорту. Чисті функції парсингу, валідації та diff —
 * без залежностей від React, DOM, SheetJS чи idb.
 *
 * @module lib/import
 */

export type {
  ImportTable,
  RawRow,
  CellValue,
  Severity,
  ValidationError,
  ParseResult,
  RowChange,
  RowDiff,
  TableDiff,
} from './types.ts'

export { parseOrders } from './parse-orders.ts'
export { parseBom } from './parse-bom.ts'
export { parseRoutes } from './parse-routes.ts'
export { parseResourceCenters, type ResourceCentersResult } from './parse-resource-centers.ts'
export { parseStock } from './parse-stock.ts'
export { parseReceipts } from './parse-receipts.ts'
export { parseCalendar } from './parse-calendar.ts'
export { diffRows } from './diff.ts'
export { parseTable, KEY_OF, IMPORT_TABLES, type ParsedTable } from './registry.ts'
