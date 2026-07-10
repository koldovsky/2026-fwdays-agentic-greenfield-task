/**
 * Shared domain types for the APS scheduling library.
 *
 * All time inside the algorithm is measured in **minutes** (TC-ALGO-01).
 * `Date` appears only at the input/output boundary and is converted to
 * minutes internally; it is never used for arithmetic in the core.
 */

// ---------------------------------------------------------------------------
// Input data
// ---------------------------------------------------------------------------

/** Клієнтське замовлення на готовий виріб. */
export interface Order {
  id: string
  /** Номенклатура готового виробу (корінь BOM). */
  productId: string
  qty: number
  dueDate: Date
  priority?: number
}

/** Ребро дерева BOM: батько → дитина. `parentId === null` — корінь. */
export interface BomNode {
  parentId: string | null
  /** Номенклатура дочірнього вузла. */
  childId: string
  /** Кількість дочірнього вузла на одиницю батька. */
  qtyPer: number
  type: 'assembly' | 'part' | 'material'
}

/** Операція технологічного маршруту (МК) для номенклатури. */
export interface RouteOperation {
  nomenclatureId: string
  /** Порядковий номер операції в маршруті. */
  opNo: number
  opName: string
  /**
   * Тип операції — зіставляється з `ResourceCenter.allowedOpTypes`
   * при виборі конкретного РЦ всередині ГРЦ (FR-RC-02, FR-SCHED-07).
   */
  opType: string
  /** ГРЦ до якої прив'язана операція. */
  rcGroupId: string
  /** Нормативна тривалість у хвилинах на одиницю. */
  durationMin: number
}

/** Конкретний ресурсний центр всередині ГРЦ. */
export interface ResourceCenter {
  id: string
  groupId: string
  name: string
  capacityMinPerShift: number
  shiftsPerDay: number
  /** Коефіцієнт ефективності, 0–100. */
  efficiencyPct: number
  /** Типи операцій які цей РЦ може виконувати. */
  allowedOpTypes: string[]
}

/** Група ресурсних центрів (ГРЦ). */
export interface RcGroup {
  id: string
  name: string
  rcIds: string[]
}

/** Залишок матеріалу на складі (знімок). */
export interface StockItem {
  nomenclatureId: string
  qty: number
}

/** Запланований прихід матеріалу. */
export interface PlannedReceipt {
  nomenclatureId: string
  date: Date
  qty: number
  confirmed: boolean
}

/** День виробничого календаря. */
export interface WorkCalendar {
  date: Date
  isWorking: boolean
  workingMinutes: number
}

// ---------------------------------------------------------------------------
// Output data
// ---------------------------------------------------------------------------

export type OperationStatus = 'ok' | 'at-risk' | 'late' | 'blocked-material'

/** Операція, розміщена у розкладі. */
export interface ScheduledOperation {
  orderId: string
  /** Ідентифікатор вузла BOM (розгорнутого). */
  bomNodeId: string
  nomenclatureId: string
  opNo: number
  opName: string
  rcGroupId: string
  /** Конкретний РЦ, обраний алгоритмом. */
  rcId: string
  startAt: Date
  endAt: Date
  durationMin: number
  status: OperationStatus
  blockedByMaterialId?: string
}

/** Підсумок по одному замовленню. */
export interface OrderResult {
  orderId: string
  plannedReadyDate: Date
  /** > 0 — запізнення (робочих днів); 0 — вчасно. */
  delayDays: number
  /** Масив opId (bomNodeId#opNo) на критичному шляху. */
  criticalPath: string[]
}

/** Завантаженість одного РЦ в один день. */
export interface CapacitySlot {
  rcId: string
  date: Date
  usedMin: number
  totalMin: number
  loadPct: number
}

/** Дефіцит матеріалу. */
export interface MaterialDeficit {
  nomenclatureId: string
  grossNeed: number
  stock: number
  plannedReceipts: number
  netDeficit: number
  /** `null` — дефіцит не покривається жодним надходженням (critical). */
  earliestCoverDate: Date | null
  blockedOrderIds: string[]
}

export interface ScheduleMetrics {
  lateOrdersCount: number
  totalDelayDays: number
  avgLoadPct: number
  overloadedSlotsCount: number
  /** Кількість незавершених вузлів BOM. */
  wipCount: number
}

/** Повний результат одного прогону планування. */
export interface ScheduleResult {
  operations: ScheduledOperation[]
  orders: OrderResult[]
  capacity: CapacitySlot[]
  deficits: MaterialDeficit[]
  metrics: ScheduleMetrics
}

// ---------------------------------------------------------------------------
// Intermediate structures (BOM expansion)
// ---------------------------------------------------------------------------

/** Вузол розгорнутого дерева BOM для конкретного замовлення. */
export interface ExpandedNode {
  /** Стабільний ідентифікатор розгорнутого вузла. */
  id: string
  orderId: string
  nomenclatureId: string
  /** Кількість з урахуванням множення по всьому шляху до кореня. */
  effectiveQty: number
  /** Глибина в дереві: 0 — корінь (готовий виріб). */
  level: number
  type: BomNode['type']
  /** Батьківський розгорнутий вузол; `null` — корінь. */
  parentExpandedId: string | null
}

/** Номенклатура, що зустрічається у кількох замовленнях (консолідована потреба). */
export interface SharedNode {
  nomenclatureId: string
  totalQty: number
  orderIds: string[]
}

// ---------------------------------------------------------------------------
// Main function signature
// ---------------------------------------------------------------------------

export interface ScheduleInput {
  orders: Order[]
  bom: BomNode[]
  routes: RouteOperation[]
  rcGroups: RcGroup[]
  resourceCenters: ResourceCenter[]
  stock: StockItem[]
  plannedReceipts: PlannedReceipt[]
  calendar: WorkCalendar[]
  /** Кінець горизонту планування. */
  horizon: Date
  today: Date
}

export type ScheduleMode = 'min-lateness' | 'min-idle'
