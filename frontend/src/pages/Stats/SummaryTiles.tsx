// Summary tiles (FR-STATS-01). A row of mono-labelled tiles — Today / This Week /
// This Month / All-time / Streak — each showing the corresponding `volume` / `streaks`
// value read directly from the snapshot, big tabular numbers, recomputing nothing (the
// week tile shows `week_min`, NOT the sum of `per_day`). Usable with an all-zero volume:
// the empty state renders these tiles reading 0.
import type { StreaksRead, VolumeRead } from './types'

export default function SummaryTiles({
  volume,
  streaks,
}: {
  volume: VolumeRead
  streaks: StreaksRead
}) {
  const tiles: { label: string; value: number; unit: string }[] = [
    { label: 'Today', value: volume.today_min, unit: 'min' },
    { label: 'This Week', value: volume.week_min, unit: 'min' },
    { label: 'This Month', value: volume.month_min, unit: 'min' },
    { label: 'All-time', value: volume.all_time_min, unit: 'min' },
    { label: 'Streak', value: streaks.current, unit: 'days' },
  ]

  return (
    <div className="summary-tiles">
      {tiles.map((tile) => (
        <div key={tile.label} className="summary-tile">
          <span className="summary-tile-label micro-label">{tile.label}</span>
          <span className="summary-tile-value">{tile.value}</span>
          <span className="summary-tile-unit">{tile.unit}</span>
        </div>
      ))}
    </div>
  )
}
