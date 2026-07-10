import type { Order } from '../types/index.ts'
import type { ParseResult, RawRow, ValidationError } from './types.ts'
import { optionalNumber, requireDate, requireNumber, requireString } from './fields.ts'

const A = {
  id: ['id', 'замовлення', 'номер', 'номерзамовлення', 'order', 'orderId'],
  productId: ['productId', 'виріб', 'номенклатура', 'номенклатуравиробу', 'product'],
  qty: ['qty', 'кількість', 'кількостей', 'quantity'],
  dueDate: ['dueDate', 'датаздачі', 'дата', 'дедлайн', 'due'],
  priority: ['priority', 'пріоритет'],
}

/**
 * Parses raw rows into orders and collects validation errors.
 *
 * @param rows - Raw rows containing order field values
 * @returns Parsed orders from rows without error-level validation issues and all validation errors
 */
export function parseOrders(rows: RawRow[]): ParseResult<Order> {
  const data: Order[] = []
  const errors: ValidationError[] = []

  rows.forEach((row, i) => {
    const rowNo = i + 1
    const before = errors.length
    const id = requireString(row, A.id, 'id', rowNo, errors)
    const productId = requireString(row, A.productId, 'productId', rowNo, errors)
    const qty = requireNumber(row, A.qty, 'qty', rowNo, errors, { gtZero: true })
    const dueDate = requireDate(row, A.dueDate, 'dueDate', rowNo, errors)
    const priority = optionalNumber(row, A.priority, 'priority', rowNo, errors)

    if (!errors.slice(before).some((e) => e.severity === 'error')) {
      data.push({ id, productId, qty, dueDate, ...(priority !== undefined ? { priority } : {}) })
    }
  })

  return { data, errors }
}
