import type { StockItem } from '../types/index.ts'
import type { ParseResult, RawRow, ValidationError } from './types.ts'
import { requireNumber, requireString } from './fields.ts'

const A = {
  nomenclatureId: ['nomenclatureId', 'номенклатура', 'матеріал', 'material'],
  qty: ['qty', 'кількість', 'залишок', 'quantity'],
}

/**
 * Парсить рядки залишків у доменні об'єкти та збирає помилки валідації.
 *
 * @param rows - Сирі рядки для парсингу
 * @returns Розпарсені залишки та помилки валідації; рядки з помилками рівня `error` не додаються до даних
 */
export function parseStock(rows: RawRow[]): ParseResult<StockItem> {
  const data: StockItem[] = []
  const errors: ValidationError[] = []

  rows.forEach((row, i) => {
    const rowNo = i + 1
    const before = errors.length
    const nomenclatureId = requireString(row, A.nomenclatureId, 'nomenclatureId', rowNo, errors)
    const qty = requireNumber(row, A.qty, 'qty', rowNo, errors, { min: 0 })

    if (!errors.slice(before).some((e) => e.severity === 'error')) {
      data.push({ nomenclatureId, qty })
    }
  })

  return { data, errors }
}
