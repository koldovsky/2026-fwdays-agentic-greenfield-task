// @trace FR-STATS-02
//
// RED test for the bar-by-day chart's pure data-transform layer. Chart.js needs a real
// canvas (absent under jsdom), so the RENDERING is a thin effect the implementer writes;
// the testable contract is `toBarData(volume.per_day)` -> one datum per day, value read
// verbatim from `min` (nothing recomputed), order preserved. Fails now: ../BarByDay
// (and its `toBarData` export) does not exist yet.
import { describe, expect, it } from 'vitest'

import { sampleSnapshot } from '../__fixtures__/sampleSnapshot'
import { toBarData } from '../BarByDay'

describe('toBarData (FR-STATS-02)', () => {
  it('produces one datum per per_day entry with min read verbatim, in order', () => {
    const perDay = sampleSnapshot.volume.per_day // [20, 0, 22] over three dates
    const data = toBarData(perDay)

    expect(data).toHaveLength(perDay.length)
    expect(data.map((d) => d.value)).toEqual([20, 0, 22]) // verbatim, incl. the zero day
    expect(data.map((d) => d.label)).toEqual(perDay.map((e) => e.date))
  })

  it('recomputes no total: each datum value equals its source min exactly', () => {
    const data = toBarData(sampleSnapshot.volume.per_day)
    data.forEach((d, i) => {
      expect(d.value).toBe(sampleSnapshot.volume.per_day[i].min)
    })
  })
})
