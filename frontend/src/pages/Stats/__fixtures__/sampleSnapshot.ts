// A concrete, well-formed instance of the shipped slice-004 GET /api/stats/snapshot
// payload, mirroring backend/app/schemas/stats.py `SnapshotResponse` field-for-field.
//
// The `: SnapshotResponse` annotation below is the seam's COMPILE-TIME assertion: when
// the frontend `../types` type drifts from this shipped shape (a field missing/extra),
// `tsc` (run by `npm run build`) fails here. The RUNTIME half of the seam lives in
// __tests__/snapshotSeam.test.ts, which compares this instance's key structure to the
// backend-generated JSON Schema (__fixtures__/snapshot.schema.json). The type import is
// `import type`, so it is erased at runtime — Vitest sees a plain object even before
// `../types` exists, keeping the runtime seam check sound at RED.
import type { SnapshotResponse } from '../types'

export const sampleSnapshot: SnapshotResponse = {
  window: { start: '2026-06-01', end: '2026-06-30', days: 30 },
  volume: {
    today_min: 42,
    week_min: 176,
    month_min: 531,
    all_time_min: 2048,
    daily_avg_30d_min: 17.7,
    per_day: [
      { date: '2026-06-28', min: 20 },
      { date: '2026-06-29', min: 0 },
      { date: '2026-06-30', min: 22 },
    ],
  },
  consistency: {
    score: 72,
    low_confidence: false,
    regularity: 0.8,
    start_stability: 0.6,
    median_start_local: '09:15',
  },
  focus: { deep_count: 3, deep_minutes: 140, deep_share: 0.44 },
  switching: {
    per_day: [
      { date: '2026-06-30', switches: 4, interruptions: 1, switch_load: 5, flagged: false },
    ],
    baseline_mean: 3.2,
  },
  streaks: { current: 7, longest: 12 },
  baselines: {
    volume: { value: 176, delta: 15, zone: 'green' },
    consistency: { value: 72, delta: -4, zone: 'yellow' },
    focus_share: { value: 0.44, delta: 0, zone: 'green' },
    switch_load: { value: 5, delta: null, zone: 'building' },
  },
  top_categories: [
    { id: 1, name: 'Deep Work', color: '#6366f1', week_min: 120 },
    { id: 2, name: 'Email', color: '#f59e0b', week_min: 56 },
  ],
  per_category_per_day: [
    {
      id: 1,
      name: 'Deep Work',
      color: '#6366f1',
      per_day: [
        { date: '2026-06-29', min: 60 },
        { date: '2026-06-30', min: 60 },
      ],
    },
    {
      id: 2,
      name: 'Email',
      color: '#f59e0b',
      per_day: [
        { date: '2026-06-29', min: 30 },
        { date: '2026-06-30', min: 26 },
      ],
    },
  ],
}

export default sampleSnapshot
