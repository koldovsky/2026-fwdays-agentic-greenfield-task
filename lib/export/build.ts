import type {
  MaterialDeficit,
  OperationStatus,
  Order,
  ScheduledOperation,
} from '../types/index.ts'
import type { OrderRow, OrderStatus } from '../dashboard/index.ts'
import type { ExportCell, SheetData } from './types.ts'

/**
 * Formats a number as a two-character string by adding a leading zero when needed.
 *
 * @param n - The number to format
 * @returns The two-character formatted string
 */
function pad(n: number): string {
  return String(n).padStart(2, '0')
}
/**
 * Форматує дату й час у UTC.
 *
 * @returns Рядок у форматі `YYYY-MM-DD HH:mm`
 */
function fmtDateTime(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}
/** Дата у UTC: `YYYY-MM-DD`. */
function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

const OP_STATUS_LABEL: Record<OperationStatus, string> = {
  ok: 'В графіку',
  'at-risk': 'Під загрозою',
  late: 'Запізнення',
  'blocked-material': 'Заблоковано матеріалом',
}
const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  'on-schedule': 'В графіку',
  'at-risk': 'Під загрозою',
  late: 'Запізнення',
  'blocked-material': 'Заблоковано матеріалом',
}

/**
 * Формує аркуш «Розклад операцій» для експорту запланованих операцій.
 *
 * Операції сортуються за часом початку, вузлом BOM і номером операції. Дати
 * форматуються за UTC, а статуси подаються українськими мітками.
 *
 * @param operations - Заплановані операції
 * @param orders - Замовлення для визначення виробу за ідентифікатором замовлення
 * @returns Дані аркуша з назвою, заголовками та рядками операцій
 */
export function buildOperationsSheet(
  operations: ScheduledOperation[],
  orders: Order[],
): SheetData {
  const productByOrder = new Map(orders.map((o) => [o.id, o.productId]))
  const sorted = [...operations].sort((a, b) => {
    const d = a.startAt.getTime() - b.startAt.getTime()
    if (d !== 0) return d
    if (a.bomNodeId !== b.bomNodeId) return a.bomNodeId.localeCompare(b.bomNodeId)
    return a.opNo - b.opNo
  })
  const rows: ExportCell[][] = sorted.map((op) => [
    op.orderId,
    productByOrder.get(op.orderId) ?? '',
    op.nomenclatureId,
    op.rcGroupId,
    op.rcId,
    op.opName,
    fmtDateTime(op.startAt),
    fmtDateTime(op.endAt),
    op.durationMin,
    OP_STATUS_LABEL[op.status],
  ])
  return {
    name: 'Розклад операцій',
    headers: [
      'Замовлення',
      'Виріб',
      'Вузол BOM',
      'ГРЦ',
      'РЦ',
      'Операція',
      'Початок',
      'Кінець',
      'Тривалість (хв)',
      'Статус',
    ],
    rows,
  }
}

/**
 * Створює аркуш експорту з інформацією про дефіцити матеріалів.
 *
 * @param deficits - Записи про потребу в матеріалах, залишки, надходження та заблоковані замовлення
 * @returns Структура аркуша з локалізованими заголовками та рядками дефіцитів
 */
export function buildDeficitsSheet(deficits: MaterialDeficit[]): SheetData {
  const rows: ExportCell[][] = deficits.map((d) => [
    d.nomenclatureId,
    d.grossNeed,
    d.stock,
    d.plannedReceipts,
    d.netDeficit,
    d.earliestCoverDate ? fmtDate(d.earliestCoverDate) : 'критичний',
    d.blockedOrderIds.join(', '),
  ])
  return {
    name: 'Дефіцити матеріалів',
    headers: [
      'Матеріал',
      'Брутто-потреба',
      'Залишок',
      'План надходжень',
      'Нетто-дефіцит',
      'Дата закриття',
      'Заблоковані замовлення',
    ],
    rows,
  }
}

/**
 * Builds the order summary sheet from dashboard order rows.
 *
 * @param orderRows - Dashboard rows containing order details and status
 * @returns Sheet data with order identifiers, quantities, dates, delays, and Ukrainian status labels
 */
export function buildOrderSummarySheet(orderRows: OrderRow[]): SheetData {
  const rows: ExportCell[][] = orderRows.map((r) => [
    r.orderId,
    r.productId,
    r.qty,
    fmtDate(r.dueDate),
    fmtDate(r.plannedReadyDate),
    r.delayDays,
    ORDER_STATUS_LABEL[r.status],
  ])
  return {
    name: 'Зведення замовлень',
    headers: [
      'Замовлення',
      'Виріб',
      'Кількість',
      'Дата здачі',
      'Дата готовності',
      'Відхилення (роб. дн.)',
      'Статус',
    ],
    rows,
  }
}
