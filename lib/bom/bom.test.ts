import { describe, it, expect } from 'vitest'
import type { BomNode, Order } from '../types/index.ts'
import { expandBom } from './expand.ts'
import { findSharedNodes } from './shared-nodes.ts'
import { topologicalSort } from './topology.ts'

const order = (id: string, productId: string, qty: number): Order => ({
  id,
  productId,
  qty,
  dueDate: new Date('2026-02-01T00:00:00Z'),
})

describe('Scenario 1 — simple order, shared part D within one product', () => {
  // BOM: A → [B, C]; B → [D×2]; C → [D×1]
  const bom: BomNode[] = [
    { parentId: null, childId: 'A', qtyPer: 1, type: 'assembly' },
    { parentId: 'A', childId: 'B', qtyPer: 1, type: 'assembly' },
    { parentId: 'A', childId: 'C', qtyPer: 1, type: 'assembly' },
    { parentId: 'B', childId: 'D', qtyPer: 2, type: 'part' },
    { parentId: 'C', childId: 'D', qtyPer: 1, type: 'part' },
  ]
  const nodes = expandBom([order('O1', 'A', 1)], bom)

  it('expands the full tree with multiplied quantities', () => {
    const byNomLevel = nodes.map((n) => `${n.nomenclatureId}@${n.level}=${n.effectiveQty}`)
    expect(byNomLevel).toEqual([
      'A@0=1',
      'B@1=1',
      'C@1=1',
      'D@2=2', // under B, qtyPer 2
      'D@2=1', // under C, qtyPer 1
    ])
  })

  it('gives each D occurrence a distinct path id under its parent', () => {
    const dIds = nodes.filter((n) => n.nomenclatureId === 'D').map((n) => n.id)
    expect(new Set(dIds).size).toBe(2)
    expect(dIds).toContain('O1#A/B/D')
    expect(dIds).toContain('O1#A/C/D')
  })

  it('topological sort places leaves (D) first and root (A) last', () => {
    const sorted = topologicalSort(nodes).map((n) => n.nomenclatureId)
    expect(sorted[sorted.length - 1]).toBe('A')
    const firstA = sorted.indexOf('A')
    const firstB = sorted.indexOf('B')
    const firstC = sorted.indexOf('C')
    const lastD = sorted.lastIndexOf('D')
    // every D comes before B, C and A
    expect(lastD).toBeLessThan(firstB)
    expect(lastD).toBeLessThan(firstC)
    expect(firstB).toBeLessThan(firstA)
    expect(firstC).toBeLessThan(firstA)
  })

  it('reports no shared nodes for a single order', () => {
    expect(findSharedNodes(nodes)).toEqual([])
  })
})

describe('Scenario 7 — part D shared across two orders', () => {
  const bom: BomNode[] = [
    { parentId: null, childId: 'P1', qtyPer: 1, type: 'assembly' },
    { parentId: null, childId: 'P2', qtyPer: 1, type: 'assembly' },
    { parentId: 'P1', childId: 'D', qtyPer: 10, type: 'part' },
    { parentId: 'P2', childId: 'D', qtyPer: 15, type: 'part' },
  ]
  const nodes = expandBom([order('O1', 'P1', 1), order('O2', 'P2', 1)], bom)

  it('consolidates D into one shared block of 25 across both orders', () => {
    const shared = findSharedNodes(nodes)
    expect(shared).toEqual([{ nomenclatureId: 'D', totalQty: 25, orderIds: ['O1', 'O2'] }])
  })
})
