import type {
  BomNode,
  Order,
  PlannedReceipt,
  RcGroup,
  ResourceCenter,
  RouteOperation,
  StockItem,
  WorkCalendar,
} from '../types/index.ts'
import type { ImportTable, RawRow, ValidationError } from './types.ts'
import { readCell } from './fields.ts'
import { parseOrders } from './parse-orders.ts'
import { parseBom } from './parse-bom.ts'
import { parseRoutes } from './parse-routes.ts'
import { parseResourceCenters } from './parse-resource-centers.ts'
import { parseStock } from './parse-stock.ts'
import { parseReceipts } from './parse-receipts.ts'
import { parseCalendar } from './parse-calendar.ts'

/** Нормалізований результат парсингу однієї таблиці (заповнене лише релевантне поле). */
export interface ParsedTable {
  errors: ValidationError[]
  orders?: Order[]
  bom?: BomNode[]
  routes?: RouteOperation[]
  rcGroups?: RcGroup[]
  resourceCenters?: ResourceCenter[]
  stock?: StockItem[]
  receipts?: PlannedReceipt[]
  calendar?: WorkCalendar[]
}

/** Порядок і людяні назви таблиць (для UI). */
export const IMPORT_TABLES: { table: ImportTable; label: string }[] = [
  { table: 'orders', label: 'Замовлення' },
  { table: 'bom', label: 'BOM (специфікації)' },
  { table: 'routes', label: 'Маршрути (МК)' },
  { table: 'resourceCenters', label: 'Групи РЦ і РЦ' },
  { table: 'stock', label: 'Залишки' },
  { table: 'receipts', label: 'План надходжень' },
  { table: 'calendar', label: 'Виробничий календар' },
]

/**
 * Parses raw rows according to the specified import table type.
 *
 * @param table - The import table type that selects the parser and result field
 * @param rows - The raw rows to parse
 * @returns The parsed data and any validation errors
 * @throws If an unsupported table type is provided
 */
export function parseTable(table: ImportTable, rows: RawRow[]): ParsedTable {
  switch (table) {
    case 'orders': {
      const r = parseOrders(rows)
      return { errors: r.errors, orders: r.data }
    }
    case 'bom': {
      const r = parseBom(rows)
      return { errors: r.errors, bom: r.data }
    }
    case 'routes': {
      const r = parseRoutes(rows)
      return { errors: r.errors, routes: r.data }
    }
    case 'resourceCenters': {
      const r = parseResourceCenters(rows)
      return { errors: r.errors, rcGroups: r.rcGroups, resourceCenters: r.resourceCenters }
    }
    case 'stock': {
      const r = parseStock(rows)
      return { errors: r.errors, stock: r.data }
    }
    case 'receipts': {
      const r = parseReceipts(rows)
      return { errors: r.errors, receipts: r.data }
    }
    case 'calendar': {
      const r = parseCalendar(rows)
      return { errors: r.errors, calendar: r.data }
    }
    default: {
      const exhaustive: never = table
      throw new Error(`parseTable: unknown table ${String(exhaustive)}`)
    }
  }
}

/**
 * Extracts a trimmed string key from a row using the provided column aliases.
 *
 * @param row - The row from which to read the key value
 * @param aliases - Column names to try when locating the key value
 * @returns The trimmed key value, or an empty string when no value is found
 */
function key(row: RawRow, aliases: string[]): string {
  const v = readCell(row, aliases)
  return v === undefined || v === null ? '' : String(v).trim()
}

/** Ключ рядка для diff кожної таблиці (FR-IMP-10). */
export const KEY_OF: Record<ImportTable, (row: RawRow) => string> = {
  orders: (r) => key(r, ['id', 'замовлення', 'номер', 'order']),
  bom: (r) =>
    `${key(r, ['parentId', 'батько', 'батьківська', 'parent'])}|${key(r, ['childId', 'дитина', 'дочірня', 'child', 'номенклатура'])}`,
  routes: (r) =>
    `${key(r, ['nomenclatureId', 'номенклатура', 'виріб'])}|${key(r, ['opNo', 'номоперації', 'operation'])}`,
  resourceCenters: (r) => key(r, ['rcId', 'рц', 'кодрц', 'rc']),
  stock: (r) => key(r, ['nomenclatureId', 'номенклатура', 'матеріал']),
  receipts: (r) =>
    `${key(r, ['nomenclatureId', 'номенклатура', 'матеріал'])}|${key(r, ['date', 'дата'])}`,
  calendar: (r) => key(r, ['date', 'дата']),
}
