import type { ExpandedNode, SharedNode } from '../types/index.ts'

/**
 * Визначає номенклатури, що входять до кількох замовлень.
 *
 * @param expandedNodes - Розгорнуті вузли для аналізу
 * @returns Вузли зі спільними номенклатурами, сумарною кількістю `effectiveQty` та відсортованими ідентифікаторами замовлень
 */
export function findSharedNodes(expandedNodes: ExpandedNode[]): SharedNode[] {
  const byNom = new Map<string, { total: number; orders: Set<string> }>()
  for (const node of expandedNodes) {
    const acc = byNom.get(node.nomenclatureId)
    if (acc) {
      acc.total += node.effectiveQty
      acc.orders.add(node.orderId)
    } else {
      byNom.set(node.nomenclatureId, {
        total: node.effectiveQty,
        orders: new Set([node.orderId]),
      })
    }
  }

  const shared: SharedNode[] = []
  for (const [nomenclatureId, acc] of byNom) {
    if (acc.orders.size > 1) {
      shared.push({
        nomenclatureId,
        totalQty: acc.total,
        orderIds: [...acc.orders].sort(),
      })
    }
  }
  return shared.sort((a, b) => a.nomenclatureId.localeCompare(b.nomenclatureId))
}
