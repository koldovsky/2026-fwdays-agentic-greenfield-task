import type {
  BomNode,
  MaterialDeficit,
  PlannedReceipt,
  ScheduledOperation,
  StockItem,
} from '../types/index.ts'
import type { GrossRequirement } from '../mrp/gross-requirements.ts'
import { buildMaterialDeficits } from '../mrp/net-requirements.ts'

/**
 * Determines whether a material deficit is critical.
 *
 * @param deficit - The material deficit to classify
 * @returns `true` if no planned receipt can cover the deficit, `false` otherwise
 */
export function isCriticalDeficit(deficit: MaterialDeficit): boolean {
  return deficit.earliestCoverDate === null
}

/**
 * Separates material deficits into critical and coverable groups.
 *
 * @param deficits - The material deficits to classify
 * @returns An object containing critical deficits and deficits with a planned receipt that can cover them
 */
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
 * Computes material deficits and classifies them as critical or coverable.
 *
 * @param grossReqs - Gross material requirements to evaluate
 * @param stock - Available inventory
 * @param receipts - Planned material receipts
 * @param demandDateByMaterial - Optional material demand dates used to evaluate coverage
 * @returns The complete deficit list and its critical and coverable subsets
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
 * Determines the earliest demand date for each material from its parent operations in the BOM.
 *
 * @param operations - Scheduled operations used to determine parent start times
 * @param bom - BOM relationships linking materials to their parent items
 * @returns A map from material ID to its earliest demand date; materials without a known parent start time are omitted
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
