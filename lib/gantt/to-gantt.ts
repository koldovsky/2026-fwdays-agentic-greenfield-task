import type { RcGroup, ResourceCenter, ScheduledOperation } from '../types/index.ts'
import type { GanttData, GanttTask } from './types.ts'
import { taskCssClass } from './status.ts'

/** Стабільний id операції (узгоджено з `operationId` / `OrderResult.criticalPath`). */
export function operationTaskId(op: Pick<ScheduledOperation, 'bomNodeId' | 'opNo'>): string {
  return `${op.bomNodeId}#${op.opNo}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Формат дати для dhtmlx (`%Y-%m-%d %H:%i`), у UTC-компонентах. */
function fmt(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

export interface BuildGanttOptions {
  operations: ScheduledOperation[]
  rcGroups: RcGroup[]
  resourceCenters: ResourceCenter[]
  /** id закріплених операцій (штрихування). */
  lockedOpIds?: Iterable<string>
  /** id операцій критичного шляху (підсвітка). */
  criticalOpIds?: Iterable<string>
}

/**
 * 1.3 — Побудова моделі Гантта: трирівневе дерево ГРЦ → РЦ → операція
 * (FR-GANTT-01), з текстом смуги «операція · замовлення · номенклатура»
 * (FR-GANTT-02) і класом кольору за статусом (FR-GANTT-03).
 *
 * Включаються лише ГРЦ/РЦ, що мають хоч одну операцію. Детермінований порядок.
 */
export function buildGanttData(opts: BuildGanttOptions): GanttData {
  const locked = new Set(opts.lockedOpIds ?? [])
  const critical = new Set(opts.criticalOpIds ?? [])
  const rcById = new Map(opts.resourceCenters.map((rc) => [rc.id, rc]))
  const groupById = new Map(opts.rcGroups.map((g) => [g.id, g]))

  // Група РЦ для кожного РЦ, що зустрічається в операціях.
  const groupOfRc = new Map<string, string>()
  for (const op of opts.operations) {
    if (!groupOfRc.has(op.rcId)) {
      groupOfRc.set(op.rcId, rcById.get(op.rcId)?.groupId ?? op.rcGroupId)
    }
  }
  const rcsByGroup = new Map<string, Set<string>>()
  for (const [rcId, gid] of groupOfRc) {
    if (!rcsByGroup.has(gid)) rcsByGroup.set(gid, new Set())
    rcsByGroup.get(gid)!.add(rcId)
  }

  const tasks: GanttTask[] = []
  for (const gid of [...rcsByGroup.keys()].sort()) {
    tasks.push({
      id: `grp:${gid}`,
      text: groupById.get(gid)?.name ?? gid,
      parent: 0,
      type: 'project',
      open: true,
      kind: 'group',
      rcGroupId: gid,
    })
    for (const rcId of [...rcsByGroup.get(gid)!].sort()) {
      tasks.push({
        id: `rc:${rcId}`,
        text: rcById.get(rcId)?.name ?? rcId,
        parent: `grp:${gid}`,
        type: 'project',
        open: true,
        kind: 'rc',
        rcId,
        rcGroupId: gid,
      })
    }
  }

  const ops = [...opts.operations].sort((a, b) => {
    const d = a.startAt.getTime() - b.startAt.getTime()
    if (d !== 0) return d
    return operationTaskId(a).localeCompare(operationTaskId(b))
  })
  for (const op of ops) {
    const id = operationTaskId(op)
    const isLocked = locked.has(id)
    let css = taskCssClass(op.status, isLocked)
    if (critical.has(id)) css += ' gop--critical'
    tasks.push({
      id,
      text: `${op.opName} · ${op.orderId} · ${op.nomenclatureId}`,
      parent: `rc:${op.rcId}`,
      type: 'task',
      start_date: fmt(op.startAt),
      end_date: fmt(op.endAt),
      css,
      kind: 'op',
      status: op.status,
      orderId: op.orderId,
      nomenclatureId: op.nomenclatureId,
      opName: op.opName,
      opNo: op.opNo,
      rcId: op.rcId,
      rcGroupId: op.rcGroupId,
      bomNodeId: op.bomNodeId,
      durationMin: op.durationMin,
      locked: isLocked,
      ...(op.blockedByMaterialId ? { blockedByMaterialId: op.blockedByMaterialId } : {}),
    })
  }

  return { tasks }
}
