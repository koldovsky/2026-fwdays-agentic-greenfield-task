import { create } from 'zustand'
import type {
  ImportTable,
  ParsedTable,
  RawRow,
  TableDiff,
} from '../../lib/import/index.ts'
import { diffRows, KEY_OF, parseTable } from '../../lib/import/index.ts'
import type { ScheduleInput, ScheduleMode, ScheduleResult } from '../../lib/index.ts'
import type { PlannedReceipt } from '../../lib/types/index.ts'
import { schedule } from '../../lib/index.ts'
import { applyManualMove } from '../../lib/scheduler/reschedule.ts'
import { expandBom } from '../../lib/bom/expand.ts'
import { calcGrossRequirements, type GrossRequirement } from '../../lib/mrp/gross-requirements.ts'
import { demandDatesByMaterial } from '../../lib/material/index.ts'
import { loadSession, saveTable } from './persistence.ts'

/** Збережений варіант розкладу (FR-SCEN-01). */
export interface Scenario {
  id: string
  name: string
  mode: ScheduleMode
  result: ScheduleResult
}

/** Стан однієї імпортованої таблиці. */
export interface TableState {
  rawRows: RawRow[]
  parsed: ParsedTable
  diff: TableDiff | null
  fileName: string | null
}

/** Таблиці, обов'язкові для запуску планування. */
const REQUIRED: ImportTable[] = ['orders', 'bom', 'routes', 'resourceCenters', 'calendar']

function emptyTable(table: ImportTable): TableState {
  return { rawRows: [], parsed: parseTable(table, []), diff: null, fileName: null }
}

function initialTables(): Record<ImportTable, TableState> {
  return {
    orders: emptyTable('orders'),
    bom: emptyTable('bom'),
    routes: emptyTable('routes'),
    resourceCenters: emptyTable('resourceCenters'),
    stock: emptyTable('stock'),
    receipts: emptyTable('receipts'),
    calendar: emptyTable('calendar'),
  }
}

export interface SessionState {
  tables: Record<ImportTable, TableState>
  hydrated: boolean
  plan: ScheduleResult | null
  planInput: ScheduleInput | null
  lockedOpIds: string[]
  /** Брутто-потреба, зафіксована при плануванні (для перерахунку дефіцитів). */
  grossReqs: GrossRequirement[]
  /** Дата споживання кожного матеріалу. */
  demandDates: Map<string, Date>
  /** Ручні перевизначення залишків (абсолютні) — FR-MAT-03. */
  stockAdjustments: Record<string, number>
  /** Вручну додані надходження — FR-MAT-03. */
  extraReceipts: PlannedReceipt[]
  /** Збережені варіанти розкладу (до 3) — FR-SCEN-01. */
  scenarios: Scenario[]
  /** id підтвердженого активного варіанту — FR-SCEN-03. */
  acceptedScenarioId: string | null
  scenarioSeq: number
  importRows: (table: ImportTable, rows: RawRow[], fileName: string | null) => void
  updateRows: (table: ImportTable, rows: RawRow[]) => void
  clearTable: (table: ImportTable) => void
  hydrate: () => Promise<void>
  errorCount: () => number
  canPlan: () => boolean
  buildScheduleInput: (today: Date, horizon: Date) => ScheduleInput | null
  runPlanning: (today: Date, horizon: Date) => ScheduleResult | null
  moveOperation: (opId: string, newStart: Date) => void
  setStockAdjustment: (nomenclatureId: string, qty: number) => void
  addReceipt: (receipt: PlannedReceipt) => void
  resetMaterialEdits: () => void
  addScenario: (name: string, mode: ScheduleMode, today: Date, horizon: Date) => string | null
  confirmScenario: (id: string) => void
  removeScenario: (id: string) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  tables: initialTables(),
  hydrated: false,
  plan: null,
  planInput: null,
  lockedOpIds: [],
  grossReqs: [],
  demandDates: new Map(),
  stockAdjustments: {},
  extraReceipts: [],
  scenarios: [],
  acceptedScenarioId: null,
  scenarioSeq: 0,

  importRows: (table, rows, fileName) => {
    const prev = get().tables[table].rawRows
    const diff = prev.length > 0 ? diffRows(prev, rows, KEY_OF[table]) : null
    const parsed = parseTable(table, rows)
    set((s) => ({ tables: { ...s.tables, [table]: { rawRows: rows, parsed, diff, fileName } } }))
    void saveTable(table, rows)
  },

  updateRows: (table, rows) => {
    const parsed = parseTable(table, rows)
    set((s) => ({
      tables: { ...s.tables, [table]: { ...s.tables[table], rawRows: rows, parsed } },
    }))
    void saveTable(table, rows)
  },

  clearTable: (table) => {
    set((s) => ({ tables: { ...s.tables, [table]: emptyTable(table) } }))
    void saveTable(table, [])
  },

  hydrate: async () => {
    const session = await loadSession()
    set((s) => {
      const tables = { ...s.tables }
      for (const table of Object.keys(session) as ImportTable[]) {
        const rows = session[table]!
        tables[table] = { rawRows: rows, parsed: parseTable(table, rows), diff: null, fileName: null }
      }
      return { tables, hydrated: true }
    })
  },

  errorCount: () => {
    const { tables } = get()
    let count = 0
    for (const t of Object.values(tables)) {
      count += t.parsed.errors.filter((e) => e.severity === 'error').length
    }
    return count
  },

  canPlan: () => {
    const { tables } = get()
    if (get().errorCount() > 0) return false
    return REQUIRED.every((t) => tables[t].rawRows.length > 0)
  },

  buildScheduleInput: (today, horizon) => {
    if (!get().canPlan()) return null
    const t = get().tables
    return {
      orders: t.orders.parsed.orders ?? [],
      bom: t.bom.parsed.bom ?? [],
      routes: t.routes.parsed.routes ?? [],
      rcGroups: t.resourceCenters.parsed.rcGroups ?? [],
      resourceCenters: t.resourceCenters.parsed.resourceCenters ?? [],
      stock: t.stock.parsed.stock ?? [],
      plannedReceipts: t.receipts.parsed.receipts ?? [],
      calendar: t.calendar.parsed.calendar ?? [],
      horizon,
      today,
    }
  },

  runPlanning: (today, horizon) => {
    const input = get().buildScheduleInput(today, horizon)
    if (!input) return null
    const plan = schedule(input, 'min-lateness')
    // Фіксуємо брутто-потребу і дати споживання для миттєвого перерахунку дефіцитів.
    const grossReqs = calcGrossRequirements(expandBom(input.orders, input.bom))
    const demandDates = demandDatesByMaterial(plan.operations, input.bom)
    set({
      plan,
      planInput: input,
      lockedOpIds: [],
      grossReqs,
      demandDates,
      stockAdjustments: {},
      extraReceipts: [],
    })
    return plan
  },

  setStockAdjustment: (nomenclatureId, qty) => {
    set((s) => ({ stockAdjustments: { ...s.stockAdjustments, [nomenclatureId]: qty } }))
  },

  addReceipt: (receipt) => {
    set((s) => ({ extraReceipts: [...s.extraReceipts, receipt] }))
  },

  resetMaterialEdits: () => {
    set({ stockAdjustments: {}, extraReceipts: [] })
  },

  addScenario: (name, mode, today, horizon) => {
    if (get().scenarios.length >= 3) return null
    const input = get().buildScheduleInput(today, horizon)
    if (!input) return null
    const result = schedule(input, mode)
    const id = `S${get().scenarioSeq + 1}`
    set((s) => ({
      scenarios: [...s.scenarios, { id, name, mode, result }],
      planInput: input,
      scenarioSeq: s.scenarioSeq + 1,
    }))
    return id
  },

  confirmScenario: (id) => {
    const { scenarios, planInput } = get()
    const scenario = scenarios.find((s) => s.id === id)
    if (!scenario || !planInput) return
    // Підтверджений варіант стає активним розкладом (FR-SCEN-03, BC-UX-03).
    const grossReqs = calcGrossRequirements(expandBom(planInput.orders, planInput.bom))
    const demandDates = demandDatesByMaterial(scenario.result.operations, planInput.bom)
    set({
      plan: scenario.result,
      acceptedScenarioId: id,
      grossReqs,
      demandDates,
      lockedOpIds: [],
      stockAdjustments: {},
      extraReceipts: [],
    })
  },

  removeScenario: (id) => {
    set((s) => ({
      scenarios: s.scenarios.filter((sc) => sc.id !== id),
      acceptedScenarioId: s.acceptedScenarioId === id ? null : s.acceptedScenarioId,
    }))
  },

  moveOperation: (opId, newStart) => {
    const { plan, planInput, lockedOpIds } = get()
    if (!plan || !planInput) return
    const { operations, orders } = applyManualMove(
      plan.operations,
      opId,
      newStart,
      planInput.orders,
      planInput.calendar,
    )
    set({
      plan: { ...plan, operations, orders },
      lockedOpIds: lockedOpIds.includes(opId) ? lockedOpIds : [...lockedOpIds, opId],
    })
  },
}))
