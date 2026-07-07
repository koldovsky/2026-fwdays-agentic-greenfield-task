import type {
  BomNode,
  MaterialDeficit,
  PlannedReceipt,
  ScheduledOperation,
  StockItem,
} from '../types/index.ts'
import type { GrossRequirement } from '../mrp/gross-requirements.ts'
import { buildMaterialDeficits } from '../mrp/net-requirements.ts'

/** Критичний дефіцит — жодне надходження не покриває (FR-MAT-02). */
export function isCriticalDeficit(deficit: MaterialDeficit): boolean {
  return deficit.earliestCoverDate === null
}

/** Поділ дефіцитів на критичні і покривні (FR-MAT-02). */
export function splitDeficits(deficits: MaterialDeficit[]): {
  critical: MaterialDeficit[]
  coverable: MaterialDeficit[]
} {
  const critical: MaterialDeficit[] = []
  const coverable: MaterialDeficit[] = []
  for (const d of deficits) {
    if (isCriticalDeficit(d)) critical.push(d)
    else coverable.push(d)
  }
  return { critical, coverable }
}

export interface MaterialCheck {
  deficits: MaterialDeficit[]
  critical: MaterialDeficit[]
  coverable: MaterialDeficit[]
}

/**
 * 1.2 — Матеріальна перевірка: таблиця дефіцитів + поділ на критичні/покривні
 * (FR-MAT-01/02). Це і є точка перерахунку для FR-MAT-03: виклик з новими
 * `stock`/`receipts` дає миттєвий результат без перепланування розкладу.
 *
 * Чиста функція: `grossReqs` фіксується при плануванні, тут не змінюється.
 */
export function computeMaterialCheck(
  grossReqs: GrossRequirement[],
  stock: StockItem[],
  receipts: PlannedReceipt[],
  demandDateByMaterial?: Map<string, Date>,
): MaterialCheck {
  const deficits = buildMaterialDeficits(grossReqs, stock, receipts, demandDateByMaterial)
  const { critical, coverable } = splitDeficits(deficits)
  return { deficits, critical, coverable }
}

/**
 * 1.3 — Дата споживання кожного матеріалу = найраніший старт операції вузла-
 * споживача (батька матеріалу в BOM). Використовується як `demandDate` для
 * розрахунку нетто-дефіциту й дати закриття.
 */
export function demandDatesByMaterial(
  operations: ScheduledOperation[],
  bom: BomNode[],
): Map<string, Date> {
  const minStartByNom = new Map<string, number>()
  for (const op of operations) {
    const t = op.startAt.getTime()
    const cur = minStartByNom.get(op.nomenclatureId)
    if (cur === undefined || t < cur) minStartByNom.set(op.nomenclatureId, t)
  }

  const parentsByMaterial = new Map<string, Set<string>>()
  for (const edge of bom) {
    if (edge.type !== 'material' || edge.parentId === null) continue
    const set = parentsByMaterial.get(edge.childId)
    if (set) set.add(edge.parentId)
    else parentsByMaterial.set(edge.childId, new Set([edge.parentId]))
  }

  const out = new Map<string, Date>()
  for (const [material, parents] of parentsByMaterial) {
    let earliest = Number.POSITIVE_INFINITY
    for (const parent of parents) {
      const s = minStartByNom.get(parent)
      if (s !== undefined && s < earliest) earliest = s
    }
    if (Number.isFinite(earliest)) out.set(material, new Date(earliest))
  }
  return out
}
