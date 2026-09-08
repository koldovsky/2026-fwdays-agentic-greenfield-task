// Per-category line chart (FR-STATS-04). The pure `toLineData` transform is unit-tested
// (__tests__/CategoryLine.test.ts): one series per `per_category_per_day` entry, colored
// from the entry's OWN `color` and keyed by `id`, its points read verbatim from the
// entry's `per_day` mins (nothing recomputed). The Chart.js binding is a thin canvas-free
// wrapper jsdom never instantiates.
import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

import type { CategoryPerDayRead } from './types'

export interface LineSeries {
  id: number
  label: string
  color: string
  values: number[]
}

export function toLineData(series: CategoryPerDayRead[]): LineSeries[] {
  return series.map((entry) => ({
    id: entry.id,
    label: entry.name,
    color: entry.color,
    values: entry.per_day.map((point) => point.min),
  }))
}

export default function CategoryLine({ series }: { series: CategoryPerDayRead[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const data = toLineData(series)
    const labels = series[0]?.per_day.map((point) => point.date) ?? []
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: data.map((line) => ({
          label: line.label,
          data: line.values,
          borderColor: line.color,
          backgroundColor: line.color,
          tension: 0.3,
          pointRadius: 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#8b8b94' } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8b8b94' } },
          y: { beginAtZero: true, grid: { display: false }, ticks: { color: '#8b8b94' } },
        },
      },
    })
    return () => chart.destroy()
  }, [series])

  return (
    <figure className="stats-chart">
      <figcaption className="stats-chart-title micro-label">Minutes by category over time</figcaption>
      <div className="stats-chart-canvas">
        <canvas ref={canvasRef} role="img" aria-label="Minutes by category over time" />
      </div>
    </figure>
  )
}
