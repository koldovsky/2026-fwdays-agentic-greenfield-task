"use client";

import { useEffect, useId, useRef } from "react";
import { formatNumber } from "@/app/lib/format";
import { honestyBandSentence } from "@/app/lib/copy";
import { getProgram } from "@/app/lib/programs";
import { adviceFor, categoryLabel, scoreBreakdown } from "@/app/lib/recommend";
import { evaluate } from "@/app/lib/scoring";
import type { ProfileApi } from "@/app/hooks/useProfile";
import { ChanceRing } from "./ChanceRing";

/** Scale a cutoff value (roughly 120–200) to a bar height in px. */
function barHeight(value: number): number {
  return Math.round(((value - 120) / 55) * 42) + 12;
}

/**
 * Program detail modal (program-detail capability, FR-DETAIL-01): the
 * "where the number comes from" view. Shows the competitive-score breakdown
 * (subject × weight + benefit) that sums to the score, the 3-year cutoff
 * history, category-appropriate advice, and the uncertainty band + disclaimer
 * (BC-HONESTY-01). Closes on Escape or overlay click; focuses the close button.
 */
export function DetailModal({
  programId,
  profile,
  onClose,
}: {
  programId: string;
  profile: ProfileApi;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const program = getProgram(programId);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!program) return null;

  const evaluation = evaluate(program, profile.scores, profile.benefits, profile.elective);
  const breakdown = scoreBreakdown(program, profile.scores, profile.benefits, profile.elective);
  const advice = adviceFor(program, evaluation);
  const saved = profile.isSaved(program.id);
  const inCompare = profile.inCompare(program.id);
  const years = [
    { label: `’22 · ${formatNumber(program.cutoffs[2022])}`, value: program.cutoffs[2022], hl: false },
    { label: `’23 · ${formatNumber(program.cutoffs[2023])}`, value: program.cutoffs[2023], hl: false },
    { label: `’24 · ${formatNumber(program.cutoffs[2024])}`, value: program.cutoffs[2024], hl: true },
  ];

  return (
    <div
      className="pk-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="pk-modal pk-scroll"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="pk-modal__close"
          onClick={onClose}
          aria-label="Закрити"
        >
          <span aria-hidden="true">✕</span>
        </button>

        <h2 id={titleId} className="pk-h3" style={{ paddingRight: "40px" }}>
          {program.uni}
        </h2>
        <p
          style={{
            font: "500 13.5px var(--pk-font-text)",
            color: "var(--pk-slate-500)",
            marginTop: "4px",
          }}
        >
          {program.spec} · {program.city} · бюджет
        </p>

        <div
          className="pk-card"
          style={{ display: "flex", alignItems: "center", gap: "18px", marginTop: "var(--pk-space-4)" }}
        >
          <ChanceRing
            chance={evaluation.chance}
            category={evaluation.category}
            categoryLabel={categoryLabel(evaluation)}
            fits={evaluation.fits}
            large
          />
          <div>
            <div style={{ font: "700 13px var(--pk-font-text)" }}>
              {categoryLabel(evaluation)}
            </div>
            {evaluation.fits ? (
              <p
                style={{
                  font: "600 12px var(--pk-font-text)",
                  color: "var(--pk-slate-500)",
                  marginTop: "4px",
                }}
              >
                Діапазон невизначеності: {evaluation.band[0]}–{evaluation.band[1]} %
              </p>
            ) : null}
            <p
              style={{
                font: "500 13px/1.55 var(--pk-font-text)",
                color: "var(--pk-slate-600)",
                marginTop: "5px",
              }}
            >
              {advice}
            </p>
          </div>
        </div>

        <p className="pk-label" style={{ margin: "var(--pk-space-5) 0 var(--pk-space-2)" }}>
          Як склався твій бал
        </p>
        <div
          style={{
            background: "var(--pk-surface)",
            border: "1px solid var(--pk-border)",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          {breakdown.map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 16px",
                font: "600 13px var(--pk-font-text)",
                borderBottom: "1px solid var(--pk-divider-2)",
              }}
            >
              <span style={{ color: "var(--pk-slate-600)" }}>{row.label}</span>
              <span>{formatNumber(row.value, { maximumFractionDigits: 1 })}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "13px 16px",
              font: "700 14px var(--pk-font-text)",
              background: "var(--pk-bg-screen)",
            }}
          >
            <span>Конкурсний бал</span>
            <span style={{ color: "var(--pk-safe)" }}>
              {formatNumber(evaluation.competitive, { maximumFractionDigits: 1 })}
            </span>
          </div>
        </div>

        <p className="pk-label" style={{ margin: "var(--pk-space-5) 0 var(--pk-space-3)" }}>
          Прохідний бал за роки
        </p>
        <div className="pk-bars">
          {years.map((year) => (
            <div className="pk-bars__col" key={year.label}>
              <div
                className={`pk-bars__bar${year.hl ? " pk-bars__bar--hl" : ""}`}
                style={{ height: `${barHeight(year.value)}px` }}
              />
              <div
                className="pk-bars__label"
                style={year.hl ? { color: "var(--pk-real-text)" } : undefined}
              >
                {year.label}
              </div>
            </div>
          ))}
        </div>
        <p
          style={{
            font: "500 12px/1.5 var(--pk-font-text)",
            color: "var(--pk-slate-400)",
            marginTop: "var(--pk-space-3)",
          }}
        >
          {evaluation.fits
            ? honestyBandSentence(evaluation.chance, evaluation.band[0], evaluation.band[1])
            : "Шанс для цієї програми не розраховується — обраний четвертий предмет НМТ не відповідає вимогам програми."}
        </p>

        <div style={{ display: "flex", gap: "10px", marginTop: "var(--pk-space-5)" }}>
          <button
            type="button"
            className="pk-btn pk-btn--secondary"
            aria-pressed={inCompare}
            onClick={() => profile.toggleCompare(program.id)}
          >
            <span aria-hidden="true">⇄</span> {inCompare ? "У порівнянні" : "Порівняти"}
          </button>
          <button
            type="button"
            className="pk-btn pk-btn--dark"
            aria-pressed={saved}
            style={{ flex: 1 }}
            onClick={() => profile.toggleSave(program.id)}
          >
            {saved ? "★ У списку" : "★ Додати в список"}
          </button>
        </div>
      </div>
    </div>
  );
}
