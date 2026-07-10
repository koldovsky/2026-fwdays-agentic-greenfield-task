import type { OperationStatus } from '../types/index.ts'

/** Тип рядка Гантта: група РЦ, ресурсний центр або операція. */
export type TaskKind = 'group' | 'rc' | 'op'

/**
 * Задача Гантта у форматі, придатному для `gantt.parse` (dhtmlx-gantt).
 * Дати — рядки `YYYY-MM-DD HH:mm`; `parent` = 0 для кореня.
 */
export interface GanttTask {
  id: string
  text: string
  parent: string | number
  type: 'project' | 'task'
  open?: boolean
  start_date?: string
  end_date?: string
  /** CSS-клас смуги (колір/штрихування). */
  css?: string

  // Метадані (для фільтрів, панелі деталей, підсвітки).
  kind: TaskKind
  status?: OperationStatus
  orderId?: string
  nomenclatureId?: string
  opName?: string
  opNo?: number
  rcId?: string
  rcGroupId?: string
  bomNodeId?: string
  durationMin?: number
  blockedByMaterialId?: string
  locked?: boolean
}

export interface GanttData {
  tasks: GanttTask[]
}
