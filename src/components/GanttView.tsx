import { useMemo, useState } from 'react'
import { buildGanttData, type GanttTask } from '../../lib/gantt/index.ts'
import { useSessionStore } from '../store/session-store.ts'
import { GanttChart, type GanttFilters, type GanttScale } from './GanttChart.tsx'
import './gantt.css'

const SCALES: { key: GanttScale; label: string }[] = [
  { key: 'hour', label: 'Година' },
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Тиждень' },
  { key: 'month', label: 'Місяць' },
]

const STATUSES: { key: string; label: string }[] = [
  { key: 'ok', label: 'В нормі' },
  { key: 'at-risk', label: 'Під загрозою' },
  { key: 'late', label: 'Запізнення' },
  { key: 'blocked-material', label: 'Заблоковано матеріалом' },
]

/** 4.8 — Екран Гантта: тулбар, фільтри, критичний шлях, бокова панель. */
export function GanttView() {
  const plan = useSessionStore((s) => s.plan)
  const planInput = useSessionStore((s) => s.planInput)
  const lockedOpIds = useSessionStore((s) => s.lockedOpIds)
  const moveOperation = useSessionStore((s) => s.moveOperation)

  const [scale, setScale] = useState<GanttScale>('day')
  const [filters, setFilters] = useState<GanttFilters>({})
  const [criticalOrderId, setCriticalOrderId] = useState('')
  const [criticalOn, setCriticalOn] = useState(false)
  const [selectedOp, setSelectedOp] = useState<GanttTask | null>(null)

  const data = useMemo(() => {
    if (!plan || !planInput) return { tasks: [] }
    return buildGanttData({
      operations: plan.operations,
      rcGroups: planInput.rcGroups,
      resourceCenters: planInput.resourceCenters,
      lockedOpIds,
    })
  }, [plan, planInput, lockedOpIds])

  const criticalOpIds = useMemo(() => {
    if (!plan || !criticalOn || !criticalOrderId) return new Set<string>()
    const order = plan.orders.find((o) => o.orderId === criticalOrderId)
    return new Set(order?.criticalPath ?? [])
  }, [plan, criticalOn, criticalOrderId])

  if (!plan || !planInput) return null

  const orders = plan.orders.map((o) => o.orderId)
  const nomenclatures = [...new Set(plan.operations.map((o) => o.nomenclatureId))].sort()
  const effectiveFilters: GanttFilters = { ...filters, criticalOnly: criticalOn && !criticalOrderId ? false : filters.criticalOnly }

  return (
    <section className="gantt">
      <header className="gantt__header">
        <h2>Діаграма Гантта</h2>
        <div className="gantt__legend">
          <span className="lg lg--ok">в нормі</span>
          <span className="lg lg--risk">під загрозою</span>
          <span className="lg lg--late">запізнення</span>
          <span className="lg lg--blocked">блок. матеріал</span>
          <span className="lg lg--locked">закріплено</span>
        </div>
      </header>

      <div className="gantt__toolbar">
        <div className="tb-group">
          <span className="tb-label">Масштаб:</span>
          {SCALES.map((s) => (
            <button
              key={s.key}
              type="button"
              className={scale === s.key ? 'tb-btn tb-btn--active' : 'tb-btn'}
              onClick={() => setScale(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="tb-group">
          <select
            value={filters.rcGroupId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, rcGroupId: e.target.value || undefined }))}
          >
            <option value="">Усі ГРЦ</option>
            {planInput.rcGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={filters.orderId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, orderId: e.target.value || undefined }))}
          >
            <option value="">Усі замовлення</option>
            {orders.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <select
            value={filters.nomenclatureId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, nomenclatureId: e.target.value || undefined }))}
          >
            <option value="">Уся номенклатура</option>
            {nomenclatures.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            value={filters.status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
          >
            <option value="">Усі статуси</option>
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="tb-group">
          <select value={criticalOrderId} onChange={(e) => setCriticalOrderId(e.target.value)}>
            <option value="">Замовлення для крит. шляху</option>
            {orders.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={criticalOn ? 'tb-btn tb-btn--active' : 'tb-btn'}
            disabled={!criticalOrderId}
            onClick={() => setCriticalOn((v) => !v)}
          >
            Критичний шлях
          </button>
          <label className="tb-check">
            <input
              type="checkbox"
              checked={Boolean(filters.criticalOnly)}
              onChange={(e) => setFilters((f) => ({ ...f, criticalOnly: e.target.checked }))}
            />
            лише критичний шлях
          </label>
        </div>
      </div>

      <div className="gantt__body">
        <GanttChart
          data={data}
          scale={scale}
          today={planInput.today}
          filters={effectiveFilters}
          criticalOpIds={criticalOpIds}
          onMove={moveOperation}
          onSelectOp={setSelectedOp}
        />
        {selectedOp && (
          <aside className="op-panel">
            <button type="button" className="op-panel__close" onClick={() => setSelectedOp(null)}>
              ✕
            </button>
            <h3>{selectedOp.opName}</h3>
            <dl>
              <dt>Замовлення</dt>
              <dd>{selectedOp.orderId}</dd>
              <dt>Номенклатура</dt>
              <dd>{selectedOp.nomenclatureId}</dd>
              <dt>Місце в BOM</dt>
              <dd>{selectedOp.bomNodeId}</dd>
              <dt>ГРЦ / РЦ</dt>
              <dd>
                {selectedOp.rcGroupId} / {selectedOp.rcId}
              </dd>
              <dt>Тривалість</dt>
              <dd>{selectedOp.durationMin} хв</dd>
              <dt>Статус</dt>
              <dd>{selectedOp.status}</dd>
              {selectedOp.blockedByMaterialId && (
                <>
                  <dt>Дефіцит матеріалу</dt>
                  <dd>{selectedOp.blockedByMaterialId}</dd>
                </>
              )}
              {selectedOp.locked && (
                <>
                  <dt>Закріплено</dt>
                  <dd>так (ручне коригування)</dd>
                </>
              )}
            </dl>
          </aside>
        )}
      </div>
    </section>
  )
}
