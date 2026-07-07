import { useEffect, useRef } from 'react'
import { gantt } from 'dhtmlx-gantt'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'
import type { GanttData, GanttTask } from '../../lib/gantt/index.ts'

export type GanttScale = 'hour' | 'day' | 'week' | 'month'

export interface GanttFilters {
  rcGroupId?: string
  rcId?: string
  orderId?: string
  nomenclatureId?: string
  status?: string
  criticalOnly?: boolean
}

interface Props {
  data: GanttData
  scale: GanttScale
  today: Date
  filters: GanttFilters
  criticalOpIds: Set<string>
  onMove: (opId: string, newStart: Date) => void
  onSelectOp: (task: GanttTask | null) => void
}

const SCALES: Record<GanttScale, { unit: string; step: number; format: string }[]> = {
  hour: [
    { unit: 'day', step: 1, format: '%d %M' },
    { unit: 'hour', step: 1, format: '%H:%i' },
  ],
  day: [
    { unit: 'month', step: 1, format: '%F %Y' },
    { unit: 'day', step: 1, format: '%d' },
  ],
  week: [
    { unit: 'month', step: 1, format: '%F %Y' },
    { unit: 'week', step: 1, format: '№%W' },
  ],
  month: [
    { unit: 'year', step: 1, format: '%Y' },
    { unit: 'month', step: 1, format: '%M' },
  ],
}

/** dhtmlx-парсить рядок дати як локальний час; повертаємо той самий момент у UTC. */
function localToUtc(d: Date): Date {
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()),
  )
}

/**
 * Імперативна обгортка dhtmlx-gantt. Уся доменна логіка — у чистих функціях
 * (`buildGanttData`, `applyManualMove`); тут лише рендер, масштаб, маркер,
 * фільтри, drag і клік.
 */
export function GanttChart({
  data,
  scale,
  today,
  filters,
  criticalOpIds,
  onMove,
  onSelectOp,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Пропси, до яких звертаються dhtmlx-колбеки — через refs (актуальні значення).
  const filtersRef = useRef(filters)
  const criticalRef = useRef(criticalOpIds)
  const onMoveRef = useRef(onMove)
  const onSelectRef = useRef(onSelectOp)
  filtersRef.current = filters
  criticalRef.current = criticalOpIds
  onMoveRef.current = onMove
  onSelectRef.current = onSelectOp

  const markerRef = useRef<string | null>(null)

  // Ініціалізація один раз.
  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    gantt.plugins({ marker: true })
    gantt.config.date_format = '%Y-%m-%d %H:%i'
    gantt.config.readonly = false
    gantt.config.drag_progress = false
    gantt.config.drag_resize = false
    gantt.config.drag_links = false
    gantt.config.columns = [
      { name: 'text', label: 'РЦ / Операція', tree: true, width: 240 },
    ]

    gantt.templates.task_text = (_s: Date, _e: Date, task: unknown) => {
      const t = task as GanttTask
      return t.kind === 'op' ? t.text : ''
    }
    gantt.templates.task_class = (_s: Date, _e: Date, task: unknown) => {
      const t = task as GanttTask
      if (t.kind !== 'op') return 'grow-row'
      let cls = t.css ?? ''
      if (criticalRef.current.has(t.id)) cls += ' gop--critical'
      return cls
    }

    // Тільки операції можна перетягувати.
    gantt.attachEvent('onBeforeTaskDrag', (id: string) => {
      const t = gantt.getTask(id) as unknown as GanttTask
      return t.kind === 'op'
    })

    // Фільтрація рядків-операцій (FR-GANTT-06).
    gantt.attachEvent('onBeforeTaskDisplay', (_id: string, task: unknown) => {
      const t = task as GanttTask
      if (t.kind !== 'op') return true
      const f = filtersRef.current
      if (f.rcGroupId && t.rcGroupId !== f.rcGroupId) return false
      if (f.rcId && t.rcId !== f.rcId) return false
      if (f.orderId && t.orderId !== f.orderId) return false
      if (f.nomenclatureId && t.nomenclatureId !== f.nomenclatureId) return false
      if (f.status && t.status !== f.status) return false
      if (f.criticalOnly && !criticalRef.current.has(t.id)) return false
      return true
    })

    // Перетягування → перерахунок (FR-GANTT-07).
    gantt.attachEvent('onAfterTaskDrag', (id: string) => {
      const t = gantt.getTask(id) as unknown as GanttTask & { start_date: Date }
      onMoveRef.current(String(id), localToUtc(t.start_date))
    })

    // Клік → бокова панель (FR-GANTT-04).
    gantt.attachEvent('onTaskClick', (id: string) => {
      const t = gantt.getTask(id) as unknown as GanttTask
      onSelectRef.current(t.kind === 'op' ? t : null)
      return true
    })

    gantt.init(node)

    return () => {
      gantt.clearAll()
      gantt.destructor()
      markerRef.current = null
    }
  }, [])

  // Масштаб осі часу (FR-GANTT-05).
  useEffect(() => {
    gantt.config.scales = SCALES[scale] as unknown as typeof gantt.config.scales
    gantt.render()
  }, [scale])

  // Дані + маркер «Сьогодні» (FR-GANTT-09).
  useEffect(() => {
    gantt.clearAll()
    gantt.parse({ data: data.tasks })
    if (markerRef.current) gantt.deleteMarker(markerRef.current)
    markerRef.current = String(
      gantt.addMarker({ start_date: today, css: 'gantt-today', text: 'Сьогодні' }),
    )
    gantt.render()
  }, [data, today])

  // Перерендер при зміні фільтрів / критичного шляху.
  useEffect(() => {
    gantt.render()
  }, [filters, criticalOpIds])

  return <div ref={containerRef} className="gantt-container" />
}
