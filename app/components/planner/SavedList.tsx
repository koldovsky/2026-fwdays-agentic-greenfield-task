"use client";

import { formatPercent } from "@/app/lib/format";
import { getProgram } from "@/app/lib/programs";
import { categoryLabel } from "@/app/lib/recommend";
import { evaluate } from "@/app/lib/scoring";
import { STATUS_MODIFIER } from "@/app/lib/status";
import { EMPTY } from "@/app/lib/copy";
import type { ProfileApi } from "@/app/hooks/useProfile";

/**
 * Saved shortlist + application-status tracking (shortlist capability,
 * FR-LIST-01/02). Rows are ordered by priority; clicking a status badge
 * advances it through the five stages (FR-LIST-02). List + statuses persist
 * across reload (FR-STATE-01). Empty state when nothing is saved (FR-UX-01).
 */
export function SavedList({
  profile,
  onOpen,
}: {
  profile: ProfileApi;
  onOpen: (id: string) => void;
}) {
  const ids = Object.keys(profile.saved).sort(
    (a, b) => profile.saved[a].priority - profile.saved[b].priority,
  );

  if (ids.length === 0) {
    return (
      <div className="pk-empty">
        <p className="pk-empty__title">{EMPTY.saved.title}</p>
        <p className="pk-empty__text">{EMPTY.saved.text}</p>
      </div>
    );
  }

  return (
    <section aria-label="Збережені програми">
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
        {ids.map((id) => {
          const program = getProgram(id);
          if (!program) return null;
          const evaluation = evaluate(program, profile.scores, profile.benefits, profile.elective);
          const entry = profile.saved[id];
          return (
            <li
              key={id}
              className="pk-card"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px" }}
            >
              <button
                type="button"
                onClick={() => onOpen(id)}
                aria-label={`Детальніше: ${program.uni}, ${program.spec}`}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  textAlign: "left",
                  cursor: "pointer",
                  font: "inherit",
                  color: "inherit",
                }}
              >
                <div style={{ font: "700 15px var(--pk-font-text)" }}>{program.uni}</div>
                <div
                  style={{
                    font: "500 13px var(--pk-font-text)",
                    color: "var(--pk-slate-500)",
                    marginTop: "2px",
                  }}
                >
                  {program.spec} · {program.city} · шанс{" "}
                  <b style={{ color: evaluation.fits ? `var(--pk-${evaluation.category})` : "var(--pk-slate-400)" }}>
                    {evaluation.fits ? formatPercent(evaluation.chance) : "—"}
                  </b>
                </div>
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <button
                  type="button"
                  className={`pk-status pk-status--${STATUS_MODIFIER[entry.status]}`}
                  onClick={() => profile.advanceStatus(id)}
                  aria-label={`Статус: ${entry.status}. Натисніть, щоб перевести на наступний етап.`}
                >
                  {entry.status}
                </button>
                <button
                  type="button"
                  onClick={() => profile.toggleSave(id)}
                  aria-label={`Прибрати зі списку: ${program.uni}`}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    font: "600 14px var(--pk-font-text)",
                    color: "var(--pk-dream)",
                  }}
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </div>

              <span className="pk-sr-only">
                Категорія {categoryLabel(evaluation)}. Пріоритет {entry.priority}.
              </span>
            </li>
          );
        })}
      </ul>

      <p style={{ font: "500 12px var(--pk-font-text)", color: "var(--pk-slate-400)", marginTop: "var(--pk-space-3)" }}>
        Клікни на статус, щоб провести заяву по етапах: Збережено → Подано → Розглядається → Рекомендовано → Зараховано.
      </p>
    </section>
  );
}
