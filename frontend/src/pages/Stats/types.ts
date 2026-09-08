// Frontend mirror of the shipped slice-004 GET /api/stats/snapshot payload
// (backend/app/schemas/stats.py `SnapshotResponse`), field-for-field. This is the
// single data contract the Stats page consumes; it renders these values and computes
// nothing. The seam test (__tests__/snapshotSeam.test.ts) + `tsc` (via the
// `: SnapshotResponse`-typed fixture) fail on any producer/consumer drift.
//
// `date`/window fields arrive as plain ISO `YYYY-MM-DD` strings over the wire (Pydantic
// serializes `datetime.date` to a bare string), so they are typed `string` here.

export interface WindowRead {
  start: string
  end: string
  days: number
}

export interface DailyMinRead {
  date: string
  min: number
}

export interface VolumeRead {
  today_min: number
  week_min: number
  month_min: number
  all_time_min: number
  daily_avg_30d_min: number
  per_day: DailyMinRead[]
}

export interface ConsistencyRead {
  score: number | null
  low_confidence: boolean
  regularity: number | null
  start_stability: number | null
  median_start_local: string | null
}

export interface FocusRead {
  deep_count: number
  deep_minutes: number
  deep_share: number
}

export interface SwitchDayRead {
  date: string
  switches: number
  interruptions: number
  switch_load: number
  flagged: boolean
}

export interface SwitchingRead {
  per_day: SwitchDayRead[]
  baseline_mean: number
}

export interface StreaksRead {
  current: number
  longest: number
}

// One metric baseline entry {value, delta, zone}. `zone` is the backend string
// ("green" | "yellow" | "red" | "building"); the card maps it to a token color and
// never derives it. `delta` is null while a baseline is still forming ("building").
export interface BaselineEntryRead {
  value: number
  delta: number | null
  zone: string
}

export interface BaselinesRead {
  volume: BaselineEntryRead
  consistency: BaselineEntryRead
  focus_share: BaselineEntryRead
  switch_load: BaselineEntryRead
}

export interface TopCategoryRead {
  id: number
  name: string
  color: string
  week_min: number
}

export interface CategoryPerDayRead {
  id: number
  name: string
  color: string
  per_day: DailyMinRead[]
}

export interface SnapshotResponse {
  window: WindowRead
  volume: VolumeRead
  consistency: ConsistencyRead
  focus: FocusRead
  switching: SwitchingRead
  streaks: StreaksRead
  baselines: BaselinesRead
  top_categories: TopCategoryRead[]
  per_category_per_day: CategoryPerDayRead[]
}
