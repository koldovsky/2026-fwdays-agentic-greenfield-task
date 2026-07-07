/**
 * Типи модуля імпорту. Парсери й валідація — чисті функції: приймають сирі
 * рядки (`RawRow[]`) і повертають доменні об'єкти + список помилок.
 */

/** Сім таблиць-звітів з 1С. */
export type ImportTable =
  | 'orders'
  | 'bom'
  | 'routes'
  | 'resourceCenters'
  | 'stock'
  | 'receipts'
  | 'calendar'

/** Сирий рядок таблиці: значення клітинок за назвами колонок. */
export type CellValue = string | number | boolean | Date | null
export type RawRow = Record<string, CellValue>

export type Severity = 'error' | 'warning'

/** Помилка/попередження валідації одного поля одного рядка. */
export interface ValidationError {
  /** 1-базовий індекс рядка даних (без заголовка). */
  row: number
  /** Логічна назва поля. */
  field: string
  /** Людяне пояснення причини. */
  reason: string
  severity: Severity
}

/** Результат парсингу таблиці: валідні доменні об'єкти + усі помилки. */
export interface ParseResult<T> {
  data: T[]
  errors: ValidationError[]
}

export type RowChange = 'added' | 'removed' | 'changed' | 'unchanged'

/** Зміна одного рядка при повторному імпорті. */
export interface RowDiff {
  key: string
  change: RowChange
  /** Для `changed` — поля що відрізняються. */
  changedFields?: string[]
}

/** Підсумок diff таблиці (без unchanged у `rows`). */
export interface TableDiff {
  added: number
  removed: number
  changed: number
  rows: RowDiff[]
}
