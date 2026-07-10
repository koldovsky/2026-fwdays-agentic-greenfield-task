/** Значення клітинки експорту. */
export type ExportCell = string | number

/** Дані одного аркуша: назва, заголовки і рядки (без заголовка). */
export interface SheetData {
  name: string
  headers: string[]
  rows: ExportCell[][]
}
