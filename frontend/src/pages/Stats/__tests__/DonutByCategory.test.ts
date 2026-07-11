// @trace FR-STATS-03
//
// RED test for the donut-by-category chart's pure data-transform layer.
// `toDonutData(top_categories)` -> one arc per entry, sized by `week_min`, colored from
// the entry's OWN `color` and keyed by `id` — NO name-based join against listCategories().
// The two-entries-same-name case proves coloring/keying is by id + own color, not name.
// Fails now: ../DonutByCategory (and its `toDonutData` export) does not exist yet.
import { describe, expect, it } from 'vitest'

import { sampleSnapshot } from '../__fixtures__/sampleSnapshot'
import { toDonutData } from '../DonutByCategory'

describe('toDonutData (FR-STATS-03)', () => {
  it('produces one arc per entry, sized by week_min, colored + keyed from the entry itself', () => {
    const cats = sampleSnapshot.top_categories
    const data = toDonutData(cats)

    expect(data).toHaveLength(cats.length)
    cats.forEach((c, i) => {
      expect(data[i].id).toBe(c.id)
      expect(data[i].value).toBe(c.week_min) // sized by week_min, verbatim
      expect(data[i].color).toBe(c.color) // arc color from the entry's own color
      expect(data[i].label).toBe(c.name)
    })
  })

  it('keys by id and own color even when two entries share a name (no listCategories join)', () => {
    const cats = [
      { id: 10, name: 'Work', color: '#111111', week_min: 40 },
      { id: 20, name: 'Work', color: '#222222', week_min: 25 },
    ]
    const data = toDonutData(cats)

    expect(data.map((d) => d.id)).toEqual([10, 20])
    expect(data.map((d) => d.color)).toEqual(['#111111', '#222222'])
    expect(data.map((d) => d.value)).toEqual([40, 25])
  })
})
