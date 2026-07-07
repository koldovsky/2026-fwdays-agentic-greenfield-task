import { useMemo } from 'react'
import { buildOverview } from '../../lib/overview/index.ts'
import { useSessionStore } from '../store/session-store.ts'
import './overview.css'

function scrollTo(anchor: string) {
  document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}`
}

/** Головний дашборд: 4 KPI-блоки з deep-link (FR-DASH-01..02). */
export function OverviewDashboard() {
  const plan = useSessionStore((s) => s.plan)
  const planInput = useSessionStore((s) => s.planInput)

  const overview = useMemo(() => {
    if (!plan || !planInput) return null
    return buildOverview({
      orders: planInput.orders,
      orderResults: plan.orders,
      deficits: plan.deficits,
      capacity: plan.capacity,
      calendar: planInput.calendar,
    })
  }, [plan, planInput])

  if (!overview) return null
  const { statusCounts, topDelays, criticalDeficits, overloadedCells } = overview

  return (
    <section className="ov">
      <h2>Дашборд</h2>
      <div className="ov-grid">
        <button type="button" className="ov-card" onClick={() => scrollTo('view-orders')}>
          <div className="ov-card__title">Статуси замовлень →</div>
          <div className="ov-card__big">{statusCounts.total}</div>
          <ul className="ov-card__list">
            <li><span className="dot dot--ok" /> В графіку: {statusCounts.onSchedule}</li>
            <li><span className="dot dot--risk" /> Під загрозою: {statusCounts.atRisk}</li>
            <li><span className="dot dot--late" /> Запізнення: {statusCounts.late}</li>
            <li><span className="dot dot--blocked" /> Заблоковано: {statusCounts.blocked}</li>
          </ul>
        </button>

        <button type="button" className="ov-card" onClick={() => scrollTo('view-gantt')}>
          <div className="ov-card__title">Топ-5 запізнень →</div>
          <div className="ov-card__big ov-card__big--late">{topDelays.length}</div>
          {topDelays.length === 0 ? (
            <p className="ov-card__empty">Запізнень немає ✓</p>
          ) : (
            <ul className="ov-card__list">
              {topDelays.map((r) => (
                <li key={r.orderId}>
                  {r.orderId} <span className="ov-delay">+{r.delayDays} дн.</span>
                </li>
              ))}
            </ul>
          )}
        </button>

        <button type="button" className="ov-card" onClick={() => scrollTo('view-materials')}>
          <div className="ov-card__title">Критичні дефіцити →</div>
          <div className={`ov-card__big${criticalDeficits.length > 0 ? ' ov-card__big--crit' : ''}`}>
            {criticalDeficits.length}
          </div>
          {criticalDeficits.length === 0 ? (
            <p className="ov-card__empty">Критичних дефіцитів немає ✓</p>
          ) : (
            <ul className="ov-card__list">
              {criticalDeficits.slice(0, 5).map((d) => (
                <li key={d.nomenclatureId}>
                  {d.nomenclatureId} <span className="ov-delay">−{d.netDeficit}</span>
                </li>
              ))}
              {criticalDeficits.length > 5 && <li>…ще {criticalDeficits.length - 5}</li>}
            </ul>
          )}
        </button>

        <button type="button" className="ov-card" onClick={() => scrollTo('view-capacity')}>
          <div className="ov-card__title">Перевантажені РЦ →</div>
          <div className={`ov-card__big${overloadedCells.length > 0 ? ' ov-card__big--crit' : ''}`}>
            {overloadedCells.length}
          </div>
          {overloadedCells.length === 0 ? (
            <p className="ov-card__empty">Перевантажень немає ✓</p>
          ) : (
            <ul className="ov-card__list">
              {overloadedCells.slice(0, 5).map((c) => (
                <li key={`${c.rcId}-${c.date.getTime()}`}>
                  {c.rcId} · {fmtDate(c.date)} <span className="ov-delay">{Math.round(c.loadPct)}%</span>
                </li>
              ))}
              {overloadedCells.length > 5 && <li>…ще {overloadedCells.length - 5}</li>}
            </ul>
          )}
        </button>
      </div>
    </section>
  )
}
