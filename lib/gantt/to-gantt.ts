import type { RcGroup, ResourceCenter, ScheduledOperation } from '../types/index.ts'
import type { GanttData, GanttTask } from './types.ts'
import { taskCssClass } from './status.ts'

/**
 * Creates a stable identifier for a scheduled operation.
 *
 * @param op - The operation identifiers used to construct the task ID
 * @returns An identifier in the format `bomNodeId#opNo`
 */
export function operationTaskId(op: Pick<ScheduledOperation, 'bomNodeId' | 'opNo'>): string {
  return `${op.bomNodeId}#${op.opNo}`
}

/**
 * Converts a number to a string padded with a leading zero to at least two characters.
 *
 * @param n - The number to format
 * @returns The padded string
 */
function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Formats a date as a dhtmlx-compatible UTC datetime string.
 *
 * @param d - The date to format
 * @returns The date in `%Y-%m-%d %H:%i` format
 */
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
 * Формує детерміновану трирівневу ієрархію ГРЦ → РЦ → операція для Gantt-діаграми.
 *
 * До результату потрапляють лише групи та ресурсні центри, пов’язані з операціями.
 * Операції містять часові межі, текстову мітку, статус, CSS-класи та службові атрибути.
 *
 * @param opts - Операції, групи ресурсних центрів, ресурсні центри та набори заблокованих або критичних операцій
 * @returns Модель Gantt-даних із вузлами груп, ресурсних центрів і операцій
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
