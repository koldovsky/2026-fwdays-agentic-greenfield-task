import { useMemo } from 'react'
import { buildOrderDashboard } from '../../lib/dashboard/index.ts'
import {
  buildDeficitsSheet,
  buildOperationsSheet,
  buildOrderSummarySheet,
} from '../../lib/export/index.ts'
import { useSessionStore } from '../store/session-store.ts'
import { writeSheet } from '../export/xlsx.ts'
import './export.css'

/** Експорт результатів: Excel (розклад, дефіцити, зведення) + друк Гантта (FR-EXP-01..05). */
export function ExportPanel() {
  const plan = useSessionStore((s) => s.plan)
  const planInput = useSessionStore((s) => s.planInput)

  const orderRows = useMemo(() => {
    if (!plan || !planInput) return []
    return buildOrderDashboard({
      orders: planInput.orders,
      orderResults: plan.orders,
      deficits: plan.deficits,
      calendar: planInput.calendar,
    }).rows
  }, [plan, planInput])

  if (!plan || !planInput) return null

  return (
    <section className="exp">
      <h2>Експорт результатів</h2>
      <div className="exp__buttons">
        <button
          type="button"
          className="exp-btn"
          onClick={() =>
            writeSheet(buildOperationsSheet(plan.operations, planInput.orders), 'розклад-операцій.xlsx')
          }
        >
          Розклад операцій (Excel)
        </button>
        <button
          type="button"
          className="exp-btn"
          onClick={() => writeSheet(buildDeficitsSheet(plan.deficits), 'дефіцити.xlsx')}
        >
          Дефіцити матеріалів (Excel)
        </button>
        <button
          type="button"
          className="exp-btn"
          onClick={() => writeSheet(buildOrderSummarySheet(orderRows), 'зведення-замовлень.xlsx')}
        >
          Зведення замовлень (Excel)
        </button>
        <button type="button" className="exp-btn exp-btn--pdf" onClick={() => window.print()}>
          Друк Гантта (PDF)
        </button>
      </div>
      <p className="exp__hint">
        Excel — на клієнті (SheetJS), заголовки узгоджені з форматом 1С. PDF — через
        друк браузера з поточними фільтрами й масштабом Гантта.
      </p>
    </section>
  )
}
