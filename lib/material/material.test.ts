import { describe, it, expect } from 'vitest'
import type { BomNode, PlannedReceipt, ScheduledOperation, StockItem } from '../types/index.ts'
import type { GrossRequirement } from '../mrp/gross-requirements.ts'
import { computeMaterialCheck, demandDatesByMaterial, isCriticalDeficit } from './check.ts'

const gross: GrossRequirement[] = [{ nomenclatureId: 'M', grossNeed: 10, orderIds: ['O1'] }]

describe('Scenario A — critical deficit (no receipts)', () => {
  it('classifies M as critical with null cover date', () => {
    const check = computeMaterialCheck(gross, [], [])
    expect(check.deficits).toHaveLength(1)
    expect(check.critical.map((d) => d.nomenclatureId)).toEqual(['M'])
    expect(check.coverable).toEqual([])
    expect(check.critical[0]!.earliestCoverDate).toBeNull()
    expect(isCriticalDeficit(check.critical[0]!)).toBe(true)
  })
})

describe('Scenario B — coverable deficit (receipt after demand date)', () => {
  it('keeps a net deficit but sets a cover date', () => {
    const receipts: PlannedReceipt[] = [
      { nomenclatureId: 'M', date: new Date('2026-01-15T00:00:00Z'), qty: 10, confirmed: true },
    ]
    const demand = new Map([['M', new Date('2026-01-10T00:00:00Z')]])
    const check = computeMaterialCheck(gross, [], receipts, demand)
    expect(check.coverable).toHaveLength(1)
    expect(check.critical).toEqual([])
    const d = check.coverable[0]!
    expect(d.netDeficit).toBe(10) // receipt after demand not counted in net
    expect(d.earliestCoverDate?.toISOString()).toBe('2026-01-15T00:00:00.000Z')
  })
})

describe('Scenario C — instant recalculation on edits (FR-MAT-03)', () => {
  it('editing stock removes the deficit', () => {
    const before = computeMaterialCheck(gross, [], [])
    expect(before.critical).toHaveLength(1)
    const stock: StockItem[] = [{ nomenclatureId: 'M', qty: 10 }]
    const after = computeMaterialCheck(gross, stock, [])
    expect(after.deficits).toEqual([]) // fully covered → no deficit
  })

  it('adding a receipt reclassifies critical → coverable', () => {
    const demand = new Map([['M', new Date('2026-01-10T00:00:00Z')]])
    const critical = computeMaterialCheck(gross, [], [], demand)
    expect(critical.critical).toHaveLength(1)

    const receipts: PlannedReceipt[] = [
      { nomenclatureId: 'M', date: new Date('2026-01-15T00:00:00Z'), qty: 10, confirmed: true },
    ]
    const recalced = computeMaterialCheck(gross, [], receipts, demand)
    expect(recalced.critical).toEqual([])
    expect(recalced.coverable).toHaveLength(1)
    expect(recalced.coverable[0]!.earliestCoverDate?.toISOString()).toBe('2026-01-15T00:00:00.000Z')
  })
})

describe('Scenario D — demand date from consuming operations', () => {
  it('derives the earliest consuming operation start per material', () => {
    const bom: BomNode[] = [
      { parentId: null, childId: 'P', qtyPer: 1, type: 'assembly' },
      { parentId: 'P', childId: 'M', qtyPer: 5, type: 'material' },
    ]
    const operations: ScheduledOperation[] = [
      {
        orderId: 'O1',
        bomNodeId: 'O1#P',
        nomenclatureId: 'P',
        opNo: 10,
        opName: 'op10',
        rcGroupId: 'G1',
        rcId: 'RC-1',
        startAt: new Date('2026-01-10T00:00:00Z'),
        endAt: new Date('2026-01-10T01:00:00Z'),
        durationMin: 60,
        status: 'ok',
      },
    ]
    const demand = demandDatesByMaterial(operations, bom)
    expect(demand.get('M')?.toISOString()).toBe('2026-01-10T00:00:00.000Z')
  })
})
