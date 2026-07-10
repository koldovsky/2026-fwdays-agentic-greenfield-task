import type { RouteOperation } from '../types/index.ts'
import type { ParseResult, RawRow, ValidationError } from './types.ts'
import { optionalString, requireNumber, requireString } from './fields.ts'

const A = {
  nomenclatureId: ['nomenclatureId', 'номенклатура', 'виріб', 'деталь'],
  opNo: ['opNo', 'номоперації', 'номероперації', 'операція№', 'operation'],
  opName: ['opName', 'назваоперації', 'назва', 'операція'],
  opType: ['opType', 'типоперації', 'тип'],
  rcGroupId: ['rcGroupId', 'грц', 'групарц', 'groupId', 'group'],
  durationMin: ['durationMin', 'тривалість', 'тривалістьхв', 'нормахв', 'duration'],
}

/**
 * Parses route-operation rows and accumulates validation errors.
 *
 * Missing operation types default to the operation name. Rows with error-severity
 * validation errors are excluded from the parsed data.
 *
 * @param rows - Input rows containing route-operation fields
 * @returns Parsed route operations and accumulated validation errors
 */
export function parseRoutes(rows: RawRow[]): ParseResult<RouteOperation> {
  const data: RouteOperation[] = []
  const errors: ValidationError[] = []

  rows.forEach((row, i) => {
    const rowNo = i + 1
    const before = errors.length
    const nomenclatureId = requireString(row, A.nomenclatureId, 'nomenclatureId', rowNo, errors)
    const opNo = requireNumber(row, A.opNo, 'opNo', rowNo, errors, { gtZero: true })
    const opName = requireString(row, A.opName, 'opName', rowNo, errors)
    const rcGroupId = requireString(row, A.rcGroupId, 'rcGroupId', rowNo, errors)
    const durationMin = requireNumber(row, A.durationMin, 'durationMin', rowNo, errors, { min: 0 })
    const opType = optionalString(row, A.opType) ?? opName

    if (!errors.slice(before).some((e) => e.severity === 'error')) {
      data.push({ nomenclatureId, opNo, opName, opType, rcGroupId, durationMin })
    }
  })

  return { data, errors }
}
