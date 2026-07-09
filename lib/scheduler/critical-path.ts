import type { ScheduledOperation } from '../types/index.ts'
import { parentBomNodeId, operationId } from './dependencies.ts'

/**
 * 9.1 — Критичний шлях замовлення (FR-SCHED-10): найдовший (за сумарною
 * трудомісткістю) ланцюжок операцій, що визначає найранішу дату готовності.
 *
 * Залежності відновлюються зі структури:
 *  - у межах вузла: операція залежить від попередньої за `opNo` (finish-to-start);
 *  - перша операція вузла залежить від останньої операції кожного дочірнього
 *    вузла BOM (FR-SCHED-05).
 *
 * Повертає масив `operationId` від кореня ланцюжка до фінальної операції.
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
