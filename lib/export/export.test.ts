import { describe, it, expect } from 'vitest'
import type { MaterialDeficit, Order, ScheduledOperation } from '../types/index.ts'
import type { OrderRow } from '../dashboard/index.ts'
import { buildDeficitsSheet, buildOperationsSheet, buildOrderSummarySheet } from './build.ts'

describe('Scenario A — operations schedule sheet (FR-EXP-01)', () => {
  const orders: Order[] = [
    { id: 'O1', productId: 'A', qty: 5, dueDate: new Date('2026-01-19T00:00:00Z') },
  ]
  const operations: ScheduledOperation[] = [
    {
      orderId: 'O1',
      bomNodeId: 'O1#A/D',
      nomenclatureId: 'D',
      opNo: 10,
      opName: 'Оп',
      rcGroupId: 'ГРЦ-1',
      rcId: 'РЦ-1',
      startAt: new Date('2026-01-05T00:00:00Z'),
      endAt: new Date('2026-01-05T01:00:00Z'),
      durationMin: 60,
      status: 'ok',
    },
  ]

  const sheet = buildOperationsSheet(operations, orders)

  it('has the 10 schedule columns', () => {
    expect(sheet.headers).toEqual([
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
    ])
  })

  it('maps the operation to a row with product, dates and status label', () => {
    expect(sheet.rows[0]).toEqual([
      'O1',
      'A',
      'D',
      'ГРЦ-1',
      'РЦ-1',
      'Оп',
      '2026-01-05 00:00',
      '2026-01-05 01:00',
      60,
      'В графіку',
    ])
  })
})

describe('Scenario B — material deficits sheet (FR-EXP-02)', () => {
  const deficits: MaterialDeficit[] = [
    {
      nomenclatureId: 'M',
      grossNeed: 10,
      stock: 0,
      plannedReceipts: 0,
      netDeficit: 10,
      earliestCoverDate: null,
      blockedOrderIds: ['O1'],
    },
    {
      nomenclatureId: 'N',
      grossNeed: 8,
      stock: 2,
      plannedReceipts: 4,
      netDeficit: 2,
      earliestCoverDate: new Date('2026-01-15T00:00:00Z'),
      blockedOrderIds: ['O2', 'O3'],
    },
  ]
  const sheet = buildDeficitsSheet(deficits)

  it('marks critical vs coverable cover dates', () => {
    expect(sheet.rows[0]![5]).toBe('критичний')
    expect(sheet.rows[1]![5]).toBe('2026-01-15')
    expect(sheet.rows[1]![6]).toBe('O2, O3')
  })
})

describe('Scenario C — order summary sheet (FR-EXP-03)', () => {
  const orderRows: OrderRow[] = [
    {
      orderId: 'O1',
      productId: 'A',
      qty: 5,
      dueDate: new Date('2026-01-19T00:00:00Z'),
      plannedReadyDate: new Date('2026-01-12T00:00:00Z'),
      delayDays: 0,
      status: 'on-schedule',
    },
  ]
  const sheet = buildOrderSummarySheet(orderRows)

  it('maps the order row to summary columns', () => {
    expect(sheet.headers[5]).toBe('Відхилення (роб. дн.)')
    expect(sheet.rows[0]).toEqual(['O1', 'A', 5, '2026-01-19', '2026-01-12', 0, 'В графіку'])
  })
})
