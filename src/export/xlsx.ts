import * as XLSX from 'xlsx'
import type { SheetData } from '../../lib/export/index.ts'

/**
 * 2.1 — Записати аркуш у `.xlsx` і завантажити (SheetJS, виключно на клієнті,
 * TC-STACK-05). Назва аркуша Excel обмежена 31 символом.
 */
export function writeSheet(sheet: SheetData, filename: string): void {
  const aoa = [sheet.headers, ...sheet.rows]
  const worksheet = XLSX.utils.aoa_to_sheet(aoa)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31))
  XLSX.writeFile(workbook, filename)
}
