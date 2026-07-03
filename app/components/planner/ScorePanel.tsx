"use client";

import { formatNumber } from "@/app/lib/format";
import { BENEFITS } from "@/app/lib/programs";
import { SCORE_MAX, SCORE_MIN } from "@/app/lib/scoring";
import { ELECTIVE_SUBJECTS, REQUIRED_SUBJECTS } from "@/app/lib/types";
import type { ProfileApi } from "@/app/hooks/useProfile";
import type { SubjectKey } from "@/app/lib/types";

/**
 * Score input (score-input capability): the elective (4th subject) picker,
 * four NMT score sliders (FR-INPUT-01/02), and the benefit toggles
 * (FR-INPUT-03). Every change flows straight into recomputation (NFR-PERF-01)
 * and persists (FR-STATE-01) via the profile store.
 */
export function ScorePanel({ profile }: { profile: ProfileApi }) {
  const rows: { key: SubjectKey; label: string }[] = [
    { key: "ukr", label: REQUIRED_SUBJECTS.ukr },
    { key: "math", label: REQUIRED_SUBJECTS.math },
    { key: "hist", label: REQUIRED_SUBJECTS.hist },
    { key: "eng", label: profile.elective },
  ];

  return (
    <div className="pk-card">
      <p className="pk-label">Бали НМТ</p>

      <p className="pk-label" style={{ marginTop: "var(--pk-space-4)" }}>
        Четвертий предмет
      </p>
      <div
        role="group"
        aria-label="Четвертий предмет НМТ"
        style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "var(--pk-space-2)" }}
      >
        {ELECTIVE_SUBJECTS.map((subject) => {
          const active = profile.elective === subject;
          return (
            <button
              key={subject}
              type="button"
              className="pk-chip"
              aria-pressed={active}
              onClick={() => profile.setElective(subject)}
            >
              {subject}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--pk-space-4)",
          marginTop: "var(--pk-space-5)",
        }}
      >
        {rows.map((row) => {
          const id = `score-${row.key}`;
          return (
            <div key={row.key}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <label htmlFor={id} style={{ font: "600 13.5px var(--pk-font-text)" }}>
                  {row.label}
                </label>
                <span style={{ font: "600 16px var(--pk-font-display)" }}>
                  {formatNumber(profile.scores[row.key])}
                </span>
              </div>
              <input
                id={id}
                className="pk-range"
                type="range"
                min={SCORE_MIN}
                max={SCORE_MAX}
                value={profile.scores[row.key]}
                aria-valuetext={`${profile.scores[row.key]} балів`}
                onChange={(e) => profile.setScore(row.key, Number(e.target.value))}
                style={{ width: "100%", marginTop: "9px" }}
              />
            </div>
          );
        })}
      </div>

      <div
        style={{
          height: "1px",
          background: "var(--pk-divider)",
          margin: "var(--pk-space-5) 0 var(--pk-space-4)",
        }}
      />

      <p className="pk-label" style={{ marginBottom: "var(--pk-space-3)" }}>
        Пільги
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
        {BENEFITS.map((benefit) => {
          const on = profile.benefits[benefit.key];
          return (
            <button
              key={benefit.key}
              type="button"
              className={`pk-toggle-row${on ? " pk-toggle-row--on" : ""}`}
              aria-pressed={on}
              onClick={() => profile.toggleBenefit(benefit.key)}
              style={{ width: "100%", textAlign: "left" }}
            >
              <span>
                <span style={{ display: "block", font: "600 13.5px var(--pk-font-text)" }}>
                  {benefit.label}
                </span>
                <span
                  style={{
                    display: "block",
                    font: "500 11.5px/1.4 var(--pk-font-text)",
                    color: "var(--pk-slate-500)",
                    marginTop: "2px",
                  }}
                >
                  {benefit.desc}
                </span>
              </span>
              <span className="pk-toggle-row__box" aria-hidden="true">
                {on ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
