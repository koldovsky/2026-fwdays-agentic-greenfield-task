import type { OperationStatus } from '../types/index.ts'

/**
 * 1.2 — Клас кольору смуги операції за статусом (FR-GANTT-03):
 * синій=ok, жовтий=at-risk, червоний=late, сірий=blocked-material;
 * закріплена вручну операція додатково отримує клас штрихування.
 */
const STATUS_CLASS: Record<OperationStatus, string> = {
  ok: 'gop gop--ok',
  'at-risk': 'gop gop--risk',
  late: 'gop gop--late',
  'blocked-material': 'gop gop--blocked',
}

export function taskCssClass(status: OperationStatus, locked = false): string {
  const base = STATUS_CLASS[status]
  return locked ? `${base} gop--locked` : base
}
