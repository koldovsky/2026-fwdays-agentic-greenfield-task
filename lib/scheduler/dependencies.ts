import type { ScheduledOperation } from '../types/index.ts'

/**
 * Формує стабільний ідентифікатор запланованої операції.
 *
 * @param op - Запланована операція
 * @returns Ідентифікатор у форматі `bomNodeId#opNo`
 */
export function operationId(op: ScheduledOperation): string {
  return `${op.bomNodeId}#${op.opNo}`
}

/**
 * Determines the parent BOM node identifier from a path-like node identifier.
 *
 * @param bomNodeId - The path-like BOM node identifier
 * @returns The substring before the last `/`, or `null` if the identifier has no `/`
 */
export function parentBomNodeId(bomNodeId: string): string | null {
  const idx = bomNodeId.lastIndexOf('/')
  return idx === -1 ? null : bomNodeId.slice(0, idx)
}

/**
 * Builds predecessor relationships for scheduled operations.
 *
 * Operations within a BOM node depend on the preceding operation by operation
 * number. The first operation in a node depends on the final operation of each
 * existing child BOM node.
 *
 * @param ops - Scheduled operations to organize into predecessor relationships
 * @returns A map from each operation identifier to its predecessor identifiers
 */
export function buildPredecessors(ops: ScheduledOperation[]): Map<string, string[]> {
  const byNode = new Map<string, ScheduledOperation[]>()
  for (const op of ops) {
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
  return preds
}
