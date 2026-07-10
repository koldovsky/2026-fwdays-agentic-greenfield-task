import type { PlannedReceipt } from '../types/index.ts'
import type { ParseResult, RawRow, ValidationError } from './types.ts'
import { optionalBoolean, requireDate, requireNumber, requireString } from './fields.ts'

const A = {
  nomenclatureId: ['nomenclatureId', 'номенклатура', 'матеріал', 'material'],
  date: ['date', 'дата', 'датанадходження', 'очікуванадата'],
  qty: ['qty', 'кількість', 'quantity'],
  confirmed: ['confirmed', 'статус', 'підтверджено', 'status'],
}

/** Значення що трактуються як «підтверджено». */
const CONFIRMED_TRUTHY = ['confirmed', 'підтверджено', 'так', 'yes', 'true', '1']

/**
 * Parses planned receipt rows into validated records and collects row-level validation errors.
 *
 * @param rows - Raw receipt rows to parse
 * @returns Parsed planned receipts and validation errors
 */
export function parseReceipts(rows: RawRow[]): ParseResult<PlannedReceipt> {
  const data: PlannedReceipt[] = []
  const errors: ValidationError[] = []

  rows.forEach((row, i) => {
    const rowNo = i + 1
    const before = errors.length
    const nomenclatureId = requireString(row, A.nomenclatureId, 'nomenclatureId', rowNo, errors)
    const date = requireDate(row, A.date, 'date', rowNo, errors)
    const qty = requireNumber(row, A.qty, 'qty', rowNo, errors, { gtZero: true })
    const confirmed = optionalBoolean(row, A.confirmed, CONFIRMED_TRUTHY)

    if (!errors.slice(before).some((e) => e.severity === 'error')) {
      data.push({ nomenclatureId, date, qty, confirmed })
    }
  })

  return { data, errors }
}
