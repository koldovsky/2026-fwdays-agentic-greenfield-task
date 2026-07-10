import { useMemo, useState } from 'react'
import type { ScheduleMode } from '../../lib/index.ts'
import { buildComparison, MAX_SCENARIOS, METRIC_KEYS, type MetricKey } from '../../lib/scenario/index.ts'
import { useSessionStore } from '../store/session-store.ts'
import './scenario.css'

const METRIC_LABEL: Record<MetricKey, string> = {
  lateOrdersCount: 'Запізнень',
  totalDelayDays: 'Сум. запізнення (дн.)',
  avgLoadPct: 'Сер. завантаж. (%)',
  overloadedSlotsCount: 'Перевантаж. слотів',
  wipCount: 'WIP',
}

const MODE_LABEL: Record<ScheduleMode, string> = {
  'min-lateness': 'Мінімум запізнень',
  'min-idle': 'Мінімум простоїв',
}

function fmtMetric(key: MetricKey, value: number): string {
  return key === 'avgLoadPct' ? `${value.toFixed(1)}%` : String(value)
}

/** Порівняння варіантів розкладу (FR-SCEN-01..03). */
export function ScenarioCompare() {
  const scenarios = useSessionStore((s) => s.scenarios)
  const acceptedScenarioId = useSessionStore((s) => s.acceptedScenarioId)
  const calendarRows = useSessionStore((s) => s.tables.calendar.parsed.calendar)
  const canPlan = useSessionStore((s) => s.canPlan())
  const addScenario = useSessionStore((s) => s.addScenario)
  const confirmScenario = useSessionStore((s) => s.confirmScenario)
  const removeScenario = useSessionStore((s) => s.removeScenario)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const comparison = useMemo(
    () =>
      buildComparison(
        scenarios.map((s) => ({ id: s.id, name: s.name, mode: s.mode, metrics: s.result.metrics })),
        acceptedScenarioId,
      ),
    [scenarios, acceptedScenarioId],
  )

  const effectiveSelected = selectedId ?? acceptedScenarioId ?? scenarios[0]?.id ?? null
  const canAdd = canPlan && scenarios.length < MAX_SCENARIOS

  const add = (mode: ScheduleMode) => {
    setError(null)
    const dates = (calendarRows ?? []).map((c) => c.date.getTime())
    if (dates.length === 0) {
      setError('Немає виробничого календаря')
      return
    }
    const today = new Date(Math.min(...dates))
    const horizon = new Date(Math.max(...dates))
    const name = `${MODE_LABEL[mode]} #${scenarios.length + 1}`
    if (!addScenario(name, mode, today, horizon)) {
      setError('Не вдалося створити варіант (дані неповні або досягнуто ліміт)')
    }
  }

  return (
    <section className="sc">
      <h2>Порівняння варіантів розкладу</h2>

      <div className="sc-toolbar">
        <span className="sc-toolbar__label">
          Варіантів: {scenarios.length} / {MAX_SCENARIOS}
        </span>
        <button type="button" className="tb-btn" disabled={!canAdd} onClick={() => add('min-lateness')}>
          + Мінімум запізнень
        </button>
        <button type="button" className="tb-btn" disabled={!canAdd} onClick={() => add('min-idle')}>
          + Мінімум простоїв
        </button>
        {selectedId && (
          <button
            type="button"
            className="tb-btn tb-btn--active"
            onClick={() => confirmScenario(effectiveSelected!)}
            disabled={!effectiveSelected}
          >
            Підтвердити активний
          </button>
        )}
      </div>

      {error && <p className="sc-error">{error}</p>}

      {scenarios.length === 0 ? (
        <p className="muted">Додайте варіант розкладу для порівняння.</p>
      ) : (
        <table className="sc-table">
          <thead>
            <tr>
              <th />
              <th>Варіант</th>
              <th>Режим</th>
              {METRIC_KEYS.map((k) => (
                <th key={k}>{METRIC_LABEL[k]}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.id} className={row.isAccepted ? 'sc-row--accepted' : ''}>
                <td>
                  <input
                    type="radio"
                    name="scenario"
                    checked={effectiveSelected === row.id}
                    onChange={() => setSelectedId(row.id)}
                  />
                </td>
                <td>
                  {row.name}
                  {row.isAccepted && <span className="sc-active">активний</span>}
                </td>
                <td>{MODE_LABEL[row.mode]}</td>
                {METRIC_KEYS.map((k) => (
                  <td key={k} className={comparison.best[k].includes(row.id) ? 'sc-best' : ''}>
                    {fmtMetric(k, row.metrics[k])}
                  </td>
                ))}
                <td>
                  <button type="button" className="sc-del" onClick={() => removeScenario(row.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {acceptedScenarioId ? (
        <p className="sc-note sc-note--ok">
          Активний розклад підтверджено — його показують Гантт, завантаженість,
          зведення й матеріали.
        </p>
      ) : (
        scenarios.length > 0 && (
          <p className="sc-note">
            Оберіть варіант і натисніть «Підтвердити активний» — лише після цього
            розклад вважається прийнятим.
          </p>
        )
      )}
    </section>
  )
}
