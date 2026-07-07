/**
 * Публічний API чистої логіки Гантта (без залежностей від dhtmlx, React, DOM).
 *
 * @module lib/gantt
 */
export type { GanttTask, GanttData, TaskKind } from './types.ts'
export { taskCssClass } from './status.ts'
export { buildGanttData, operationTaskId, type BuildGanttOptions } from './to-gantt.ts'
