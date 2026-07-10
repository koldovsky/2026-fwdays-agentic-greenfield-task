import type { ExpandedNode } from '../types/index.ts'

/** Брутто-потреба в одному матеріалі з переліком замовлень-споживачів. */
export interface GrossRequirement {
  nomenclatureId: string
  grossNeed: number
  /** Замовлення, що споживають цей матеріал (для blockedOrderIds). */
  orderIds: string[]
}

/**
 * Aggregates gross material requirements by nomenclature.
 *
 * @param expandedNodes - Expanded nodes whose material entries are included in the aggregation
 * @returns Gross requirements with unique consuming order IDs, sorted by nomenclature ID
 */
export function calcGrossRequirements(expandedNodes: ExpandedNode[]): GrossRequirement[] {
  const byNom = new Map<string, { gross: number; orders: Set<string> }>()
  for (const node of expandedNodes) {
    if (node.type !== 'material') continue
    const acc = byNom.get(node.nomenclatureId)
    if (acc) {
      acc.gross += node.effectiveQty
      acc.orders.add(node.orderId)
    } else {
      byNom.set(node.nomenclatureId, {
        gross: node.effectiveQty,
        orders: new Set([node.orderId]),
      })
    }
  }
  return [...byNom.entries()]
    .map(([nomenclatureId, acc]) => ({
      nomenclatureId,
      grossNeed: acc.gross,
      orderIds: [...acc.orders].sort(),
    }))
    .sort((a, b) => a.nomenclatureId.localeCompare(b.nomenclatureId))
}
