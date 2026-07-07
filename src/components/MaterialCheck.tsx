import { useMemo, useState } from 'react'
import type { PlannedReceipt, StockItem } from '../../lib/types/index.ts'
import { computeMaterialCheck } from '../../lib/material/index.ts'
import { useSessionStore } from '../store/session-store.ts'
import './material.css'

function fmtDate(d: Date | null): string {
  if (!d) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`
}

/** Матеріальне забезпечення: таблиця дефіцитів + критичний блок + ручні правки. */
export function MaterialCheck() {
  const plan = useSessionStore((s) => s.plan)
  const planInput = useSessionStore((s) => s.planInput)
  const grossReqs = useSessionStore((s) => s.grossReqs)
  const demandDates = useSessionStore((s) => s.demandDates)
  const stockAdjustments = useSessionStore((s) => s.stockAdjustments)
  const extraReceipts = useSessionStore((s) => s.extraReceipts)
  const setStockAdjustment = useSessionStore((s) => s.setStockAdjustment)
  const addReceipt = useSessionStore((s) => s.addReceipt)
  const resetMaterialEdits = useSessionStore((s) => s.resetMaterialEdits)

  const [recMaterial, setRecMaterial] = useState('')
  const [recQty, setRecQty] = useState('')
  const [recDate, setRecDate] = useState('')

  const check = useMemo(() => {
    if (!plan || !planInput) return null
    const baseStock = new Map<string, number>()
    for (const s of planInput.stock) baseStock.set(s.nomenclatureId, (baseStock.get(s.nomenclatureId) ?? 0) + s.qty)
    for (const [nom, qty] of Object.entries(stockAdjustments)) baseStock.set(nom, qty)
    const stock: StockItem[] = [...baseStock.entries()].map(([nomenclatureId, qty]) => ({ nomenclatureId, qty }))
    const receipts: PlannedReceipt[] = [...planInput.plannedReceipts, ...extraReceipts]
    return computeMaterialCheck(grossReqs, stock, receipts, demandDates)
  }, [plan, planInput, grossReqs, demandDates, stockAdjustments, extraReceipts])

  if (!check || !plan) return null

  const hasEdits = Object.keys(stockAdjustments).length > 0 || extraReceipts.length > 0
  const effectiveStock = (nom: string, planned: number): number =>
    nom in stockAdjustments ? stockAdjustments[nom]! : planned

  const submitReceipt = () => {
    const qty = Number(recQty)
    if (!recMaterial || !recDate || !Number.isFinite(qty) || qty <= 0) return
    addReceipt({
      nomenclatureId: recMaterial,
      date: new Date(`${recDate}T00:00:00Z`),
      qty,
      confirmed: true,
    })
    setRecQty('')
  }

  return (
    <section className="mc">
      <h2>Матеріальне забезпечення</h2>

      {check.critical.length > 0 && (
        <div className="mc-critical" role="alert">
          <strong>⚠ Критичний дефіцит ({check.critical.length}):</strong>{' '}
          {check.critical.map((d) => `${d.nomenclatureId} (−${d.netDeficit})`).join(', ')}
          <div className="mc-critical__hint">
            Жодне надходження не покриває потребу — заблоковано:{' '}
            {[...new Set(check.critical.flatMap((d) => d.blockedOrderIds))].join(', ') || '—'}
          </div>
        </div>
      )}

      <div className="mc-toolbar">
        <span className="mc-toolbar__label">Додати надходження:</span>
        <select value={recMaterial} onChange={(e) => setRecMaterial(e.target.value)}>
          <option value="">матеріал</option>
          {check.deficits.map((d) => (
            <option key={d.nomenclatureId} value={d.nomenclatureId}>
              {d.nomenclatureId}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="к-сть"
          value={recQty}
          onChange={(e) => setRecQty(e.target.value)}
          style={{ width: 80 }}
        />
        <input type="date" value={recDate} onChange={(e) => setRecDate(e.target.value)} />
        <button type="button" className="tb-btn" onClick={submitReceipt}>
          Додати
        </button>
        {hasEdits && (
          <button type="button" className="tb-btn" onClick={resetMaterialEdits}>
            Скинути правки
          </button>
        )}
      </div>

      {check.deficits.length === 0 ? (
        <p className="mc-ok">Дефіцитів немає ✓</p>
      ) : (
        <table className="mc-table">
          <thead>
            <tr>
              <th>Матеріал</th>
              <th>Брутто</th>
              <th>Залишок (ручне)</th>
              <th>Надходження</th>
              <th>Нетто-дефіцит</th>
              <th>Дата закриття</th>
              <th>Заблоковані замовлення</th>
            </tr>
          </thead>
          <tbody>
            {check.deficits.map((d) => {
              const critical = d.earliestCoverDate === null
              return (
                <tr key={d.nomenclatureId} className={critical ? 'mc-row--critical' : ''}>
                  <td>{d.nomenclatureId}</td>
                  <td>{d.grossNeed}</td>
                  <td>
                    <input
                      type="number"
                      className="mc-stock"
                      value={effectiveStock(d.nomenclatureId, d.stock)}
                      onChange={(e) => setStockAdjustment(d.nomenclatureId, Number(e.target.value) || 0)}
                    />
                  </td>
                  <td>{d.plannedReceipts}</td>
                  <td className="mc-deficit">−{d.netDeficit}</td>
                  <td>
                    {critical ? (
                      <span className="mc-badge mc-badge--critical">критичний</span>
                    ) : (
                      fmtDate(d.earliestCoverDate)
                    )}
                  </td>
                  <td>{d.blockedOrderIds.join(', ')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
