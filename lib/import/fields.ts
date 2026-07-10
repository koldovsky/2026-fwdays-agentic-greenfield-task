import type { CellValue, RawRow, ValidationError } from './types.ts'

/**
 * Примітиви читання і валідації клітинок. Кожен примітив читає значення за
 * списком псевдонімів колонки, і за потреби додає помилку у спільний масив
 * `errors`, повертаючи найкраще доступне значення.
 */

/** Нормалізувати назву колонки для порівняння (регістр, пробіли, підкреслення). */
function norm(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, '').trim()
}

/** Прочитати сире значення клітинки за будь-яким із псевдонімів. */
export function readCell(row: RawRow, aliases: string[]): CellValue | undefined {
  const wanted = aliases.map(norm)
  for (const key of Object.keys(row)) {
    if (wanted.includes(norm(key))) {
      const v = row[key]
      if (v !== undefined) return v
    }
  }
  return undefined
}

function isBlank(v: CellValue | undefined): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
}

function pushError(
  errors: ValidationError[],
  row: number,
  field: string,
  reason: string,
): void {
  errors.push({ row, field, reason, severity: 'error' })
}

/** Розпарсити число (підтримує десятковий кому і пробіли-роздільники). */
function toNumber(v: CellValue): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'boolean') return null
  const s = String(v).trim().replace(/\s+/g, '').replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Розпарсити дату у UTC-північ (Date, ISO `yyyy-mm-dd`, `dd.mm.yyyy`, `dd/mm/yyyy`). */
export function toDate(v: CellValue): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : utcMidnight(v)
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s === '') return null

  // yyyy-mm-dd або yyyy/mm/dd (детерміновано в UTC).
  const iso = /^(\d{4})[-/](\d{2})[-/](\d{2})/.exec(s)
  if (iso) return mk(+iso[1]!, +iso[2]! - 1, +iso[3]!)

  // dd.mm.yyyy або dd/mm/yyyy.
  const dmy = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s)
  if (dmy) return mk(+dmy[3]!, +dmy[2]! - 1, +dmy[1]!)

  return null
}

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
function mk(y: number, m: number, d: number): Date | null {
  const date = new Date(Date.UTC(y, m, d))
  if (Number.isNaN(date.getTime())) return null
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m ||
    date.getUTCDate() !== d
  ) {
    return null
  }
  return date
}

/** Обов'язковий рядковий рядок. Порожньо → помилка, повертає ''. */
export function requireString(
  row: RawRow,
  aliases: string[],
  field: string,
  rowNo: number,
  errors: ValidationError[],
): string {
  const v = readCell(row, aliases)
  if (isBlank(v)) {
    pushError(errors, rowNo, field, "обов'язкове поле")
    return ''
  }
  return String(v).trim()
}

/** Необов'язковий рядок (порожньо → undefined). */
export function optionalString(row: RawRow, aliases: string[]): string | undefined {
  const v = readCell(row, aliases)
  return isBlank(v) ? undefined : String(v).trim()
}

/** Обов'язкове число. Порожньо/некоректно → помилка. `gtZero` вимагає > 0. */
export function requireNumber(
  row: RawRow,
  aliases: string[],
  field: string,
  rowNo: number,
  errors: ValidationError[],
  opts: { gtZero?: boolean; min?: number } = {},
): number {
  const v = readCell(row, aliases)
  if (isBlank(v)) {
    pushError(errors, rowNo, field, "обов'язкове поле")
    return Number.NaN
  }
  const n = toNumber(v as CellValue)
  if (n === null) {
    pushError(errors, rowNo, field, 'має бути числом')
    return Number.NaN
  }
  if (opts.gtZero && n <= 0) {
    pushError(errors, rowNo, field, 'має бути більше 0')
  } else if (opts.min !== undefined && n < opts.min) {
    pushError(errors, rowNo, field, `має бути не менше ${opts.min}`)
  }
  return n
}

/** Необов'язкове число (порожньо → undefined; некоректно → помилка + undefined). */
export function optionalNumber(
  row: RawRow,
  aliases: string[],
  field: string,
  rowNo: number,
  errors: ValidationError[],
): number | undefined {
  const v = readCell(row, aliases)
  if (isBlank(v)) return undefined
  const n = toNumber(v as CellValue)
  if (n === null) {
    pushError(errors, rowNo, field, 'має бути числом')
    return undefined
  }
  return n
}

/** Обов'язкова дата (UTC-північ). Некоректно → помилка. */
export function requireDate(
  row: RawRow,
  aliases: string[],
  field: string,
  rowNo: number,
  errors: ValidationError[],
): Date {
  const v = readCell(row, aliases)
  if (isBlank(v)) {
    pushError(errors, rowNo, field, "обов'язкове поле")
    return new Date(Number.NaN)
  }
  const d = toDate(v as CellValue)
  if (d === null) {
    pushError(errors, rowNo, field, 'некоректна дата')
    return new Date(Number.NaN)
  }
  return d
}

/** Обов'язкове значення з переліку. Мапить псевдоніми на канонічне значення. */
export function requireEnum<T extends string>(
  row: RawRow,
  aliases: string[],
  field: string,
  rowNo: number,
  errors: ValidationError[],
  mapping: Record<string, T>,
): T | null {
  const v = readCell(row, aliases)
  if (isBlank(v)) {
    pushError(errors, rowNo, field, "обов'язкове поле")
    return null
  }
  const key = norm(String(v))
  const match = mapping[key]
  if (match === undefined) {
    const allowed = [...new Set(Object.values(mapping))].join(', ')
    pushError(errors, rowNo, field, `має бути одним із: ${allowed}`)
    return null
  }
  return match
}

/** Розпарсити булеве (підтверджено/так/true → true). */
export function optionalBoolean(
  row: RawRow,
  aliases: string[],
  truthy: string[],
): boolean {
  const v = readCell(row, aliases)
  if (isBlank(v)) return false
  if (typeof v === 'boolean') return v
  const s = norm(String(v))
  return truthy.map(norm).includes(s)
}
