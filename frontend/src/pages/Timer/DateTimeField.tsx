import { useEffect, useMemo, useRef, useState } from 'react'

import './datetimefield.css'

// Custom date + time picker replacing <input type="datetime-local"> (whose OS
// popup can't be themed). Same value contract as the native control — a
// `YYYY-MM-DDTHH:mm` local string — so the surrounding form logic is unchanged.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const pad = (n: number): string => n.toString().padStart(2, '0')
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

interface Parts {
  y: number
  mo: number // 0-based
  d: number
  h: number
  mi: number
}

function parse(value: string): Parts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!m) return null
  return { y: +m[1], mo: +m[2] - 1, d: +m[3], h: +m[4], mi: +m[5] }
}

function assemble(p: Parts): string {
  return `${p.y}-${pad(p.mo + 1)}-${pad(p.d)}T${pad(clamp(p.h, 0, 23))}:${pad(clamp(p.mi, 0, 59))}`
}

function nowParts(): Parts {
  const d = new Date()
  return { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate(), h: d.getHours(), mi: d.getMinutes() }
}

interface Cell {
  y: number
  mo: number
  d: number
  inMonth: boolean
}

function buildGrid(y: number, mo: number): Cell[] {
  const startOffset = (new Date(y, mo, 1).getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(y, mo + 1, 0).getDate()
  const prevDays = new Date(y, mo, 0).getDate()
  const cells: Cell[] = []
  for (let i = 0; i < startOffset; i++) {
    const d = prevDays - startOffset + 1 + i
    const date = new Date(y, mo - 1, d)
    cells.push({ y: date.getFullYear(), mo: date.getMonth(), d, inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ y, mo, d, inMonth: true })
  for (let nextD = 1; cells.length < 42; nextD++) {
    const date = new Date(y, mo + 1, nextD)
    cells.push({ y: date.getFullYear(), mo: date.getMonth(), d: nextD, inMonth: false })
  }
  return cells
}

export default function DateTimeField({
  value,
  onChange,
  ariaLabel = 'Date and time',
}: {
  value: string
  onChange: (v: string) => void
  ariaLabel?: string
}) {
  const parts = parse(value)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const b = parts ?? nowParts()
    return { y: b.y, mo: b.mo }
  })
  const [hStr, setHStr] = useState(parts ? pad(parts.h) : '')
  const [miStr, setMiStr] = useState(parts ? pad(parts.mi) : '')

  const wrapRef = useRef<HTMLDivElement>(null)

  // Keep the time inputs in sync with the external value.
  useEffect(() => {
    const p = parse(value)
    setHStr(p ? pad(p.h) : '')
    setMiStr(p ? pad(p.mi) : '')
  }, [value])

  // On open, jump the grid to the selected month (or this month).
  useEffect(() => {
    if (!open) return
    const b = parse(value) ?? nowParts()
    setView({ y: b.y, mo: b.mo })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on any click/tap outside the widget.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const cells = useMemo(() => buildGrid(view.y, view.mo), [view])
  const today = nowParts()

  function commit(next: Partial<Parts>): void {
    const base = parse(value) ?? nowParts()
    onChange(assemble({ ...base, ...next }))
  }

  function shiftMonth(delta: number): void {
    setView((v) => {
      const d = new Date(v.y, v.mo + delta, 1)
      return { y: d.getFullYear(), mo: d.getMonth() }
    })
  }

  const label = parts
    ? `${parts.d} ${MONTHS[parts.mo]} ${parts.y} · ${pad(parts.h)}:${pad(parts.mi)}`
    : 'Set date & time'

  return (
    <div className="dtf" ref={wrapRef}>
      <button
        type="button"
        className={`dtf-trigger${parts ? '' : ' dtf-trigger--empty'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="dtf-cal-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="dtf-value">{label}</span>
      </button>

      {open && (
        <div className="dtf-panel" role="dialog" aria-label={ariaLabel}>
          <div className="dtf-head">
            <button type="button" className="dtf-nav" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
              <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden="true">
                <path d="M7 1L2 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="dtf-title">
              {MONTHS[view.mo]} {view.y}
            </span>
            <button type="button" className="dtf-nav" aria-label="Next month" onClick={() => shiftMonth(1)}>
              <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden="true">
                <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="dtf-grid dtf-weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w} className="dtf-wd">
                {w[0]}
              </span>
            ))}
          </div>

          <div className="dtf-grid">
            {cells.map((c, i) => {
              const sel = parts != null && c.y === parts.y && c.mo === parts.mo && c.d === parts.d
              const isToday = c.y === today.y && c.mo === today.mo && c.d === today.d
              return (
                <button
                  key={i}
                  type="button"
                  className={
                    'dtf-day' +
                    (c.inMonth ? '' : ' dtf-day--out') +
                    (isToday ? ' dtf-day--today' : '') +
                    (sel ? ' dtf-day--sel' : '')
                  }
                  onClick={() => {
                    commit({ y: c.y, mo: c.mo, d: c.d })
                    setView({ y: c.y, mo: c.mo })
                  }}
                >
                  {c.d}
                </button>
              )
            })}
          </div>

          <div className="dtf-time">
            <span className="dtf-time-label">Time</span>
            <div className="dtf-time-inputs">
              <input
                className="dtf-time-input"
                inputMode="numeric"
                aria-label="Hour"
                value={hStr}
                placeholder="HH"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                  setHStr(v)
                  if (v !== '') commit({ h: clamp(+v, 0, 23) })
                }}
              />
              <span className="dtf-colon">:</span>
              <input
                className="dtf-time-input"
                inputMode="numeric"
                aria-label="Minute"
                value={miStr}
                placeholder="MM"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                  setMiStr(v)
                  if (v !== '') commit({ mi: clamp(+v, 0, 59) })
                }}
              />
            </div>
            <button
              type="button"
              className="dtf-now"
              onClick={() => {
                const n = nowParts()
                onChange(assemble(n))
                setView({ y: n.y, mo: n.mo })
              }}
            >
              Now
            </button>
            <button type="button" className="dtf-done" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
