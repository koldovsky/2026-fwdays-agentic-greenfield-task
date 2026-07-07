import type { CapacityUnit } from './types.ts'

const MS_PER_DAY = 86_400_000

/**
 * 1.2 — Одиниця осі X за довжиною горизонту (FR-CAP-03):
 * ≤ 35 днів → день (≈ 3 тижні), ≤ 110 днів → тиждень (≈ 3 місяці),
 * інакше → місяць (рік).
 */
export function pickUnit(today: Date, horizon: Date): CapacityUnit {
  const days = Math.round((horizon.getTime() - today.getTime()) / MS_PER_DAY)
  if (days <= 35) return 'day'
  if (days <= 110) return 'week'
  return 'month'
}
