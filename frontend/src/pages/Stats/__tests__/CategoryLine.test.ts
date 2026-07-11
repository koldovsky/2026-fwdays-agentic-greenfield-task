// @trace FR-STATS-04
//
// RED test for the per-category line chart's pure data-transform layer.
// `toLineData(per_category_per_day)` -> one line/series per top-level entry, colored from
// the entry's OWN `color` and keyed by `id`, its points read verbatim from the entry's
// `per_day` mins (nothing recomputed). Fails now: ../CategoryLine (and its `toLineData`
// export) does not exist yet.
import { describe, expect, it } from 'vitest'

import { sampleSnapshot } from '../__fixtures__/sampleSnapshot'
import { toLineData } from '../CategoryLine'

describe('toLineData (FR-STATS-04)', () => {
  it('produces one series per per_category_per_day entry, colored + keyed from the entry', () => {
    const series = sampleSnapshot.per_category_per_day
    const data = toLineData(series)

    expect(data).toHaveLength(series.length)
    series.forEach((s, i) => {
      expect(data[i].id).toBe(s.id)
      expect(data[i].color).toBe(s.color)
      expect(data[i].label).toBe(s.name)
    })
  })

  it('reads each series values verbatim from its per_day mins (recomputes nothing)', () => {
    const data = toLineData(sampleSnapshot.per_category_per_day)
    // Deep Work: [60, 60]; Email: [30, 26]
    expect(data[0].values).toEqual([60, 60])
    expect(data[1].values).toEqual([30, 26])
    sampleSnapshot.per_category_per_day.forEach((s, i) => {
      expect(data[i].values).toEqual(s.per_day.map((p) => p.min))
    })
  })
})
