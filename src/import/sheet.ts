import * as XLSX from 'xlsx'
import type { RawRow } from '../../lib/import/index.ts'

/**
 * 4.1 — Прочитати перший аркуш Excel/CSV у сирі рядки (FR-IMP-01).
 *
 * Парсинг виконується виключно на клієнті (SheetJS): файл читається як
 * ArrayBuffer, дані не надсилаються на сервер (NFR-DATA-01). Дати повертаються
 * як `Date` (`cellDates`), а порожні клітинки — як `null`.
 */
export async function readSheet(file: File): Promise<RawRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) return []
  const sheet = workbook.Sheets[firstSheet]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null, raw: true })
}
