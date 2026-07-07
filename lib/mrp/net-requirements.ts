import type { MaterialDeficit, PlannedReceipt, StockItem } from '../types/index.ts'
import type { GrossRequirement } from './gross-requirements.ts'

/**
 * 4.2 — Нетто-потреба для одного матеріалу (FR-MRP-02):
 * `нетто = брутто − залишки − підтверджені надходження до дати старту операції`.
 *
 * Враховуються лише підтверджені (`confirmed`) надходження з датою ≤ дати
 * старту операції-споживача. Значення може бути від'ємним (профіцит).
 */
export function calcNetDeficit(
  grossNeed: number,
  stockQty: number,
  receipts: PlannedReceipt[],
  operationStartDate: Date,
): number {
  const covered = receipts
    .filter((r) => r.confirmed && r.date.getTime() <= operationStartDate.getTime())
    .reduce((sum, r) => sum + r.qty, 0)
  return grossNeed - stockQty - covered
}

/**
 * 4.3 — Повний розрахунок дефіцитів матеріалів (FR-MRP-03..05).
 *
 * Для кожного матеріалу з `netDeficit > 0` повертає запис з:
 *  - `plannedReceipts` — сума врахованих підтверджених надходжень;
 *  - `earliestCoverDate` — найраніша дата, коли `stock + Σreceipts ≥ gross`;
 *    `null` означає критичний дефіцит (не покривається взагалі, FR-MRP-04);
 *  - `blockedOrderIds` — замовлення, заблоковані цим дефіцитом (FR-MRP-05).
 *
 * `demandDateByMaterial` (необов'язково) задає дату старту операції-споживача;
 * надходження після цієї дати не враховуються у `netDeficit`, але враховуються
 * при пошуку `earliestCoverDate`.
 */
export function buildMaterialDeficits(
  grossReqs: GrossRequirement[],
  stock: StockItem[],
  receipts: PlannedReceipt[],
  demandDateByMaterial?: Map<string, Date>,
): MaterialDeficit[] {
  const stockByNom = new Map<string, number>()
  for (const s of stock) {
    stockByNom.set(s.nomenclatureId, (stockByNom.get(s.nomenclatureId) ?? 0) + s.qty)
  }
  const receiptsByNom = new Map<string, PlannedReceipt[]>()
  for (const r of receipts) {
    if (!r.confirmed) continue
    const arr = receiptsByNom.get(r.nomenclatureId)
    if (arr) arr.push(r)
    else receiptsByNom.set(r.nomenclatureId, [r])
  }

  const out: MaterialDeficit[] = []
  for (const req of grossReqs) {
    const stockQty = stockByNom.get(req.nomenclatureId) ?? 0
    const matReceipts = (receiptsByNom.get(req.nomenclatureId) ?? [])
      .slice()
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    const demandDate = demandDateByMaterial?.get(req.nomenclatureId)

    const countedReceipts = demandDate
      ? matReceipts.filter((r) => r.date.getTime() <= demandDate.getTime())
      : matReceipts
    const receiptsQty = countedReceipts.reduce((sum, r) => sum + r.qty, 0)
    const netDeficit = req.grossNeed - stockQty - receiptsQty
    if (netDeficit <= 0) continue

    // Найраніша дата покриття: коли накопичено stock + Σreceipts ≥ gross.
    let earliestCoverDate: Date | null = null
    let cumulative = stockQty
    for (const r of matReceipts) {
      cumulative += r.qty
      if (cumulative >= req.grossNeed) {
        earliestCoverDate = r.date
        break
      }
    }

    out.push({
      nomenclatureId: req.nomenclatureId,
      grossNeed: req.grossNeed,
      stock: stockQty,
      plannedReceipts: receiptsQty,
      netDeficit,
      earliestCoverDate,
      blockedOrderIds: [...req.orderIds].sort(),
    })
  }
  return out.sort((a, b) => a.nomenclatureId.localeCompare(b.nomenclatureId))
}
