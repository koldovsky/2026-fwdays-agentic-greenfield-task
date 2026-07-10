import type { WorkCalendar } from '../types/index.ts'
import type { ParseResult, RawRow, ValidationError } from './types.ts'
import { optionalNumber, requireDate, requireEnum } from './fields.ts'

type DayType = 'working' | 'short' | 'weekend'

const A = {
  date: ['date', 'дата'],
  dayType: ['dayType', 'типдня', 'тип', 'type'],
  workingHours: ['workingHours', 'робочігодини', 'години', 'hours'],
  workingMinutes: ['workingMinutes', 'робочіхвилини', 'хвилини', 'minutes'],
}

const DAY_TYPE_MAP: Record<string, DayType> = {
  working: 'working',
  робочий: 'working',
  short: 'short',
  скорочений: 'short',
  weekend: 'weekend',
  вихідний: 'weekend',
  свято: 'weekend',
  holiday: 'weekend',
}

/**
 * Parses production calendar rows into validated calendar entries, collecting validation errors for invalid rows.
 *
 * @param rows - Raw table rows containing dates, day types, and working durations
 * @returns Successfully parsed calendar entries and validation errors
 */
export function parseCalendar(rows: RawRow[]): ParseResult<WorkCalendar> {
  const data: WorkCalendar[] = []
  const errors: ValidationError[] = []

  rows.forEach((row, i) => {
    const rowNo = i + 1
    const before = errors.length
    const date = requireDate(row, A.date, 'date', rowNo, errors)
    const dayType = requireEnum(row, A.dayType, 'dayType', rowNo, errors, DAY_TYPE_MAP)
    const minutes = optionalNumber(row, A.workingMinutes, 'workingMinutes', rowNo, errors)
    const hours = optionalNumber(row, A.workingHours, 'workingHours', rowNo, errors)

    const isWorking = dayType !== null && dayType !== 'weekend'
    let workingMinutes = 0
    if (isWorking) {
      workingMinutes = minutes ?? (hours !== undefined ? Math.round(hours * 60) : Number.NaN)
      if (!Number.isFinite(workingMinutes)) {
        errors.push({
          row: rowNo,
          field: 'workingMinutes',
          reason: 'для робочого дня потрібні робочі години або хвилини',
          severity: 'error',
        })
      }
    }

    if (!errors.slice(before).some((e) => e.severity === 'error')) {
      data.push({ date, isWorking, workingMinutes: isWorking ? workingMinutes : 0 })
    }
  })

  return { data, errors }
}
