import { describe, it, expect } from 'vitest'
import type { Order, ScheduledOperation, WorkCalendar } from '../types/index.ts'
import { applyManualMove } from './reschedule.ts'

const MS_PER_DAY = 86_400_000

function makeCalendar(startISO: string, days: number, workingMinutes = 480): WorkCalendar[] {
  const start = new Date(startISO).getTime()
  const out: WorkCalendar[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(start + i * MS_PER_DAY)
    const dow = date.getUTCDay()
    const isWorking = dow !== 0 && dow !== 6
    out.push({ date, isWorking, workingMinutes: isWorking ? workingMinutes : 0 })
  }
  return out
}

const CAL = makeCalendar('2026-01-01', 30)
const ORDERS: Order[] = [
  { id: 'O1', productId: 'X', qty: 1, dueDate: new Date('2026-01-20T00:00:00Z') },
]

const op = (
  opNo: number,
  rcId: string,
  startISO: string,
  endISO: string,
  durationMin: number,
): ScheduledOperation => ({
  orderId: 'O1',
  bomNodeId: 'O1#X',
  nomenclatureId: 'X',
  opNo,
  opName: `op${opNo}`,
  rcGroupId: rcId === 'RC-1' ? 'G1' : 'G2',
  rcId,
  startAt: new Date(startISO),
  endAt: new Date(endISO),
  durationMin,
  status: 'ok',
})

describe('Scenario B — moving an operation later pushes its dependents', () => {
  const ops = [
    op(10, 'RC-1', '2026-01-05T00:00:00Z', '2026-01-05T01:00:00Z', 60),
    op(20, 'RC-2', '2026-01-06T00:00:00Z', '2026-01-06T00:30:00Z', 30),
  ]

  const result = applyManualMove(ops, 'O1#X#10', new Date('2026-01-07T02:00:00Z'), ORDERS, CAL)

  it('pins the moved operation at its new time', () => {
    const moved = result.operations.find((o) => o.opNo === 10)!
    expect(moved.startAt.toISOString()).toBe('2026-01-07T02:00:00.000Z')
    expect(moved.endAt.toISOString()).toBe('2026-01-07T03:00:00.000Z')
  })

  it('pushes op20 to the next working day after op10 finishes', () => {
    const dep = result.operations.find((o) => o.opNo === 20)!
    expect(dep.startAt.toISOString()).toBe('2026-01-08T00:00:00.000Z')
    expect(dep.endAt.toISOString()).toBe('2026-01-08T00:30:00.000Z')
  })

  it('updates the order planned ready date', () => {
    const order = result.orders.find((o) => o.orderId === 'O1')!
    expect(order.plannedReadyDate.toISOString()).toBe('2026-01-08T00:30:00.000Z')
  })
})

describe('Scenario C — moving earlier does not drag dependents back', () => {
  const ops = [
    op(10, 'RC-1', '2026-01-07T00:00:00Z', '2026-01-07T01:00:00Z', 60),
    op(20, 'RC-2', '2026-01-08T00:00:00Z', '2026-01-08T00:30:00Z', 30),
  ]

  const result = applyManualMove(ops, 'O1#X#10', new Date('2026-01-05T00:00:00Z'), ORDERS, CAL)

  it('moves op10 earlier', () => {
    const moved = result.operations.find((o) => o.opNo === 10)!
    expect(moved.startAt.toISOString()).toBe('2026-01-05T00:00:00.000Z')
  })

  it('leaves op20 in place (not pulled earlier)', () => {
    const dep = result.operations.find((o) => o.opNo === 20)!
    expect(dep.startAt.toISOString()).toBe('2026-01-08T00:00:00.000Z')
  })
})

describe('Scenario D — moving onto a non-working time aligns the placement', () => {
  it('uses the next working slot for the moved operation', () => {
    const ops = [op(10, 'RC-1', '2026-01-05T00:00:00Z', '2026-01-05T01:00:00Z', 60)]
    const result = applyManualMove(ops, 'O1#X#10', new Date('2026-01-03T12:00:00Z'), ORDERS, CAL)
    const moved = result.operations[0]!
    expect(moved.startAt.toISOString()).toBe('2026-01-05T00:00:00.000Z')
    expect(moved.endAt.toISOString()).toBe('2026-01-05T01:00:00.000Z')
  })
})

describe('applyManualMove — unknown op id is a no-op recompute', () => {
  it('returns operations unchanged and recomputed orders', () => {
    const ops = [op(10, 'RC-1', '2026-01-05T00:00:00Z', '2026-01-05T01:00:00Z', 60)]
    const result = applyManualMove(ops, 'MISSING#99', new Date('2026-01-09T00:00:00Z'), ORDERS, CAL)
    expect(result.operations[0]!.startAt.toISOString()).toBe('2026-01-05T00:00:00.000Z')
    expect(result.orders[0]!.plannedReadyDate.toISOString()).toBe('2026-01-05T01:00:00.000Z')
  })
})
