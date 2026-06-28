"use client";
// @trace FR-FORM-02 NFR-A11Y-01

import { uk } from "@/lib/i18n/uk";
import type { Anchor } from "@/lib/schemas/template";

type Props = {
  questionId: string;
  anchors: ReadonlyArray<Anchor>;
  value: number | null;
  onChange: (value: number) => void;
  error?: string;
};

/**
 * Vertical, labelled, single-select anchor list for a "scale" question
 * (FR-FORM-02). Anchors render in their defined snapshot order — never
 * reordered client-side. Each anchor's LABEL TEXT is the clickable control
 * (no bare numeric 1-5 row). Controlled by `value`/`onChange`, not internal
 * uncontrolled state, so a different selection always deselects the
 * previous one.
 */
export function ScaleAnswerField({ questionId, anchors, value, onChange, error }: Props) {
  const t = uk.respondent;

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <fieldset className="flex flex-col gap-[var(--space-3)]">
        <legend className="sr-only">{t.formScaleLabel}</legend>
        {anchors.map((anchor) => {
          const selected = value === anchor.value;
          return (
            <button
              key={anchor.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={anchor.label}
              name={`scale-${questionId}`}
              onClick={() => onChange(anchor.value)}
              className={`focus-ring w-full rounded-[var(--radius-md)] border px-[var(--space-6)] py-[var(--space-5)] text-left text-[var(--text-base)] transition-colors duration-[var(--motion-fast)] ${
                selected
                  ? "border-[var(--accent)] bg-[var(--green-tint-2)] text-ink"
                  : "border-line-soft bg-surface text-ink hover:bg-[var(--line-faint)]"
              }`}
            >
              {anchor.label}
            </button>
          );
        })}
      </fieldset>
      {error !== undefined ? (
        <p role="alert" className="text-[var(--text-sm)] text-[var(--danger-ink)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
