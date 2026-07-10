import type { CellValue, RawRow, ValidationError } from './types.ts'

/**
 * Примітиви читання і валідації клітинок. Кожен примітив читає значення за
 * списком псевдонімів колонки, і за потреби додає помилку у спільний масив
 * `errors`, повертаючи найкраще доступне значення.
 */

/**
 * Нормалізує назву колонки для зіставлення з псевдонімами.
 *
 * @param key - Назва колонки
 * @returns Назва в нижньому регістрі без пробілів, підкреслень і дефісів
 */
function norm(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, '').trim()
}

/**
 * Знаходить значення клітинки за одним із псевдонімів назви колонки.
 *
 * @param row - Рядок із сирими значеннями клітинок
 * @param aliases - Допустимі псевдоніми назви колонки
 * @returns Перше знайдене визначене значення або `undefined`
 */
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

/**
 * Determines whether a cell value is blank.
 *
 * @param v - The cell value to check
 * @returns `true` if the value is `undefined`, `null`, or an empty string after trimming, `false` otherwise.
 */
function isBlank(v: CellValue | undefined): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
}

/**
 * Adds a validation error to the provided collection.
 *
 * @param errors - The collection to which the error is added
 * @param row - The row number associated with the error
 * @param field - The field associated with the error
 * @param reason - The reason for the validation error
 */
function pushError(
  errors: ValidationError[],
  row: number,
  field: string,
  reason: string,
): void {
  errors.push({ row, field, reason, severity: 'error' })
}

/**
 * Перетворює значення клітинки на скінченне число.
 *
 * @param v - Значення клітинки; пробіли видаляються, а десяткова кома замінюється крапкою
 * @returns Число або `null`, якщо значення не можна перетворити на скінченне число
 */
function toNumber(v: CellValue): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'boolean') return null
  const s = String(v).trim().replace(/\s+/g, '').replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * Перетворює значення на дату опівночі за UTC.
 *
 * @param v - Значення дати або рядок у форматі `yyyy-mm-dd`, `yyyy/mm/dd`, `dd.mm.yyyy` чи `dd/mm/yyyy`
 * @returns Дата за UTC або `null`, якщо значення порожнє, має непідтримуваний формат чи містить некоректну календарну дату
 */
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

/**
 * Creates a date at UTC midnight for the same calendar day as the input.
 *
 * @param d - The source date
 * @returns A new date set to midnight UTC on the source date's calendar day.
 */
function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
/**
 * Creates a UTC date from year, month, and day components.
 *
 * @param y - The UTC year
 * @param m - The zero-based UTC month
 * @param d - The UTC day of the month
 * @returns The resulting date, or `null` if the components do not form a valid calendar date
 */
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

/**
 * Зчитує обов’язкове текстове значення з рядка.
 *
 * @param field - Назва поля для повідомлення про помилку
 * @param rowNo - Номер рядка для повідомлення про помилку
 * @param errors - Масив для додавання помилки валідації
 * @returns Обрізане текстове значення або порожній рядок, якщо поле порожнє
 */
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

/**
 * Reads an optional text value from a row.
 *
 * @param row - The source row
 * @param aliases - Column names accepted for the value
 * @returns The trimmed text value, or `undefined` when the cell is blank
 */
export function optionalString(row: RawRow, aliases: string[]): string | undefined {
  const v = readCell(row, aliases)
  return isBlank(v) ? undefined : String(v).trim()
}

/**
 * Перетворює обов’язкове значення клітинки на число та перевіряє задані обмеження.
 *
 * @param field - Назва поля для повідомлень про помилки
 * @param rowNo - Номер рядка для повідомлень про помилки
 * @param opts - Додаткові обмеження числового значення
 * @returns Розібране число; `Number.NaN`, якщо значення порожнє або некоректне
 */
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

/**
 * Зчитує необов'язкове числове поле.
 *
 * @param field - Назва поля для повідомлення про помилку
 * @param rowNo - Номер рядка для повідомлення про помилку
 * @param errors - Масив для накопичення помилки некоректного числа
 * @returns Числове значення, або `undefined` для порожнього чи некоректного значення
 */
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

/**
 * Зчитує та перевіряє обов’язкове значення дати.
 *
 * @param field - Назва поля для повідомлення про помилку
 * @param rowNo - Номер рядка для повідомлення про помилку
 * @param errors - Масив для накопичення помилок валідації
 * @returns Дата опівночі за UTC або `Invalid Date`, якщо значення відсутнє чи некоректне
 */
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

/**
 * Визначає канонічне значення обов'язкового поля за мапою псевдонімів.
 *
 * @param field - Назва поля для повідомлення про помилку
 * @param rowNo - Номер рядка для повідомлення про помилку
 * @param errors - Масив для додавання помилок валідації
 * @param mapping - Мапа нормалізованих псевдонімів на канонічні значення
 * @returns Канонічне значення або `null`, якщо значення відсутнє чи не відповідає мапі
 */
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

/**
 * Determines whether a cell contains a truthy value.
 *
 * @param truthy - String values interpreted as `true` after normalization
 * @returns `true` if the cell contains `true` or a normalized value from `truthy`, `false` otherwise
 */
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
