import type { BomNode, ExpandedNode, Order } from '../types/index.ts'

/** Захист від циклів у BOM (реальні BOM ациклічні). */
const MAX_BOM_DEPTH = 1000

/**
 * Expands each order's product BOM into a flat list of nodes.
 *
 * Quantities are propagated through the BOM by multiplying each parent's
 * effective quantity by the edge quantity.
 *
 * @param orders - Orders whose products serve as BOM roots
 * @param bomNodes - BOM edges defining parent-child relationships
 * @returns The expanded nodes for all orders
 * @throws Error if a BOM exceeds the permitted depth
 */
export function expandBom(orders: Order[], bomNodes: BomNode[]): ExpandedNode[] {
  const childrenByParent = new Map<string, BomNode[]>()
  const typeByChild = new Map<string, BomNode['type']>()
  for (const edge of bomNodes) {
    if (edge.parentId !== null) {
      const arr = childrenByParent.get(edge.parentId)
      if (arr) arr.push(edge)
      else childrenByParent.set(edge.parentId, [edge])
    }
    typeByChild.set(edge.childId, edge.type)
  }

  const out: ExpandedNode[] = []
  for (const order of orders) {
    const root: ExpandedNode = {
      id: `${order.id}#${order.productId}`,
      orderId: order.id,
      nomenclatureId: order.productId,
      effectiveQty: order.qty,
      level: 0,
      type: typeByChild.get(order.productId) ?? 'assembly',
      parentExpandedId: null,
    }
    out.push(root)

    // Обхід у глибину; черга зберігає детермінований порядок вводу BOM.
    const queue: ExpandedNode[] = [root]
    while (queue.length > 0) {
      const parent = queue.shift()!
      if (parent.level > MAX_BOM_DEPTH) {
        throw new Error(`expandBom: BOM cycle or excessive depth at ${parent.nomenclatureId}`)
      }
      const edges = childrenByParent.get(parent.nomenclatureId) ?? []
      for (const edge of edges) {
        const child: ExpandedNode = {
          id: `${parent.id}/${edge.childId}`,
          orderId: order.id,
          nomenclatureId: edge.childId,
          effectiveQty: parent.effectiveQty * edge.qtyPer,
          level: parent.level + 1,
          type: edge.type,
          parentExpandedId: parent.id,
        }
        out.push(child)
        queue.push(child)
      }
    }
  }
  return out
}
