import { useEffect, useRef } from 'react'
import { Gantt, type GanttStatic } from 'dhtmlx-gantt'
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
  // Окремий екземпляр gantt на кожен монтаж (StrictMode-safe): спільний
  // сінглтон після destructor() ламається при повторному init.
  const ganttRef = useRef<GanttStatic | null>(null)
  // Fallback-лінія «Сьогодні», коли розширення marker відсутнє у бандлі.
  const todayLineRef = useRef<HTMLDivElement | null>(null)

  /**
   * Намалювати вертикальну лінію «Сьогодні» без розширення marker: обчислюємо
   * X через `posFromDate` і вставляємо позиціоновану div у область даних.
   * Повністю захищено — за будь-якої несумісності просто нічого не малює.
   */
  const drawTodayLine = () => {
    const gantt = ganttRef.current
    const node = containerRef.current
    if (!gantt || !node) return
    // Якщо нативний marker доступний — лінію малює він, fallback не потрібен.
    if (typeof gantt.addMarker === 'function') return
    try {
      const area = node.querySelector<HTMLElement>('.gantt_data_area')
      if (!area || typeof gantt.posFromDate !== 'function') return
      const x = gantt.posFromDate(today)
      if (typeof x !== 'number' || !Number.isFinite(x)) return
      let line = todayLineRef.current
      if (!line) {
        line = document.createElement('div')
        line.className = 'gantt-today-line'
        line.title = 'Сьогодні'
        todayLineRef.current = line
      }
      line.style.left = `${x}px`
      // gantt.render() перебудовує область даних — переприкріплюємо лінію.
      if (line.parentElement !== area) area.appendChild(line)
    } catch {
      /* несумісна версія API — лишаємо Гантт без лінії, без падіння */
    }
  }

  // Ініціалізація один раз.
  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const gantt = Gantt.getGanttInstance()
    ganttRef.current = gantt

    // Best-effort: у dhtmlx-gantt@10 (GPL npm) marker не входить у бандл, тож
    // це no-op; лінію «Сьогодні» малює drawTodayLine() як fallback. Виклик
    // лишаємо, щоб нативний marker підхопився, якщо колись стане доступним.
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
      ganttRef.current = null
      markerRef.current = null
      todayLineRef.current?.remove()
      todayLineRef.current = null
    }
  }, [])

  // Масштаб осі часу (FR-GANTT-05).
  useEffect(() => {
    const gantt = ganttRef.current
    if (!gantt) return
    gantt.config.scales = SCALES[scale] as unknown as typeof gantt.config.scales
    gantt.render()
    drawTodayLine()
  }, [scale])

  // Дані + маркер «Сьогодні» (FR-GANTT-09).
  useEffect(() => {
    const gantt = ganttRef.current
    if (!gantt) return
    gantt.clearAll()
    gantt.parse({ data: data.tasks })
    // Розширення `marker` не входить у бандл dhtmlx-gantt@10 (GPL npm): метод
    // addMarker/deleteMarker відсутній. Викликаємо лише якщо доступний, інакше
    // лінію «Сьогодні» малюємо через CSS-накладку (див. effect нижче).
    if (typeof gantt.addMarker === 'function') {
      if (markerRef.current && typeof gantt.deleteMarker === 'function') {
        gantt.deleteMarker(markerRef.current)
      }
      markerRef.current = String(
        gantt.addMarker({ start_date: today, css: 'gantt-today', text: 'Сьогодні' }),
      )
    }
    gantt.render()
    drawTodayLine()
  }, [data, today])

  // Перерендер при зміні фільтрів / критичного шляху.
  useEffect(() => {
    ganttRef.current?.render()
    drawTodayLine()
  }, [filters, criticalOpIds])

  return <div ref={containerRef} className="gantt-container" />
}
