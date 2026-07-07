/**
 * Публічний API бібліотеки планування APS (Advanced Planning & Scheduling).
 *
 * Бібліотека повністю чиста: жодних залежностей від React, DOM чи Vite.
 * Внутрішня одиниця часу — хвилини (number); `Date` використовується лише
 * на межі вводу/виводу (TC-ALGO-01).
 *
 * @example
 * ```ts
 * import { schedule, type ScheduleInput } from './lib'
 *
 * const input: ScheduleInput = { orders, bom, routes, rcGroups,
 *   resourceCenters, stock, plannedReceipts, calendar, horizon, today }
 *
 * const minLateness = schedule(input, 'min-lateness') // backward, CR-пріоритет
 * const minIdle     = schedule(input, 'min-idle')     // forward, щільне заповнення
 * ```
 *
 * @module lib
 */

/**
 * Детермінована функція планування: перетворює виробничі дані на розклад
 * операцій по РЦ. Викликається окремо для кожного режиму (`ScheduleMode`)
 * і повертає незалежний `ScheduleResult`.
 *
 * @see ScheduleInput  — вхідні дані та горизонт
 * @see ScheduleResult — операції, підсумки замовлень, завантаженість, метрики
 * @see ScheduleMode   — `'min-lateness'` | `'min-idle'`
 */
export { schedule } from './scheduler/index.ts'

/** Вхідні дані та вихідні структури головної функції планування. */
export type { ScheduleInput, ScheduleResult, ScheduleMode } from './types/index.ts'
