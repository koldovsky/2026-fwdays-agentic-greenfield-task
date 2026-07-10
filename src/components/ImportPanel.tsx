import { useEffect, useState } from 'react'
import type { ImportTable } from '../../lib/import/index.ts'
import { IMPORT_TABLES } from '../../lib/import/index.ts'
import { useSessionStore } from '../store/session-store.ts'
import { DropZone } from './DropZone.tsx'
import { ValidationErrors } from './ValidationErrors.tsx'
import { EditableTable } from './EditableTable.tsx'
import { DiffView } from './DiffView.tsx'

/** 5.5 — Панель імпорту: зони, редактор, помилки, diff, гейт планування. */
export function ImportPanel() {
  const tables = useSessionStore((s) => s.tables)
  const hydrate = useSessionStore((s) => s.hydrate)
  const canPlan = useSessionStore((s) => s.canPlan())
  const errorCount = useSessionStore((s) => s.errorCount())
  const runPlanningAction = useSessionStore((s) => s.runPlanning)
  const result = useSessionStore((s) => s.plan)

  const [selected, setSelected] = useState<ImportTable>('orders')
  const [planError, setPlanError] = useState<string | null>(null)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const selectedLabel = IMPORT_TABLES.find((t) => t.table === selected)?.label ?? selected
  const selectedState = tables[selected]

  const runPlanning = () => {
    setPlanError(null)
    const calDates = (tables.calendar.parsed.calendar ?? []).map((c) => c.date.getTime())
    if (calDates.length === 0) {
      setPlanError('Немає виробничого календаря')
      return
    }
    const today = new Date(Math.min(...calDates))
    const horizon = new Date(Math.max(...calDates))
    try {
      if (!runPlanningAction(today, horizon)) {
        setPlanError('Дані неповні або містять помилки')
      }
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : 'Помилка планування')
    }
  }

  return (
    <section className="import">
      <header className="import__header">
        <h1>Імпорт даних з 1С</h1>
        <p className="muted">
          Завантажте сім таблиць-звітів. Дані обробляються лише у браузері й
          зберігаються у IndexedDB.
        </p>
      </header>

      <div className="dropzone-grid">
        {IMPORT_TABLES.map(({ table, label }) => (
          <DropZone
            key={table}
            table={table}
            label={label}
            selected={selected === table}
            onSelect={() => setSelected(table)}
          />
        ))}
      </div>

      <div className="planbar">
        <button type="button" className="planbar__run" disabled={!canPlan} onClick={runPlanning}>
          Запустити планування
        </button>
        <span className="planbar__status">
          {canPlan
            ? 'Дані валідні — планування доступне'
            : errorCount > 0
              ? `Заблоковано: ${errorCount} помилк. валідації`
              : 'Заблоковано: завантажте потрібні таблиці (замовлення, BOM, маршрути, ГРЦ/РЦ, календар)'}
        </span>
      </div>

      {planError && <p className="err err--error">{planError}</p>}
      {result && (
        <div className="planresult">
          <strong>Розклад побудовано:</strong> {result.operations.length} операцій ·{' '}
          {result.metrics.lateOrdersCount} замовлень із запізненням ·{' '}
          {result.deficits.length} дефіцитів матеріалів
        </div>
      )}

      <div className="table-section">
        <h2>{selectedLabel}</h2>
        <DiffView diff={selectedState.diff} />
        <ValidationErrors errors={selectedState.parsed.errors} />
        <EditableTable table={selected} />
      </div>
    </section>
  )
}
