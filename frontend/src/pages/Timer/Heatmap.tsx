import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { getHeatmap, type HeatmapDay, type HeatmapPeriod } from '../../api'

// delibra "kiln" ramp for Cadence's 5 intensity levels (0 = none .. 4 = neon).
const LEVEL_COLORS = ['var(--hm-0)', 'var(--hm-2)', 'var(--hm-3)', 'var(--hm-4)', 'var(--hm-5)']

const CELL = 11
const GAP = 3
const STEP = CELL + GAP
const LEFT_PAD = 26 // room for the Mon/Wed/Fri labels
const TOP_PAD = 18 // room for the month labels
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['', 'Mon', '', 'Wed', '', 'Fri', '']

const PERIODS: { key: HeatmapPeriod; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: '6mo', label: '6 Months' },
  { key: 'year', label: 'Year' },
]

/** Parse a 'YYYY-MM-DD' as a LOCAL date so the weekday/column math never tz-shifts. */
function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtTotal(min: number): string {
  if (min <= 0) return '0m'
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtFullDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

interface Tip {
  x: number
  y: number
  date: string
  min: number
}

export default function Heatmap() {
  const [period, setPeriod] = useState<HeatmapPeriod>('year')
  const [days, setDays] = useState<HeatmapDay[] | null>(null)
  const [tip, setTip] = useState<Tip | null>(null)

  const segRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<{ left: number; width: number }>({ left: 0, width: 0 })

  useEffect(() => {
    let alive = true
    setDays(null)
    getHeatmap(period)
      .then((res) => {
        if (alive) setDays(res.days)
      })
      .catch(() => {
        if (alive) setDays([])
      })
    return () => {
      alive = false
    }
  }, [period])

  // Slide the segmented-control thumb under the active period button.
  useLayoutEffect(() => {
    const seg = segRef.current
    if (!seg) return
    const active = seg.querySelector<HTMLElement>('.seg-btn.active')
    if (active) setThumb({ left: active.offsetLeft, width: active.offsetWidth })
  }, [period])

  const total = days ? days.reduce((sum, d) => sum + d.min, 0) : 0

  // Build the SVG grid: columns are weeks (Sunday-started), rows are the 7 weekdays.
  let cols = 0
  const cells: { x: number; y: number; color: string; day: HeatmapDay }[] = []
  const monthLabels: { x: number; text: string }[] = []
  if (days && days.length > 0) {
    const first = parseYMD(days[0].date)
    const weekStart = new Date(first)
    weekStart.setDate(first.getDate() - first.getDay()) // back to that week's Sunday
    let lastMonth = -1
    for (const day of days) {
      const d = parseYMD(day.date)
      const weekIndex = Math.floor((d.getTime() - weekStart.getTime()) / (7 * 86400000))
      const row = d.getDay()
      cols = Math.max(cols, weekIndex + 1)
      cells.push({
        x: LEFT_PAD + weekIndex * STEP,
        y: TOP_PAD + row * STEP,
        color: LEVEL_COLORS[Math.min(day.level, 4)] ?? LEVEL_COLORS[0],
        day,
      })
      if (row === 0 && d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth()
        monthLabels.push({ x: LEFT_PAD + weekIndex * STEP, text: MONTHS[d.getMonth()] })
      }
    }
  }
  const width = LEFT_PAD + Math.max(cols, 1) * STEP
  const height = TOP_PAD + 7 * STEP

  return (
    <div className="card heatmap-card">
      <div className="card-header">
        <h2 className="micro-label">Activity</h2>
        <div className="card-header-right">
          <span className="card-meta">{fmtTotal(total)}</span>
          <div className="seg-control" ref={segRef} role="tablist">
            <span className="seg-thumb" style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }} />
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`seg-btn${period === p.key ? ' active' : ''}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="heatmap-wrap">
        <div id="heatmap-container">
          {days === null ? (
            <div className="empty-state">Loading…</div>
          ) : (
            <svg className="heatmap-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
              {monthLabels.map((m, i) => (
                <text key={i} className="heatmap-label" x={m.x} y={11}>
                  {m.text}
                </text>
              ))}
              {DOW.map((label, row) =>
                label ? (
                  <text key={row} className="heatmap-label" x={0} y={TOP_PAD + row * STEP + CELL - 1}>
                    {label}
                  </text>
                ) : null,
              )}
              {cells.map((c, i) => (
                <rect
                  key={i}
                  className="heatmap-cell"
                  x={c.x}
                  y={c.y}
                  width={CELL}
                  height={CELL}
                  fill={c.color}
                  style={{ animationDelay: `${Math.min(i * 1.2, 600)}ms` }}
                  onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, date: c.day.date, min: c.day.min })}
                  onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, date: c.day.date, min: c.day.min })}
                  onMouseLeave={() => setTip(null)}
                />
              ))}
            </svg>
          )}
        </div>
      </div>

      <div className="hm-legend">
        <span>Less</span>
        {LEVEL_COLORS.map((c) => (
          <span key={c} className="hm-legend-cell" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>

      {tip && (
        <div
          id="heatmap-tooltip"
          style={{ display: 'block', left: tip.x + 14, top: tip.y + 14 }}
        >
          <div className="tip-date">{fmtFullDate(parseYMD(tip.date))}</div>
          <div className="tip-total">{fmtTotal(tip.min)}</div>
        </div>
      )}
    </div>
  )
}
