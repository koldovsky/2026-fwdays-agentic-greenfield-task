import { buildOrderDashboard } from '../dashboard/index.ts'
import { splitDeficits } from '../material/index.ts'
import type { BuildOverviewOptions, Overview } from './types.ts'

/** Скільки замовлень показувати у блоці «топ запізнень». */
const TOP_DELAYS = 5

/**
 * Builds the overview data for order statuses, delays, critical deficits, and overloaded capacity cells.
 *
 * @param opts - Source orders, results, deficits, calendar, and capacity data.
 * @returns The overview containing status counts, top delays, critical deficits, and overloaded cells.
 */
export function buildOverview(opts: BuildOverviewOptions): Overview {
  const dashboard = buildOrderDashboard({
    orders: opts.orders,
    orderResults: opts.orderResults,
    deficits: opts.deficits,
    calendar: opts.calendar,
  })

  const topDelays = dashboard.rows.filter((r) => r.delayDays > 0).slice(0, TOP_DELAYS)
  const criticalDeficits = splitDeficits(opts.deficits).critical
  const overloadedCells = opts.capacity
    .filter((c) => c.loadPct > 100)
    .slice()
    .sort((a, b) => {
      if (b.loadPct !== a.loadPct) return b.loadPct - a.loadPct
      if (a.date.getTime() !== b.date.getTime()) return a.date.getTime() - b.date.getTime()
      return a.rcId.localeCompare(b.rcId)
    })

  return {
    statusCounts: dashboard.summary,
    topDelays,
    criticalDeficits,
    overloadedCells,
  }
}
