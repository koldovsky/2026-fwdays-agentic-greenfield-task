"use client";

import { formatNumber, formatPercent } from "@/app/lib/format";
import { getProgram } from "@/app/lib/programs";
import { categoryLabel, compareAdvice, type ScoredProgram } from "@/app/lib/recommend";
import { evaluate } from "@/app/lib/scoring";
import { EMPTY } from "@/app/lib/copy";
import type { ProfileApi } from "@/app/hooks/useProfile";

/** Build the evaluated list for the currently-compared ids, in selection order. */
function comparedPrograms(profile: ProfileApi): ScoredProgram[] {
  return profile.compare
    .map((id) => {
      const program = getProgram(id);
      if (!program) return null;
      return {
        program,
        evaluation: evaluate(program, profile.scores, profile.benefits, profile.elective),
      };
    })
    .filter((x): x is ScoredProgram => x !== null);
}

interface Row {
  label: string;
  cell: (s: ScoredProgram) => { text: string; color?: string; bold?: boolean };
}

const ROWS: Row[] = [
  {
    label: "Шанс",
    cell: (s) => {
      if (!s.evaluation.fits) {
        return { text: "—", color: "var(--pk-slate-400)", bold: true };
      }
      return {
        text: `${formatPercent(s.evaluation.chance)} · ${categoryLabel(s.evaluation)}`,
        color: `var(--pk-${s.evaluation.category})`,
        bold: true,
      };
    },
  },
  {
    label: "Діапазон",
    cell: (s) => ({
      text: s.evaluation.fits ? `${s.evaluation.band[0]}–${s.evaluation.band[1]} %` : "—",
    }),
  },
  { label: "Прохідний ’24", cell: (s) => ({ text: formatNumber(s.program.cutoffs[2024]) }) },
  {
    label: "Твій бал",
    cell: (s) => ({ text: formatNumber(s.evaluation.competitive, { maximumFractionDigits: 1 }) }),
  },
  { label: "Бюджетних місць", cell: (s) => ({ text: formatNumber(s.program.budgetSeats) }) },
  { label: "Контракт / рік", cell: (s) => ({ text: s.program.tuition }) },
  { label: "Місто", cell: (s) => ({ text: s.program.city }) },
  {
    label: "Гуртожиток",
    cell: (s) => ({
      text: s.program.dorm ? "так" : "ні",
      color: s.program.dorm ? "var(--pk-safe)" : "var(--pk-slate-400)",
    }),
  },
];

/**
 * Comparison view (comparison capability, FR-COMPARE-01): 2–3 programs side by
 * side across chance/band/category, cutoff, score, seats, cost, city, dorm,
 * plus a text recommendation. Empty state when fewer than 2 are selected.
 */
export function Comparison({ profile }: { profile: ProfileApi }) {
  const compared = comparedPrograms(profile);

  if (compared.length < 2) {
    return (
      <div className="pk-empty">
        <p className="pk-empty__title">{EMPTY.comparison.title}</p>
        <p className="pk-empty__text">{EMPTY.comparison.text}</p>
      </div>
    );
  }

  const advice = compareAdvice(compared);

  return (
    <section aria-label="Порівняння програм">
      <div style={{ overflowX: "auto" }}>
        <table className="pk-table">
          <caption className="pk-sr-only">
            Порівняння {compared.length} програм за шансом, прохідним балом, вартістю та містом
          </caption>
          <thead>
            <tr>
              <th scope="col">Показник</th>
              {compared.map((s) => (
                <th scope="col" key={s.program.id}>
                  {s.program.uni}
                  <br />
                  <span style={{ font: "500 12px var(--pk-font-text)", color: "var(--pk-navy-700)" }}>
                    {s.program.spec}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <td className="pk-cell-label">{row.label}</td>
                {compared.map((s) => {
                  const { text, color, bold } = row.cell(s);
                  return (
                    <td
                      key={s.program.id}
                      style={{ color, fontWeight: bold ? 700 : undefined }}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {advice && (
        <div
          style={{
            marginTop: "var(--pk-space-4)",
            background: "var(--pk-safe-bg)",
            border: "1px solid var(--pk-safe-lite)",
            borderRadius: "14px",
            padding: "16px 18px",
          }}
        >
          <div style={{ font: "700 13px var(--pk-font-text)", color: "var(--pk-safe-text)" }}>
            Порада застосунку
          </div>
          <p
            style={{
              font: "500 13.5px/1.55 var(--pk-font-text)",
              color: "var(--pk-safe-text)",
              marginTop: "6px",
            }}
          >
            {advice}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "var(--pk-space-4)" }}>
        {compared.map((s) => (
          <button
            key={s.program.id}
            type="button"
            className="pk-btn pk-btn--secondary pk-btn--sm"
            onClick={() => profile.toggleCompare(s.program.id)}
          >
            ✕ {s.program.uni} · {categoryLabel(s.evaluation)}
          </button>
        ))}
      </div>
    </section>
  );
}
