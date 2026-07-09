import type { ScheduledOperation } from '../types/index.ts'

/** Стабільний ідентифікатор розміщеної операції. */
export function operationId(op: ScheduledOperation): string {
  return `${op.bomNodeId}#${op.opNo}`
}

/** Батьківський bomNodeId зі шляхового id (розділювач `/`); null для кореня. */
export function parentBomNodeId(bomNodeId: string): string | null {
  const idx = bomNodeId.lastIndexOf('/')
  return idx === -1 ? null : bomNodeId.slice(0, idx)
}

/** Предки-предшественники кожної операції (маршрут + дочірні вузли BOM). */
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
