import type { ScheduledOperation } from '../types/index.ts'
import { parentBomNodeId, operationId } from './dependencies.ts'

/**
 * Finds the critical operation path for an order.
 *
 * @param scheduledOps - Scheduled operations to evaluate
 * @param orderId - Identifier of the order whose path should be found
 * @returns An ordered list of operation identifiers from the path's start to its final operation, or an empty array when the order has no scheduled operations
 */
export function findCriticalPath(
  scheduledOps: ScheduledOperation[],
  orderId: string,
): string[] {
  const ops = scheduledOps.filter((o) => o.orderId === orderId)
  if (ops.length === 0) return []

  const byId = new Map<string, ScheduledOperation>()
  const byNode = new Map<string, ScheduledOperation[]>()
  for (const op of ops) {
    byId.set(operationId(op), op)
    const arr = byNode.get(op.bomNodeId)
    if (arr) arr.push(op)
    else byNode.set(op.bomNodeId, [op])
  }
  for (const arr of byNode.values()) arr.sort((a, b) => a.opNo - b.opNo)

  const childrenByParent = new Map<string, string[]>()
  for (const nodeId of byNode.keys()) {
    const parent = parentBomNodeId(nodeId)
    if (parent === null || !byNode.has(parent)) continue
    const arr = childrenByParent.get(parent)
    if (arr) arr.push(nodeId)
    else childrenByParent.set(parent, [nodeId])
  }

  // Список попередників для кожної операції.
  const preds = new Map<string, string[]>()
  for (const [nodeId, nodeOps] of byNode) {
    for (let i = 0; i < nodeOps.length; i++) {
      const id = operationId(nodeOps[i]!)
      if (i > 0) {
        preds.set(id, [operationId(nodeOps[i - 1]!)])
      } else {
        const childPreds: string[] = []
        for (const childId of childrenByParent.get(nodeId) ?? []) {
          const childOps = byNode.get(childId)!
          childPreds.push(operationId(childOps[childOps.length - 1]!))
        }
        preds.set(id, childPreds)
      }
    }
  }

  // Найдовший шлях (за сумарною тривалістю) до кожної операції.
  const memoDur = new Map<string, number>()
  const memoPrev = new Map<string, string | null>()
  const longest = (id: string): number => {
    const cached = memoDur.get(id)
    if (cached !== undefined) return cached
    const op = byId.get(id)!
    let bestDur = op.durationMin
    let bestPrev: string | null = null
    for (const p of preds.get(id) ?? []) {
      const d = longest(p) + op.durationMin
      if (d > bestDur || (d === bestDur && bestPrev !== null && p < bestPrev)) {
        bestDur = d
        bestPrev = p
      }
    }
    memoDur.set(id, bestDur)
    memoPrev.set(id, bestPrev)
    return bestDur
  }

  // Фінальна операція = з найпізнішим `endAt`; тай-брейк детермінований.
  let endOp = ops[0]!
  for (const op of ops) {
    const a = op.endAt.getTime()
    const b = endOp.endAt.getTime()
    if (a > b || (a === b && operationId(op) > operationId(endOp))) endOp = op
  }

  const endId = operationId(endOp)
  longest(endId)

  const path: string[] = []
  let cur: string | null = endId
  while (cur !== null) {
    path.unshift(cur)
    cur = memoPrev.get(cur) ?? null
  }
  return path
}
