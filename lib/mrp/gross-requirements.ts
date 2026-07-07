import type { ExpandedNode } from '../types/index.ts'

/** Брутто-потреба в одному матеріалі з переліком замовлень-споживачів. */
export interface GrossRequirement {
  nomenclatureId: string
  grossNeed: number
  /** Замовлення, що споживають цей матеріал (для blockedOrderIds). */
  orderIds: string[]
}

/**
 * 4.1 — Брутто-потреба в куплених матеріалах (FR-MRP-01).
 *
 * Агрегує `effectiveQty` по `nomenclatureId` лише для вузлів типу `material`.
 * Детермінований результат: сортування за `nomenclatureId`.
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
