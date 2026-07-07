import { describe, it, expect } from 'vitest'
import type { RcGroup, ResourceCenter, ScheduledOperation } from '../types/index.ts'
import { buildGanttData, operationTaskId } from './to-gantt.ts'
import { taskCssClass } from './status.ts'

const rc = (id: string, groupId: string): ResourceCenter => ({
  id,
  groupId,
  name: `Name-${id}`,
  capacityMinPerShift: 480,
  shiftsPerDay: 1,
  efficiencyPct: 100,
  allowedOpTypes: ['generic'],
})

const op = (over: Partial<ScheduledOperation>): ScheduledOperation => ({
  orderId: 'O1',
  bomNodeId: 'O1#A',
  nomenclatureId: 'A',
  opNo: 10,
  opName: 'Оп',
  rcGroupId: 'G1',
  rcId: 'RC-1',
  startAt: new Date('2026-01-05T00:00:00Z'),
  endAt: new Date('2026-01-05T01:00:00Z'),
  durationMin: 60,
  status: 'ok',
  ...over,
})

describe('taskCssClass — status colours (FR-GANTT-03)', () => {
  it('maps each status to its class and adds hatching when locked', () => {
    expect(taskCssClass('ok')).toBe('gop gop--ok')
    expect(taskCssClass('at-risk')).toBe('gop gop--risk')
    expect(taskCssClass('late')).toBe('gop gop--late')
    expect(taskCssClass('blocked-material')).toBe('gop gop--blocked')
    expect(taskCssClass('ok', true)).toBe('gop gop--ok gop--locked')
  })
})

describe('Scenario A — grouping by RC/RC-group and colours', () => {
  const rcGroups: RcGroup[] = [
    { id: 'G1', name: 'Група 1', rcIds: ['RC-1'] },
    { id: 'G2', name: 'Група 2', rcIds: ['RC-2'] },
  ]
  const resourceCenters = [rc('RC-1', 'G1'), rc('RC-2', 'G2')]
  const operations: ScheduledOperation[] = [
    op({ orderId: 'O1', bomNodeId: 'O1#A', nomenclatureId: 'A', opNo: 10, rcId: 'RC-1', rcGroupId: 'G1', status: 'ok' }),
    op({ orderId: 'O2', bomNodeId: 'O2#B', nomenclatureId: 'B', opNo: 10, rcId: 'RC-2', rcGroupId: 'G2', status: 'late' }),
    op({ orderId: 'O3', bomNodeId: 'O3#C', nomenclatureId: 'C', opNo: 20, rcId: 'RC-2', rcGroupId: 'G2', status: 'blocked-material', blockedByMaterialId: 'M' }),
  ]

  const data = buildGanttData({
    operations,
    rcGroups,
    resourceCenters,
    lockedOpIds: ['O1#A#10'],
  })

  it('builds group → rc → op tree with correct parents', () => {
    const byId = new Map(data.tasks.map((t) => [t.id, t]))
    expect(byId.get('grp:G1')?.parent).toBe(0)
    expect(byId.get('rc:RC-1')?.parent).toBe('grp:G1')
    expect(byId.get('O1#A#10')?.parent).toBe('rc:RC-1')
    expect(byId.get('O2#B#10')?.parent).toBe('rc:RC-2')
    expect(byId.get('rc:RC-2')?.parent).toBe('grp:G2')
  })

  it('sets bar text as operation · order · nomenclature (FR-GANTT-02)', () => {
    expect(data.tasks.find((t) => t.id === 'O2#B#10')?.text).toBe('Оп · O2 · B')
  })

  it('assigns colour classes per status and hatching for locked', () => {
    const byId = new Map(data.tasks.map((t) => [t.id, t]))
    expect(byId.get('O1#A#10')?.css).toBe('gop gop--ok gop--locked')
    expect(byId.get('O2#B#10')?.css).toBe('gop gop--late')
    expect(byId.get('O3#C#20')?.css).toBe('gop gop--blocked')
  })

  it('applies the critical-path class when requested (FR-GANTT-08)', () => {
    const highlighted = buildGanttData({
      operations,
      rcGroups,
      resourceCenters,
      criticalOpIds: ['O2#B#10'],
    })
    expect(highlighted.tasks.find((t) => t.id === 'O2#B#10')?.css).toContain('gop--critical')
  })

  it('produces a stable operation id', () => {
    expect(operationTaskId({ bomNodeId: 'O1#A/B', opNo: 20 })).toBe('O1#A/B#20')
  })
})
