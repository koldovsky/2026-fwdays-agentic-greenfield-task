import type { MaterialDeficit, PlannedReceipt, StockItem } from '../types/index.ts'
import type { GrossRequirement } from './gross-requirements.ts'

/**
 * Calculates the net material deficit at the operation start date.
 *
 * @param receipts - Planned receipts confirmed for availability by the operation start date
 * @param operationStartDate - Date used to determine which receipts are available
 * @returns The gross need minus stock and qualifying receipts; may be negative when available material exceeds the need
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
 * Calculates material deficits and identifies the orders blocked by each deficit.
 *
 * Only materials with a positive net deficit are included. Confirmed receipts
 * after the material's demand date are excluded from the deficit calculation
 * but considered when determining the earliest coverage date.
 *
 * @param grossReqs - Gross material requirements to evaluate
 * @param stock - Available stock items
 * @param receipts - Planned material receipts
 * @param demandDateByMaterial - Optional demand date for each material
 * @returns Material deficit records sorted by nomenclature ID
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
