import type { ExpandedNode } from '../types/index.ts'

/**
 * 3.3 — Топологічне сортування вузлів BOM: листя (деталі без дочірніх)
 * перші, корінь (готовий виріб) останній (FR-BOM-05).
 *
 * Ребра залежностей будуються за парами (батько → дитина) з розгорнутих
 * вузлів на рівні номенклатур. Пост-порядковий DFS дає дітей раніше батьків;
 * результат детермінований (сортування коренів/номенклатур за назвою).
 */
export function topologicalSort(expandedNodes: ExpandedNode[]): ExpandedNode[] {
  const byId = new Map(expandedNodes.map((n) => [n.id, n]))
  const children = new Map<string, Set<string>>()
  const allNoms = new Set<string>()

  for (const node of expandedNodes) {
    allNoms.add(node.nomenclatureId)
    if (!children.has(node.nomenclatureId)) children.set(node.nomenclatureId, new Set())
  }
  const childNoms = new Set<string>()
  for (const node of expandedNodes) {
    if (node.parentExpandedId === null) continue
    const parent = byId.get(node.parentExpandedId)
    if (!parent) continue
    children.get(parent.nomenclatureId)!.add(node.nomenclatureId)
    childNoms.add(node.nomenclatureId)
  }

  const order: string[] = []
  const visited = new Set<string>()
  const onPath = new Set<string>()
  const visit = (nom: string): void => {
    if (visited.has(nom) || onPath.has(nom)) return
    onPath.add(nom)
    for (const child of [...(children.get(nom) ?? [])].sort()) visit(child)
    onPath.delete(nom)
    visited.add(nom)
    order.push(nom) // пост-порядок: дитина раніше батька
  }

  const roots = [...allNoms].filter((n) => !childNoms.has(n)).sort()
  for (const r of roots) visit(r)
  for (const n of [...allNoms].sort()) visit(n) // безпека: недосяжні

  const rank = new Map(order.map((nom, i) => [nom, i]))
  return [...expandedNodes].sort(
    (a, b) => (rank.get(a.nomenclatureId) ?? 0) - (rank.get(b.nomenclatureId) ?? 0),
  )
}
