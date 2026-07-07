import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { buildCapacityView, type CapacityLevel, type CapacityRow, type CapacityView as CapacityModel } from '../../lib/capacity/index.ts'
import { useSessionStore } from '../store/session-store.ts'
import './capacity.css'

const COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#059669', '#ca8a04', '#db2777', '#0d9488', '#4f46e5']
const OVERLOAD = '#dc2626'

interface TooltipEntry {
  dataKey?: string | number
  value?: number
  color?: string
  payload?: CapacityRow
}

function renderTooltip(
  active: boolean | undefined,
  payload: TooltipEntry[] | undefined,
  view: CapacityModel,
): React.ReactNode {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0]?.payload
  const bucketStart = row?.bucketStart
  return (
    <div className="cap-tip">
      <div className="cap-tip__bucket">{row?.bucket}</div>
      {payload.map((entry) => {
        const key = String(entry.dataKey ?? '')
        const name = view.series.find((s) => s.key === key)?.name ?? key
        const ops = view.opsByCell[`${key}__${bucketStart}`] ?? []
        return (
          <div key={key} className="cap-tip__series">
            <div className="cap-tip__head" style={{ color: entry.color }}>
              {name}: {entry.value}%
            </div>
            {ops.length > 0 && (
              <ul className="cap-tip__ops">
                {ops.slice(0, 8).map((op, i) => (
                  <li key={i}>
                    {op.opName} · {op.orderId} · {op.durationMin} хв
                  </li>
                ))}
                {ops.length > 8 && <li>…ще {ops.length - 8}</li>}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Екран завантаженості РЦ на Recharts (FR-CAP-01..05). */
export function CapacityView() {
  const plan = useSessionStore((s) => s.plan)
  const planInput = useSessionStore((s) => s.planInput)
  const [level, setLevel] = useState<CapacityLevel>('group')

  const view = useMemo(() => {
    if (!plan || !planInput) return null
    return buildCapacityView({
      capacity: plan.capacity,
      operations: plan.operations,
      resourceCenters: planInput.resourceCenters,
      rcGroups: planInput.rcGroups,
      calendar: planInput.calendar,
      today: planInput.today,
      horizon: planInput.horizon,
      level,
    })
  }, [plan, planInput, level])

  if (!view) return null

  const maxVal = view.data.reduce((m, row) => {
    for (const s of view.series) {
      const v = Number(row[s.key] ?? 0)
      if (v > m) m = v
    }
    return m
  }, 0)
  const yMax = Math.max(120, Math.ceil(maxVal / 10) * 10)
  const unitLabel = view.unit === 'day' ? 'дні' : view.unit === 'week' ? 'тижні' : 'місяці'

  return (
    <section className="cap">
      <header className="cap__header">
        <h2>Завантаженість РЦ</h2>
        <div className="cap__level">
          <button
            type="button"
            className={level === 'group' ? 'tb-btn tb-btn--active' : 'tb-btn'}
            onClick={() => setLevel('group')}
          >
            По ГРЦ
          </button>
          <button
            type="button"
            className={level === 'rc' ? 'tb-btn tb-btn--active' : 'tb-btn'}
            onClick={() => setLevel('rc')}
          >
            По РЦ
          </button>
        </div>
      </header>

      <div className="cap__kpi">
        <div className="kpi">
          <div className="kpi__value">{view.kpis.avgLoadPct}%</div>
          <div className="kpi__label">Середня завантаженість</div>
        </div>
        <div className={`kpi${view.kpis.overloadedSlots > 0 ? ' kpi--warn' : ''}`}>
          <div className="kpi__value">{view.kpis.overloadedSlots}</div>
          <div className="kpi__label">Перевантажених слотів</div>
        </div>
        <div className={`kpi${view.kpis.zeroLoadRcs > 0 ? ' kpi--idle' : ''}`}>
          <div className="kpi__value">{view.kpis.zeroLoadRcs}</div>
          <div className="kpi__label">РЦ у простої</div>
        </div>
      </div>

      <div className="cap__chart">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={view.data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} label={{ value: unitLabel, position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
            <YAxis domain={[0, yMax]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
            <ReferenceLine y={100} stroke={OVERLOAD} strokeDasharray="4 4" label={{ value: '100%', position: 'right', fontSize: 10, fill: OVERLOAD }} />
            <Tooltip content={({ active, payload }) => renderTooltip(active, payload as unknown as TooltipEntry[], view)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {view.series.map((s, si) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={COLORS[si % COLORS.length]}>
                {view.data.map((row) => (
                  <Cell
                    key={row.bucketStart}
                    fill={Number(row[s.key] ?? 0) > 100 ? OVERLOAD : COLORS[si % COLORS.length]}
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
