import type { BomNode } from '../types/index.ts'
import type { ParseResult, RawRow, ValidationError } from './types.ts'
import { optionalString, requireEnum, requireNumber, requireString } from './fields.ts'

const A = {
  parentId: ['parentId', 'батько', 'батьківська', 'батьківськаноменклатура', 'parent'],
  childId: ['childId', 'дитина', 'дочірня', 'дочірняноменклатура', 'child', 'номенклатура'],
  qtyPer: ['qtyPer', 'кількістьнаодиницю', 'кількість', 'нанорму', 'qty'],
  type: ['type', 'тип', 'типвузла', 'nodeType'],
}

/** Псевдоніми значень типу вузла → канонічне значення. */
const TYPE_MAP: Record<string, BomNode['type']> = {
  assembly: 'assembly',
  підзбірка: 'assembly',
  збірка: 'assembly',
  вузол: 'assembly',
  part: 'part',
  деталь: 'part',
  material: 'material',
  матеріал: 'material',
  купований: 'material',
  куповане: 'material',
}

/**
 * Parses BOM rows into validated nodes and collects validation errors.
 *
 * An empty or missing `parentId` is represented as `null`, identifying a root node.
 *
 * @param rows - The raw BOM rows to parse
 * @returns The successfully parsed nodes and all validation errors
 */
export function parseBom(rows: RawRow[]): ParseResult<BomNode> {
  const data: BomNode[] = []
  const errors: ValidationError[] = []

  rows.forEach((row, i) => {
    const rowNo = i + 1
    const before = errors.length
    const parent = optionalString(row, A.parentId)
    const childId = requireString(row, A.childId, 'childId', rowNo, errors)
    const qtyPer = requireNumber(row, A.qtyPer, 'qtyPer', rowNo, errors, { gtZero: true })
    const type = requireEnum(row, A.type, 'type', rowNo, errors, TYPE_MAP)

    if (!errors.slice(before).some((e) => e.severity === 'error') && type !== null) {
      data.push({ parentId: parent ?? null, childId, qtyPer, type })
    }
  })

  return { data, errors }
}
