import { formatNumber, formatPercent } from "@/app/lib/format";

/**
 * Profile summary on the navy gradient panel: the applicant's average NMT
 * score, how many programs match the chosen elective, and the current benefit
 * bonus. Recomputes live with every input change (NFR-PERF-01).
 */
export function ProfilePanel({
  averageScore,
  matchCount,
  bonus,
}: {
  averageScore: number;
  matchCount: number;
  bonus: number;
}) {
  const bonusLabel = bonus > 0 ? `+${formatPercent(bonus * 100)}` : "немає";

  return (
    <div className="pk-gradient-panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "var(--pk-space-4)",
        }}
      >
        <div>
          <div className="pk-metric-label">Середній бал НМТ</div>
          <div className="pk-metric">{formatNumber(averageScore)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="pk-metric-accent" style={{ font: "700 22px var(--pk-font-display)" }}>
            {formatNumber(matchCount)}
          </div>
          <div className="pk-metric-label">збігів</div>
        </div>
      </div>
      <div className="pk-metric-label" style={{ marginTop: "var(--pk-space-3)" }}>
        Бонус пільг:{" "}
        <b style={{ color: "#fff" }}>{bonusLabel}</b>
      </div>
    </div>
  );
}
