import { describe, it, expect } from 'vitest'
import type { RawRow } from './types.ts'
import { parseOrders } from './parse-orders.ts'
import { parseBom } from './parse-bom.ts'
import { parseRoutes } from './parse-routes.ts'
import { parseResourceCenters } from './parse-resource-centers.ts'
import { parseStock } from './parse-stock.ts'
import { parseReceipts } from './parse-receipts.ts'
import { parseCalendar } from './parse-calendar.ts'
import { diffRows } from './diff.ts'
import { KEY_OF, parseTable } from './registry.ts'
import { schedule } from '../scheduler/index.ts'
import type { ScheduleInput } from '../types/index.ts'

describe('Scenario 1 — valid order row', () => {
  it('parses into a domain Order with no errors', () => {
    const rows: RawRow[] = [
      { номер: 'O-1', виріб: 'A', кількість: 5, одиниця: 'шт', дата: '2026-03-01', пріоритет: 1 },
    ]
    const { data, errors } = parseOrders(rows)
    expect(errors).toEqual([])
    expect(data).toEqual([
      { id: 'O-1', productId: 'A', qty: 5, dueDate: new Date('2026-03-01T00:00:00Z'), priority: 1 },
    ])
  })
})

describe('Scenario 2 — missing required field', () => {
  it('reports the empty field and drops the row', () => {
    const rows: RawRow[] = [{ номер: 'O-1', виріб: '', кількість: 5, дата: '2026-03-01' }]
    const { data, errors } = parseOrders(rows)
    expect(data).toEqual([])
    expect(errors).toContainEqual({
      row: 1,
      field: 'productId',
      reason: "обов'язкове поле",
      severity: 'error',
    })
  })
})

describe('Scenario 3 — invalid number and date', () => {
  it('reports both fields as errors', () => {
    const rows: RawRow[] = [{ номер: 'O-1', виріб: 'A', кількість: 'abc', дата: 'not-a-date' }]
    const { data, errors } = parseOrders(rows)
    expect(data).toEqual([])
    expect(errors.find((e) => e.field === 'qty')?.reason).toBe('має бути числом')
    expect(errors.find((e) => e.field === 'dueDate')?.reason).toBe('некоректна дата')
  })
})

describe('Scenario 4 — invalid enum in BOM', () => {
  it('reports the node type with the allowed list', () => {
    const rows: RawRow[] = [{ батько: 'A', дитина: 'B', кількість: 1, тип: 'gadget' }]
    const { data, errors } = parseBom(rows)
    expect(data).toEqual([])
    const err = errors.find((e) => e.field === 'type')!
    expect(err.severity).toBe('error')
    expect(err.reason).toMatch(/assembly|part|material/)
  })

  it('maps Ukrainian node types and blank parent to root', () => {
    const rows: RawRow[] = [
      { батько: '', дитина: 'A', кількість: 1, тип: 'підзбірка' },
      { батько: 'A', дитина: 'M', кількість: 3, тип: 'матеріал' },
    ]
    const { data, errors } = parseBom(rows)
    expect(errors).toEqual([])
    expect(data).toEqual([
      { parentId: null, childId: 'A', qtyPer: 1, type: 'assembly' },
      { parentId: 'A', childId: 'M', qtyPer: 3, type: 'material' },
    ])
  })
})

describe('routes — opType defaults to opName when absent', () => {
  it('derives opType from opName without an error', () => {
    const rows: RawRow[] = [
      { номенклатура: 'D', номоперації: 10, назва: 'Фрезерування', грц: 'G1', тривалість: 60 },
    ]
    const { data, errors } = parseRoutes(rows)
    expect(errors).toEqual([])
    expect(data[0]).toEqual({
      nomenclatureId: 'D',
      opNo: 10,
      opName: 'Фрезерування',
      opType: 'Фрезерування',
      rcGroupId: 'G1',
      durationMin: 60,
    })
  })

  it('uses an explicit opType column when present', () => {
    const rows: RawRow[] = [
      { номенклатура: 'D', номоперації: 10, назва: 'Оп', тип: 'milling', грц: 'G1', тривалість: 60 },
    ]
    const { data } = parseRoutes(rows)
    expect(data[0]!.opType).toBe('milling')
  })
})

describe('Scenario 6 — RC groups and resource centers from one report', () => {
  it('groups RCs under their ГРЦ', () => {
    const rows: RawRow[] = [
      { грц: 'G1', назвагрц: 'Токарна', рц: 'RC-1', потужність: 480, змін: 1, ефективність: 100, типиоперацій: 'turning; milling' },
      { грц: 'G1', назвагрц: 'Токарна', рц: 'RC-2', потужність: 480, змін: 2, ефективність: 95, типиоперацій: 'turning' },
    ]
    const { rcGroups, resourceCenters, errors } = parseResourceCenters(rows)
    expect(errors).toEqual([])
    expect(rcGroups).toEqual([{ id: 'G1', name: 'Токарна', rcIds: ['RC-1', 'RC-2'] }])
    expect(resourceCenters).toHaveLength(2)
    expect(resourceCenters[0]!.allowedOpTypes).toEqual(['turning', 'milling'])
    expect(resourceCenters[1]!.shiftsPerDay).toBe(2)
  })
})

describe('stock / receipts / calendar parsers', () => {
  it('parses stock', () => {
    const { data, errors } = parseStock([{ номенклатура: 'M', склад: 'S1', кількість: 100 }])
    expect(errors).toEqual([])
    expect(data).toEqual([{ nomenclatureId: 'M', qty: 100 }])
  })

  it('parses receipts with confirmation status', () => {
    const { data } = parseReceipts([
      { номенклатура: 'M', дата: '2026-01-10', кількість: 50, статус: 'підтверджено' },
      { номенклатура: 'M', дата: '2026-01-15', кількість: 20, статус: 'очікується' },
    ])
    expect(data[0]!.confirmed).toBe(true)
    expect(data[1]!.confirmed).toBe(false)
  })

  it('parses the calendar, converting hours to minutes and marking weekends', () => {
    const { data, errors } = parseCalendar([
      { дата: '2026-01-05', типдня: 'робочий', години: 8 },
      { дата: '2026-01-03', типдня: 'вихідний' },
    ])
    expect(errors).toEqual([])
    expect(data[0]).toEqual({ date: new Date('2026-01-05T00:00:00Z'), isWorking: true, workingMinutes: 480 })
    expect(data[1]).toEqual({ date: new Date('2026-01-03T00:00:00Z'), isWorking: false, workingMinutes: 0 })
  })

  it('errors when a working day has no duration', () => {
    const { errors } = parseCalendar([{ дата: '2026-01-05', типдня: 'робочий' }])
    expect(errors.find((e) => e.field === 'workingMinutes')?.severity).toBe('error')
  })
})

describe('Scenario 5 — re-import diff', () => {
  it('detects added, removed, and changed rows', () => {
    const prev: RawRow[] = [
      { id: 'O-1', qty: 5 },
      { id: 'O-2', qty: 3 },
    ]
    const next: RawRow[] = [
      { id: 'O-1', qty: 7 },
      { id: 'O-3', qty: 1 },
    ]
    const diff = diffRows(prev, next, KEY_OF.orders)
    expect(diff.added).toBe(1)
    expect(diff.removed).toBe(1)
    expect(diff.changed).toBe(1)
    expect(diff.rows).toContainEqual({ key: 'O-1', change: 'changed', changedFields: ['qty'] })
    expect(diff.rows).toContainEqual({ key: 'O-3', change: 'added' })
    expect(diff.rows).toContainEqual({ key: 'O-2', change: 'removed' })
  })
})

describe('registry dispatcher', () => {
  it('parseTable routes to the correct parser', () => {
    const parsed = parseTable('orders', [{ id: 'O-1', виріб: 'A', кількість: 1, дата: '2026-03-01' }])
    expect(parsed.orders).toHaveLength(1)
    expect(parsed.errors).toEqual([])
  })

  it('KEY_OF builds composite keys for bom', () => {
    expect(KEY_OF.bom({ батько: 'A', дитина: 'B' })).toBe('A|B')
  })
})

describe('Scenario 7 — parsed tables assemble into a valid ScheduleInput', () => {
  function calendarRows(): RawRow[] {
    const rows: RawRow[] = []
    const start = new Date('2026-01-01T00:00:00Z').getTime()
    for (let i = 0; i < 40; i++) {
      const d = new Date(start + i * 86_400_000)
      const dow = d.getUTCDay()
      const weekend = dow === 0 || dow === 6
      rows.push({
        дата: d.toISOString().slice(0, 10),
        типдня: weekend ? 'вихідний' : 'робочий',
        години: weekend ? 0 : 8,
      })
    }
    return rows
  }

  it('produces a schedule from imported data', () => {
    const orders = parseOrders([{ номер: 'O-1', виріб: 'A', кількість: 1, дата: '2026-01-20' }])
    const bom = parseBom([
      { батько: '', дитина: 'A', кількість: 1, тип: 'підзбірка' },
      { батько: 'A', дитина: 'M', кількість: 2, тип: 'матеріал' },
    ])
    const routes = parseRoutes([{ номенклатура: 'A', номоперації: 10, назва: 'Оп', грц: 'G1', тривалість: 60 }])
    const rcs = parseResourceCenters([
      { грц: 'G1', рц: 'RC-1', потужність: 480, змін: 1, ефективність: 100, типиоперацій: 'Оп' },
    ])
    const stock = parseStock([{ номенклатура: 'M', кількість: 100 }])
    const receipts = parseReceipts([])
    const calendar = parseCalendar(calendarRows())

    for (const r of [orders.errors, bom.errors, routes.errors, rcs.errors, stock.errors, receipts.errors, calendar.errors]) {
      expect(r).toEqual([])
    }

    const input: ScheduleInput = {
      orders: orders.data,
      bom: bom.data,
      routes: routes.data,
      rcGroups: rcs.rcGroups,
      resourceCenters: rcs.resourceCenters,
      stock: stock.data,
      plannedReceipts: receipts.data,
      calendar: calendar.data,
      horizon: new Date('2026-02-15T00:00:00Z'),
      today: new Date('2026-01-05T00:00:00Z'),
    }

    const result = schedule(input, 'min-lateness')
    expect(result.operations.length).toBeGreaterThan(0)
    expect(result.orders[0]!.orderId).toBe('O-1')
  })
})
