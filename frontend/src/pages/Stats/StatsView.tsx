// StatsView — the pure, state-driven presentational view (DESIGN §10). It takes a
// discriminated-union `state` so all four states are unit-testable without a live fetch
// (the fetch/ownership lives in StatsPage):
//  - loading -> skeletons matching the final footprint, no layout shift (FR-STATS-02)
//  - error   -> a contained, retryable card, never a full-screen error (FR-STATS-01)
//  - empty   -> a calm first-run prompt with zeroed tiles, not blank/error (FR-STATS-01)
//  - loaded  -> summary tiles + zoned score cards + streak card + the three charts
//               (FR-STATS-01..05)
// The charts are separate modules so StatsView.loaded.test.tsx can mock their canvas
// wrappers; their data logic is covered by the toBarData/toDonutData/toLineData tests.
import type { SnapshotResponse, StreaksRead, VolumeRead } from './types'
import SummaryTiles from './SummaryTiles'
import ScoreCard from './ScoreCard'
import StreakCard from './StreakCard'
import BarByDay from './BarByDay'
import DonutByCategory from './DonutByCategory'
import CategoryLine from './CategoryLine'
import './stats.css'

export type StatsState =
  | { status: 'loading' }
  | { status: 'error'; onRetry: () => void }
  | { status: 'empty' }
  | { status: 'loaded'; snapshot: SnapshotResponse }

// The empty state triggers strictly on `volume.all_time_min === 0`: a snapshot with
// history but still-forming ("building") baseline zones is NOT empty.
export function isEmptySnapshot(snapshot: SnapshotResponse): boolean {
  return snapshot.volume.all_time_min === 0
}

const ZERO_VOLUME: VolumeRead = {
  today_min: 0,
  week_min: 0,
  month_min: 0,
  all_time_min: 0,
  daily_avg_30d_min: 0,
  per_day: [],
}

const ZERO_STREAKS: StreaksRead = { current: 0, longest: 0 }

function LoadingState() {
  return (
    <section className="stats-view stats-view--loading" aria-busy="true">
      <div className="summary-tiles">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="summary-tile skeleton" />
        ))}
      </div>
      <div className="stats-charts">
        {[0, 1, 2].map((i) => (
          <div key={i} className="stats-chart skeleton" />
        ))}
      </div>
    </section>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="stats-view">
      <div className="stats-error" role="alert">
        <p className="stats-error-text">We couldn&apos;t load your stats right now.</p>
        <button type="button" className="btn-ghost btn-small" onClick={onRetry}>
          Try again
        </button>
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <section className="stats-view">
      <SummaryTiles volume={ZERO_VOLUME} streaks={ZERO_STREAKS} />
      <div className="stats-empty">
        <p className="stats-empty-title">Start your first session to see your stats.</p>
        <p className="stats-empty-hint">
          Your metrics and charts fill in as you track time.
        </p>
      </div>
    </section>
  )
}

function LoadedState({ snapshot }: { snapshot: SnapshotResponse }) {
  const { volume, streaks, baselines, top_categories, per_category_per_day } = snapshot
  return (
    <section className="stats-view">
      <SummaryTiles volume={volume} streaks={streaks} />
      <div className="score-cards">
        <ScoreCard label="Volume" entry={baselines.volume} />
        <ScoreCard label="Consistency" entry={baselines.consistency} />
        <ScoreCard label="Focus" entry={baselines.focus_share} />
        <ScoreCard label="Switch load" entry={baselines.switch_load} />
        <StreakCard streak={streaks.current} />
      </div>
      <div className="stats-charts">
        <BarByDay perDay={volume.per_day} />
        <DonutByCategory categories={top_categories} />
        <CategoryLine series={per_category_per_day} />
      </div>
    </section>
  )
}

export default function StatsView({ state }: { state: StatsState }) {
  switch (state.status) {
    case 'loading':
      return <LoadingState />
    case 'error':
      return <ErrorState onRetry={state.onRetry} />
    case 'empty':
      return <EmptyState />
    case 'loaded':
      return <LoadedState snapshot={state.snapshot} />
  }
}
