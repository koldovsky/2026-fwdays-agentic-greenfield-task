/** Одиниця осі X гістограми завантаженості. */
export type CapacityUnit = 'day' | 'week' | 'month'

/** Рівень перегляду: агреговано по ГРЦ або розгорнуто по РЦ (FR-CAP-01). */
export type CapacityLevel = 'group' | 'rc'

/** Серія гістограми (ГРЦ або РЦ). */
export interface CapacitySeries {
  key: string
  name: string
}

/** Операція для тултипу слоту (FR-CAP-04). */
export interface CellOp {
  opName: string
  orderId: string
  nomenclatureId: string
  durationMin: number
}

/** KPI-рядок над гістограмою (FR-CAP-05). */
export interface CapacityKpis {
  avgLoadPct: number
  overloadedSlots: number
  zeroLoadRcs: number
}

/** Рядок даних для Recharts: бакет + % завантаження по кожній серії. */
export interface CapacityRow {
  bucket: string
  bucketStart: number
  [seriesKey: string]: number | string
}

/** Повна модель екрана завантаженості. */
export interface CapacityView {
  unit: CapacityUnit
  level: CapacityLevel
  series: CapacitySeries[]
  data: CapacityRow[]
  /** Ключ `${seriesKey}__${bucketStart}` → операції слоту. */
  opsByCell: Record<string, CellOp[]>
  kpis: CapacityKpis
}
