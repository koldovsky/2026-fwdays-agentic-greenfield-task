// M5 streak card (FR-STATS-05). The shipped slice-004 snapshot exposes NO
// `baselines.streak`, so this is a PLAIN value card from `streaks.current`: no zone
// color and no baseline delta are fabricated. A zoned streak card awaits the
// metrics-snapshot-extension follow-up (add `baselines.streak`).
export default function StreakCard({ streak }: { streak: number }) {
  return (
    <div className="score-card score-card--plain">
      <span className="score-label micro-label">Streak</span>
      <div className="score-value">{streak}</div>
      <span className="score-caption">days in a row</span>
    </div>
  )
}
