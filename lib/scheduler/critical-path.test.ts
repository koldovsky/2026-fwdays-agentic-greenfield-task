import { describe, it, expect } from 'vitest'
import type { ScheduledOperation } from '../types/index.ts'
import { findCriticalPath } from './critical-path.ts'

const so = (
  bomNodeId: string,
  opNo: number,
  durationMin: number,
  startISO: string,
  endISO: string,
): ScheduledOperation => ({
  orderId: 'O1',
  bomNodeId,
  nomenclatureId: bomNodeId.split('/').pop()!,
  opNo,
  opName: `op${opNo}`,
  rcGroupId: 'G1',
  rcId: 'RC-1',
  startAt: new Date(startISO),
  endAt: new Date(endISO),
  durationMin,
  status: 'ok',
})

describe('findCriticalPath', () => {
  // Tree: A(root) ← B ← D (long chain) and A ← C (short branch).
  const ops: ScheduledOperation[] = [
    so('O1#A/B/D', 10, 60, '2026-01-05T00:00:00Z', '2026-01-05T01:00:00Z'),
    so('O1#A/B', 10, 45, '2026-01-06T00:00:00Z', '2026-01-06T00:45:00Z'),
    so('O1#A/C', 10, 30, '2026-01-06T00:00:00Z', '2026-01-06T00:30:00Z'),
    so('O1#A', 10, 20, '2026-01-07T00:00:00Z', '2026-01-07T00:20:00Z'),
  ]

  it('returns the longest chain that determines the ready date', () => {
    // D(60)+B(45)+A(20)=125 beats C(30)+A(20)=50
    expect(findCriticalPath(ops, 'O1')).toEqual(['O1#A/B/D#10', 'O1#A/B#10', 'O1#A#10'])
  })

  it('ends at the operation with the latest endAt (planned ready date)', () => {
    const path = findCriticalPath(ops, 'O1')
    const lastId = path[path.length - 1]!
    const latest = ops.reduce((a, b) => (b.endAt > a.endAt ? b : a))
    expect(lastId).toBe(`${latest.bomNodeId}#${latest.opNo}`)
  })

  it('returns an empty path for an unknown order', () => {
    expect(findCriticalPath(ops, 'NOPE')).toEqual([])
  })

  it('handles a single-operation order', () => {
    const single = [so('O2#X', 10, 15, '2026-01-05T00:00:00Z', '2026-01-05T00:15:00Z')]
    single[0]!.orderId = 'O2'
    expect(findCriticalPath(single, 'O2')).toEqual(['O2#X#10'])
  })
})
