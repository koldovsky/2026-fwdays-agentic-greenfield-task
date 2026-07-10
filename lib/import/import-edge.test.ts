import { describe, it, expect } from 'vitest'
import type { RawRow } from './types.ts'
import { parseOrders } from './parse-orders.ts'
import { parseBom } from './parse-bom.ts'
import { parseResourceCenters } from './parse-resource-centers.ts'
import { parseReceipts } from './parse-receipts.ts'
import { parseCalendar } from './parse-calendar.ts'
import { diffRows } from './diff.ts'
import { KEY_OF, parseTable } from './registry.ts'

describe('field validation branches', () => {
  it('flags missing required column (no id-like header)', () => {
    const { errors } = parseOrders([{ виріб: 'A', кількість: 1, дата: '2026-03-01' }])
    expect(errors.find((e) => e.field === 'id')?.reason).toBe("обов'язкове поле")
  })

  it('flags qty not greater than zero', () => {
    const { errors } = parseOrders([{ номер: 'O', виріб: 'A', кількість: 0, дата: '2026-03-01' }])
    expect(errors.find((e) => e.field === 'qty')?.reason).toBe('має бути більше 0')
  })

  it('flags an invalid optional number (priority)', () => {
    const { data, errors } = parseOrders([
      { номер: 'O', виріб: 'A', кількість: 1, дата: '2026-03-01', пріоритет: 'abc' },
    ])
    expect(data).toEqual([])
    expect(errors.find((e) => e.field === 'priority')?.reason).toBe('має бути числом')
  })

  it('flags a blank enum as required', () => {
    const { errors } = parseBom([{ батько: 'A', дитина: 'B', кількість: 1, тип: '' }])
    expect(errors.find((e) => e.field === 'type')?.reason).toBe("обов'язкове поле")
  })

  it('flags a min violation (negative efficiency)', () => {
    const { errors } = parseResourceCenters([
      { грц: 'G1', рц: 'RC-1', потужність: 480, змін: 1, ефективність: -5 },
    ])
    expect(errors.find((e) => e.field === 'efficiencyPct')?.reason).toMatch(/не менше 0/)
  })
})

describe('date and boolean coercions', () => {
  it('accepts a Date object and a non-ISO parseable string', () => {
    const { data, errors } = parseReceipts([
      { номенклатура: 'M', дата: new Date('2026-01-10T09:00:00Z'), кількість: 5, статус: true },
      { номенклатура: 'M', дата: '2026/02/01', кількість: 3, статус: 'ні' },
    ])
    expect(errors).toEqual([])
    expect(data[0]!.date.toISOString()).toBe('2026-01-10T00:00:00.000Z')
    expect(data[0]!.confirmed).toBe(true) // boolean true
    expect(data[1]!.date.toISOString()).toBe('2026-02-01T00:00:00.000Z')
    expect(data[1]!.confirmed).toBe(false)
  })

  it('treats a short day as working', () => {
    const { data } = parseCalendar([{ дата: '2026-01-05', типдня: 'скорочений', години: 4 }])
    expect(data[0]).toEqual({
      date: new Date('2026-01-05T00:00:00Z'),
      isWorking: true,
      workingMinutes: 240,
    })
  })
})

describe('diff — no changes', () => {
  it('reports zero changes for identical rows', () => {
    const rows: RawRow[] = [{ id: 'O-1', qty: 5 }]
    const diff = diffRows(rows, rows, KEY_OF.orders)
    expect(diff).toEqual({ added: 0, removed: 0, changed: 0, rows: [] })
  })
})

describe('registry dispatch for all tables', () => {
  it('returns the correct payload key per table', () => {
    expect(parseTable('stock', [{ номенклатура: 'M', кількість: 1 }]).stock).toHaveLength(1)
    expect(parseTable('receipts', [{ номенклатура: 'M', дата: '2026-01-01', кількість: 1 }]).receipts).toHaveLength(1)
    expect(parseTable('calendar', [{ дата: '2026-01-05', типдня: 'вихідний' }]).calendar).toHaveLength(1)
    expect(parseTable('resourceCenters', [{ грц: 'G', рц: 'R', потужність: 1, змін: 1, ефективність: 100 }]).resourceCenters).toHaveLength(1)
    expect(KEY_OF.receipts({ номенклатура: 'M', дата: '2026-01-01' })).toBe('M|2026-01-01')
  })
})
