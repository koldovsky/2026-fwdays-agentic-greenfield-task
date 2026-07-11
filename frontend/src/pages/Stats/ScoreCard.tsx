// Metric score card (FR-STATS-05, NFR-DES-01). Reads ONE `baselines` entry
// {value, delta, zone} verbatim and renders it — deriving no zone and no delta:
//  - the value (big mono),
//  - the zone color as a token-mapped class keyed by the snapshot's `zone`
//    (green -> --zone-good, yellow -> --zone-warn, red -> --zone-bad), never a hex,
//  - the signed delta: `+N` with an up inline-SVG arrow (delta > 0), `-N` with a down
//    arrow (delta < 0), a neutral `±0` with NO arrow (delta === 0),
//  - a neutral "building" chip (no zone color, no delta) when the baseline is still
//    forming (zone === "building", delta null) — nothing fabricated (architecture §3.8).
import type { BaselineEntryRead } from './types'
import { IconArrowUp, IconArrowDown } from './icons'

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="score-delta score-delta--flat">±0</span>
  }
  const up = delta > 0
  const magnitude = Math.abs(delta)
  return (
    <span className={`score-delta score-delta--${up ? 'up' : 'down'}`}>
      {up ? <IconArrowUp /> : <IconArrowDown />}
      {up ? '+' : '-'}
      {magnitude}
    </span>
  )
}

export default function ScoreCard({
  label,
  entry,
}: {
  label: string
  entry: BaselineEntryRead
}) {
  const { value, delta, zone } = entry
  const building = zone === 'building'

  return (
    <div className="score-card">
      <span className="score-label micro-label">{label}</span>
      <div className="score-value">{value}</div>
      {building ? (
        <span className="score-chip" data-zone="building">
          building
        </span>
      ) : (
        <div className="score-meta">
          <span
            className={`zone-dot zone-dot--${zone}`}
            data-zone={zone}
            aria-hidden="true"
          />
          {delta !== null && <DeltaBadge delta={delta} />}
        </div>
      )}
    </div>
  )
}
