// Bar-by-day chart (FR-STATS-02). The pure `toBarData` transform is unit-tested
// (__tests__/BarByDay.test.ts); the Chart.js binding is a thin useRef+useEffect wrapper
// that jsdom never instantiates (canvas-free), so tests exercise the transform only.
// Nothing is recomputed: each datum's value is the source `min` read verbatim, in order.
import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

import type { DailyMinRead } from './types'

export interface BarDatum {
  label: string
  value: number
}

export function toBarData(perDay: DailyMinRead[]): BarDatum[] {
  return perDay.map((day) => ({ label: day.date, value: day.min }))
}

export default function BarByDay({ perDay }: { perDay: DailyMinRead[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const data = toBarData(perDay)
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: 'rgba(124, 108, 240, 0.7)',
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8b8b94' } },
          y: { beginAtZero: true, grid: { display: false }, ticks: { color: '#8b8b94' } },
        },
      },
    })
    return () => chart.destroy()
  }, [perDay])

  return (
    <figure className="stats-chart">
      <figcaption className="stats-chart-title micro-label">Minutes by day</figcaption>
      <div className="stats-chart-canvas">
        <canvas ref={canvasRef} role="img" aria-label="Minutes tracked by day" />
      </div>
    </figure>
  )
}
