/**
 * Публічний API побудови даних для експорту (без SheetJS/DOM). Запис у .xlsx —
 * у `src/export/xlsx.ts`.
 *
 * @module lib/export
 */
export type { ExportCell, SheetData } from './types.ts'
export {
  buildOperationsSheet,
  buildDeficitsSheet,
  buildOrderSummarySheet,
} from './build.ts'
