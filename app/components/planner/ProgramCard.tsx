"use client";

import { formatNumber } from "@/app/lib/format";
import type { ProfileApi } from "@/app/hooks/useProfile";
import type { ScoredProgram } from "@/app/lib/recommend";
import { cardSummary, categoryLabel } from "@/app/lib/recommend";
import { ChanceRing } from "./ChanceRing";
import { CategoryPill } from "./CategoryPill";

const OPEN_BUTTON_RESET = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  font: "inherit",
  color: "inherit",
} as const;

/**
 * A recommendation card (recommendations capability): university, program·city,
 * category pill, chance ring + uncertainty band (FR-SCORE-02, BC-HONESTY-01),
 * last year's cutoff vs the applicant's score, and save/compare actions.
 * The header opens the detail modal.
 */
export function ProgramCard({
  scored,
  profile,
  onOpen,
}: {
  scored: ScoredProgram;
  profile: ProfileApi;
  onOpen: (id: string) => void;
}) {
  const { program, evaluation } = scored;
  const saved = profile.isSaved(program.id);
  const inCompare = profile.inCompare(program.id);
  const bandLabel = evaluation.fits
    ? `${evaluation.band[0]}–${evaluation.band[1]} %`
    : "не підходить";

  return (
    <article className="pk-card pk-card--hover">
      <button
        type="button"
        style={OPEN_BUTTON_RESET}
        onClick={() => onOpen(program.id)}
        aria-label={`Детальніше: ${program.uni}, ${program.spec}`}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <div style={{ font: "700 16px var(--pk-font-text)", lineHeight: 1.25 }}>
              {program.uni}
            </div>
            <div
              style={{
                font: "500 13px var(--pk-font-text)",
                color: "var(--pk-slate-500)",
                marginTop: "3px",
              }}
            >
              {program.spec} · {program.city}
            </div>
            <div style={{ marginTop: "9px" }}>
              <CategoryPill evaluation={evaluation} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              flex: "none",
            }}
          >
            <ChanceRing
              chance={evaluation.chance}
              category={evaluation.category}
              categoryLabel={categoryLabel(evaluation)}
              fits={evaluation.fits}
            />
            <div
              style={{
                font: "600 9px var(--pk-font-text)",
                color: "var(--pk-slate-400)",
                whiteSpace: "nowrap",
              }}
            >
              {bandLabel}
            </div>
          </div>
        </div>
      </button>

      <div className="pk-card__footer">
        <span style={{ font: "600 11.5px var(--pk-font-text)", color: "var(--pk-slate-400)" }}>
          Прохідний ’24{" "}
          <b style={{ color: "var(--pk-slate-600)" }}>{formatNumber(program.cutoffs[2024])}</b> · ти{" "}
          <b style={{ color: "var(--pk-slate-600)" }}>
            {formatNumber(evaluation.competitive, { maximumFractionDigits: 1 })}
          </b>
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className={`pk-icon-btn${inCompare ? " pk-icon-btn--active-compare" : ""}`}
            aria-pressed={inCompare}
            aria-label={inCompare ? `Прибрати з порівняння: ${program.uni}` : `Додати до порівняння: ${program.uni}`}
            onClick={() => profile.toggleCompare(program.id)}
          >
            <span aria-hidden="true">⇄</span>
          </button>
          <button
            type="button"
            className={`pk-icon-btn${saved ? " pk-icon-btn--active-star" : ""}`}
            aria-pressed={saved}
            aria-label={saved ? `Прибрати зі списку: ${program.uni}` : `Зберегти у список: ${program.uni}`}
            onClick={() => profile.toggleSave(program.id)}
          >
            <span aria-hidden="true">{saved ? "★" : "☆"}</span>
          </button>
        </div>
      </div>

      {/* Screen-reader summary keeps the chance % + band available in text. */}
      <span className="pk-sr-only">{cardSummary(evaluation)}</span>
    </article>
  );
}
