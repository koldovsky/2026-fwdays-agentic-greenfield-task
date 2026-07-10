import type { RcGroup, ResourceCenter } from '../types/index.ts'
import type { RawRow, ValidationError } from './types.ts'
import { optionalString, requireNumber, requireString } from './fields.ts'

const A = {
  groupId: ['groupId', 'grc', 'грц', 'кодгрц', 'групарц', 'group'],
  groupName: ['groupName', 'назвагрц', 'назвагрупи'],
  rcId: ['rcId', 'рц', 'кодрц', 'rc'],
  rcName: ['rcName', 'назварц', 'назва'],
  capacityMinPerShift: ['capacityMinPerShift', 'потужність', 'потужністьхвзміну', 'capacity'],
  shiftsPerDay: ['shiftsPerDay', 'змін', 'змінназдобу', 'shifts'],
  efficiencyPct: ['efficiencyPct', 'ефективність', 'коефіцієнтефективності', 'efficiency'],
  allowedOpTypes: ['allowedOpTypes', 'дозволеніопераці', 'дозволенітипи', 'типиоперацій', 'opTypes'],
}

/** Результат парсера ГРЦ/РЦ: групи + ресурсні центри + помилки. */
export interface ResourceCentersResult {
  rcGroups: RcGroup[]
  resourceCenters: ResourceCenter[]
  errors: ValidationError[]
}

/**
 * Splits a delimited string into trimmed, non-empty values.
 *
 * @param v - The string to split.
 * @returns An array of trimmed values, or an empty array when `v` is empty or undefined.
 */
function splitList(v: string | undefined): string[] {
  if (!v) return []
  return v
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * Parses resource-center rows into valid resource centers and groups them by group identifier.
 *
 * @param rows - Input rows containing resource-center and group data
 * @returns Resource-center groups, valid resource centers, and validation errors
 */
export function parseResourceCenters(rows: RawRow[]): ResourceCentersResult {
  const resourceCenters: ResourceCenter[] = []
  const errors: ValidationError[] = []
  const groups = new Map<string, RcGroup>()

  rows.forEach((row, i) => {
    const rowNo = i + 1
    const before = errors.length
    const groupId = requireString(row, A.groupId, 'groupId', rowNo, errors)
    const groupName = optionalString(row, A.groupName) ?? groupId
    const rcId = requireString(row, A.rcId, 'rcId', rowNo, errors)
    const rcName = optionalString(row, A.rcName) ?? rcId
    const capacityMinPerShift = requireNumber(row, A.capacityMinPerShift, 'capacityMinPerShift', rowNo, errors, { gtZero: true })
    const shiftsPerDay = requireNumber(row, A.shiftsPerDay, 'shiftsPerDay', rowNo, errors, { gtZero: true })
    const efficiencyPct = requireNumber(row, A.efficiencyPct, 'efficiencyPct', rowNo, errors, { min: 0 })
    const allowedOpTypes = splitList(optionalString(row, A.allowedOpTypes))

    if (errors.slice(before).some((e) => e.severity === 'error')) return

    resourceCenters.push({
      id: rcId,
      groupId,
      name: rcName,
      capacityMinPerShift,
      shiftsPerDay,
      efficiencyPct,
      allowedOpTypes,
    })
    const group = groups.get(groupId)
    if (group) {
      if (!group.rcIds.includes(rcId)) group.rcIds.push(rcId)
    } else {
      groups.set(groupId, { id: groupId, name: groupName, rcIds: [rcId] })
    }
  })

  return { rcGroups: [...groups.values()], resourceCenters, errors }
}
