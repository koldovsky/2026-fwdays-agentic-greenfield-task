// Donut-by-category chart (FR-STATS-03). The pure `toDonutData` transform is unit-tested
// (__tests__/DonutByCategory.test.ts): one arc per `top_categories` entry, sized by
// `week_min`, colored from the entry's OWN `color` and keyed by `id` — no name-based join
// against listCategories(), so duplicate names and renames are safe. The Chart.js binding
// is a thin canvas-free wrapper jsdom never instantiates.
import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

import type { TopCategoryRead } from './types'

export interface DonutDatum {
  id: number
  label: string
  value: number
  color: string
}

export function toDonutData(categories: TopCategoryRead[]): DonutDatum[] {
  return categories.map((category) => ({
    id: category.id,
    label: category.name,
    value: category.week_min,
    color: category.color,
  }))
}

export default function DonutByCategory({ categories }: { categories: TopCategoryRead[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const data = toDonutData(categories)
    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: data.map((d) => d.color),
            borderColor: '#131316',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: { legend: { position: 'bottom', labels: { color: '#8b8b94' } } },
      },
    })
    return () => chart.destroy()
  }, [categories])

  return (
    <figure className="stats-chart">
      <figcaption className="stats-chart-title micro-label">This week by category</figcaption>
      <div className="stats-chart-canvas">
        <canvas ref={canvasRef} role="img" aria-label="Minutes this week by category" />
      </div>
    </figure>
  )
}
