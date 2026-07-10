import { describe, it, expect } from 'vitest'
import type { BomNode, Order, PlannedReceipt } from './types/index.ts'
import { expandBom } from './bom/expand.ts'
import { findSharedNodes } from './bom/shared-nodes.ts'
import { topologicalSort } from './bom/topology.ts'
import { calcGrossRequirements } from './mrp/gross-requirements.ts'
import { buildMaterialDeficits } from './mrp/net-requirements.ts'

/**
 * Інтеграційні тести рушія BOM+MRP (зміна `bom-engine`).
 * Прогонить Сценарії 1, 7, 3 крізь послідовність
 * expand → shared → topology → gross → deficits.
 */

const order = (id: string, productId: string, qty: number): Order => ({
  id,
  productId,
  qty,
  dueDate: new Date('2026-03-01T00:00:00Z'),
})

describe('Scenario 1 — simple BOM (expansion + topology)', () => {
  // A → [B, C]; B → [D]; C → [D] — D спільна деталь у межах виробу.
  const bom: BomNode[] = [
    { parentId: null, childId: 'A', qtyPer: 1, type: 'assembly' },
    { parentId: 'A', childId: 'B', qtyPer: 1, type: 'assembly' },
    { parentId: 'A', childId: 'C', qtyPer: 1, type: 'assembly' },
    { parentId: 'B', childId: 'D', qtyPer: 2, type: 'part' },
    { parentId: 'C', childId: 'D', qtyPer: 3, type: 'part' },
  ]
  const nodes = expandBom([order('O1', 'A', 1)], bom)

  it('multiplies quantities down the tree', () => {
    const dQtys = nodes.filter((n) => n.nomenclatureId === 'D').map((n) => n.effectiveQty).sort()
    expect(dQtys).toEqual([2, 3]) // under B (×2) and C (×3)
    const total = dQtys.reduce((s, q) => s + q, 0)
    expect(total).toBe(5)
  })

  it('orders leaves before the root (D before B/C before A)', () => {
    const seq = topologicalSort(nodes).map((n) => n.nomenclatureId)
    const lastD = seq.lastIndexOf('D')
    expect(lastD).toBeLessThan(seq.indexOf('B'))
    expect(lastD).toBeLessThan(seq.indexOf('C'))
    expect(seq[seq.length - 1]).toBe('A')
  })

  it('reports no cross-order shared nodes for a single order', () => {
    expect(findSharedNodes(nodes)).toEqual([])
  })
})

describe('Scenario 7 — shared nodes across two orders', () => {
  const bom: BomNode[] = [
    { parentId: null, childId: 'P1', qtyPer: 1, type: 'assembly' },
    { parentId: null, childId: 'P2', qtyPer: 1, type: 'assembly' },
    { parentId: 'P1', childId: 'D', qtyPer: 10, type: 'part' },
    { parentId: 'P2', childId: 'D', qtyPer: 15, type: 'part' },
  ]
  const nodes = expandBom([order('O1', 'P1', 1), order('O2', 'P2', 1)], bom)

  it('consolidates D to a single block of 25 units across both orders', () => {
    expect(findSharedNodes(nodes)).toEqual([
      { nomenclatureId: 'D', totalQty: 25, orderIds: ['O1', 'O2'] },
    ])
  })
})

describe('Scenario 3 — material deficit (critical, blocks its orders)', () => {
  const bom: BomNode[] = [
    { parentId: null, childId: 'X', qtyPer: 1, type: 'assembly' },
    { parentId: 'X', childId: 'M', qtyPer: 5, type: 'material' },
  ]
  const nodes = expandBom([order('O1', 'X', 2)], bom)
  const gross = calcGrossRequirements(nodes)

  it('computes gross demand for the material', () => {
    expect(gross).toEqual([{ nomenclatureId: 'M', grossNeed: 10, orderIds: ['O1'] }])
  })

  it('flags a critical deficit with no receipts and blocks the order', () => {
    const deficits = buildMaterialDeficits(gross, [], [])
    expect(deficits).toEqual([
      {
        nomenclatureId: 'M',
        grossNeed: 10,
        stock: 0,
        plannedReceipts: 0,
        netDeficit: 10,
        earliestCoverDate: null, // FR-MRP-04 critical
        blockedOrderIds: ['O1'],
      },
    ])
  })

  it('clears the critical flag once receipts cover the need', () => {
    const receipts: PlannedReceipt[] = [
      { nomenclatureId: 'M', date: new Date('2026-02-01T00:00:00Z'), qty: 10, confirmed: true },
    ]
    const deficits = buildMaterialDeficits(gross, [], receipts)
    expect(deficits).toEqual([]) // fully covered → no deficit
  })
})
