import { describe, it, expect } from 'vitest'
import type { BomNode, Order, PlannedReceipt } from '../types/index.ts'
import { expandBom } from '../bom/expand.ts'
import { calcGrossRequirements } from './gross-requirements.ts'
import { buildMaterialDeficits, calcNetDeficit } from './net-requirements.ts'

const order = (id: string, productId: string, qty: number): Order => ({
  id,
  productId,
  qty,
  dueDate: new Date('2026-02-01T00:00:00Z'),
})

describe('calcGrossRequirements', () => {
  it('aggregates effectiveQty only for material nodes', () => {
    // X → sub S (assembly) → material M×5 ; and X → material N×3
    const bom: BomNode[] = [
      { parentId: null, childId: 'X', qtyPer: 1, type: 'assembly' },
      { parentId: 'X', childId: 'S', qtyPer: 1, type: 'assembly' },
      { parentId: 'S', childId: 'M', qtyPer: 5, type: 'material' },
      { parentId: 'X', childId: 'N', qtyPer: 3, type: 'material' },
    ]
    const nodes = expandBom([order('O1', 'X', 2)], bom)
    const gross = calcGrossRequirements(nodes)
    expect(gross).toEqual([
      { nomenclatureId: 'M', grossNeed: 10, orderIds: ['O1'] },
      { nomenclatureId: 'N', grossNeed: 6, orderIds: ['O1'] },
    ])
  })
})

describe('calcNetDeficit', () => {
  const receipts: PlannedReceipt[] = [
    { nomenclatureId: 'M', date: new Date('2026-01-10T00:00:00Z'), qty: 4, confirmed: true },
    { nomenclatureId: 'M', date: new Date('2026-01-20T00:00:00Z'), qty: 4, confirmed: true },
    { nomenclatureId: 'M', date: new Date('2026-01-15T00:00:00Z'), qty: 100, confirmed: false },
  ]

  it('counts only confirmed receipts on or before the operation start date', () => {
    // gross 10, stock 2, confirmed received by Jan 12 = 4 → net 4
    const net = calcNetDeficit(10, 2, receipts, new Date('2026-01-12T00:00:00Z'))
    expect(net).toBe(4)
  })

  it('ignores unconfirmed receipts even if dated before the start', () => {
    const net = calcNetDeficit(10, 0, receipts, new Date('2026-01-16T00:00:00Z'))
    expect(net).toBe(6) // 4 confirmed by Jan 10 only; Jan 20 not yet, unconfirmed ignored
  })
})

describe('Scenario 3 — material deficit with no receipts (critical)', () => {
  const bom: BomNode[] = [
    { parentId: null, childId: 'X', qtyPer: 1, type: 'assembly' },
    { parentId: 'X', childId: 'M', qtyPer: 5, type: 'material' },
  ]
  const nodes = expandBom([order('O1', 'X', 2)], bom)
  const gross = calcGrossRequirements(nodes)

  it('reports a critical deficit (earliestCoverDate null) blocking the order', () => {
    const deficits = buildMaterialDeficits(gross, [], [])
    expect(deficits).toEqual([
      {
        nomenclatureId: 'M',
        grossNeed: 10,
        stock: 0,
        plannedReceipts: 0,
        netDeficit: 10,
        earliestCoverDate: null,
        blockedOrderIds: ['O1'],
      },
    ])
  })

  it('sets earliestCoverDate once cumulative receipts cover the gross need', () => {
    const receipts: PlannedReceipt[] = [
      { nomenclatureId: 'M', date: new Date('2026-01-10T00:00:00Z'), qty: 6, confirmed: true },
      { nomenclatureId: 'M', date: new Date('2026-01-18T00:00:00Z'), qty: 6, confirmed: true },
    ]
    // demand date Jan 12: only 6 counted → still a deficit of 4, covered by Jan 18.
    const demand = new Map([['M', new Date('2026-01-12T00:00:00Z')]])
    const deficits = buildMaterialDeficits(gross, [], receipts, demand)
    expect(deficits).toHaveLength(1)
    expect(deficits[0]!.netDeficit).toBe(4)
    expect(deficits[0]!.plannedReceipts).toBe(6)
    expect(deficits[0]!.earliestCoverDate?.toISOString()).toBe('2026-01-18T00:00:00.000Z')
  })

  it('emits no deficit when stock already covers gross need', () => {
    const deficits = buildMaterialDeficits(gross, [{ nomenclatureId: 'M', qty: 10 }], [])
    expect(deficits).toEqual([])
  })
})
