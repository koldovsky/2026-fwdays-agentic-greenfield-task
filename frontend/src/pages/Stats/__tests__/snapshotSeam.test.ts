// Seam test (add-stats-ui tasks.md §1.4): the frontend SnapshotResponse type matches
// the REAL backend GET /api/stats/snapshot shape field-for-field, so slice-004
// producer drift fails THIS test rather than the integrated Stats page.
//
// @trace FR-STATS-01
// @trace FR-STATS-02
// @trace FR-STATS-03
// @trace FR-STATS-04
// @trace FR-STATS-05
//
// Ground truth = a JSON Schema generated from the backend Pydantic model, committed at
// __fixtures__/snapshot.schema.json. REGENERATE it (run from backend/, building the
// venv via `python -m venv .venv` + `.\.venv\Scripts\python.exe -m pip install -e ".[dev]"`
// if absent) with:
//
//   .\.venv\Scripts\python.exe -c "import json; from app.schemas.stats import SnapshotResponse; print(json.dumps(SnapshotResponse.model_json_schema(), indent=2))" > ../frontend/src/pages/Stats/__fixtures__/snapshot.schema.json
//
// Two independent checks make drift fail:
//  - RUNTIME (this Vitest file): the sample instance's recursive key structure must equal
//    the backend schema's resolved property structure, plus targeted shipped-shape asserts.
//  - COMPILE (npm run build / tsc): sampleSnapshot is typed `: SnapshotResponse` from
//    ../types, so a missing/extra frontend field fails the type-check.
import { describe, expect, it } from 'vitest'

import type { SnapshotResponse } from '../types'
import schema from '../__fixtures__/snapshot.schema.json'
import { sampleSnapshot } from '../__fixtures__/sampleSnapshot'
import { getStatsSnapshot } from '../../../api'

// Explicit compile-time binding (enforced by tsc in `npm run build`; a runtime no-op
// after type erasure). Exported so `noUnusedLocals` does not flag it.
export const _seamCompileCheck: SnapshotResponse = sampleSnapshot

// --- JSON-Schema -> structural signature (resolves $ref against $defs) ---------------

type Sig =
  | { t: 'scalar' }
  | { t: 'array'; items: Sig }
  | { t: 'object'; keys: Record<string, Sig> }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = Record<string, any>

const defs: Node = (schema as Node).$defs ?? {}

function resolveRef(node: Node): Node {
  if (typeof node.$ref === 'string') {
    const name = node.$ref.split('/').pop() as string
    return defs[name]
  }
  return node
}

function schemaSig(raw: Node): Sig {
  const node = resolveRef(raw)
  if (node.type === 'object' || node.properties) {
    const keys: Record<string, Sig> = {}
    for (const key of Object.keys(node.properties as Node)) {
      keys[key] = schemaSig((node.properties as Node)[key])
    }
    return { t: 'object', keys }
  }
  if (node.type === 'array') {
    return { t: 'array', items: schemaSig(node.items as Node) }
  }
  return { t: 'scalar' }
}

function valueSig(v: unknown): Sig {
  if (Array.isArray(v)) {
    return { t: 'array', items: v.length > 0 ? valueSig(v[0]) : { t: 'scalar' } }
  }
  if (v !== null && typeof v === 'object') {
    const keys: Record<string, Sig> = {}
    for (const key of Object.keys(v as Record<string, unknown>)) {
      keys[key] = valueSig((v as Record<string, unknown>)[key])
    }
    return { t: 'object', keys }
  }
  return { t: 'scalar' }
}

describe('snapshot seam: frontend SnapshotResponse === backend SnapshotResponse', () => {
  it('the sample instance structure matches the backend JSON Schema field-for-field', () => {
    expect(valueSig(sampleSnapshot)).toEqual(schemaSig(schema as Node))
  })

  it('top-level blocks are exactly the shipped nine', () => {
    const expected = [
      'window',
      'volume',
      'consistency',
      'focus',
      'switching',
      'streaks',
      'baselines',
      'top_categories',
      'per_category_per_day',
    ].sort()
    expect(Object.keys((schema as Node).properties).sort()).toEqual(expected)
    expect(Object.keys(sampleSnapshot).sort()).toEqual(expected)
  })

  it('baselines carries exactly the four shipped entries and NO streak', () => {
    const backendKeys = Object.keys((defs.BaselinesRead as Node).properties).sort()
    expect(backendKeys).toEqual(['consistency', 'focus_share', 'switch_load', 'volume'])
    expect(backendKeys).not.toContain('streak')

    const frontendKeys = Object.keys(sampleSnapshot.baselines).sort()
    expect(frontendKeys).toEqual(['consistency', 'focus_share', 'switch_load', 'volume'])
    expect(frontendKeys).not.toContain('streak')
  })

  it('volume includes all_time_min (shipped)', () => {
    expect(Object.keys((defs.VolumeRead as Node).properties)).toContain('all_time_min')
    expect(sampleSnapshot.volume.all_time_min).toBeTypeOf('number')
  })

  it('top_categories and per_category_per_day entries carry id + color', () => {
    for (const def of ['TopCategoryRead', 'CategoryPerDayRead']) {
      const keys = Object.keys((defs[def] as Node).properties)
      expect(keys).toContain('id')
      expect(keys).toContain('color')
    }
    expect(sampleSnapshot.top_categories[0]).toHaveProperty('id')
    expect(sampleSnapshot.top_categories[0]).toHaveProperty('color')
    expect(sampleSnapshot.per_category_per_day[0]).toHaveProperty('id')
    expect(sampleSnapshot.per_category_per_day[0]).toHaveProperty('color')
  })

  it('the typed read-only fetch seam getStatsSnapshot() is exported from src/api.ts', () => {
    // getStatsSnapshot is appended to src/api.ts by the implementer (tasks §1.2) and is
    // typed () => Promise<SnapshotResponse>; until then this named import is undefined.
    expect(typeof getStatsSnapshot).toBe('function')
  })
})
