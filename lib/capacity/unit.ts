import type { CapacityUnit } from './types.ts'

const MS_PER_DAY = 86_400_000

/**
 * Selects the time unit for an axis based on the horizon length.
 *
 * @returns `day` for horizons up to 35 days, `week` for horizons up to 110 days, and `month` for longer horizons.
 */
export function pickUnit(today: Date, horizon: Date): CapacityUnit {
  const days = Math.round((horizon.getTime() - today.getTime()) / MS_PER_DAY)
  if (days <= 35) return 'day'
  if (days <= 110) return 'week'
  return 'month'
}
