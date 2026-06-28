"use client";
// @trace FR-FORM-02 NFR-A11Y-01

import { useEffect, useRef } from "react";
import { uk } from "@/lib/i18n/uk";

const t = uk.respondent;

type Props = {
  questionId: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

/**
 * Auto-growing textarea for an "open" question (FR-FORM-02). The grow
 * technique (design.md "Auto-growing textarea implementation"): reset
 * `style.height` to "auto" then set it to `scrollHeight`, applied on
 * `onInput` AND on mount, so a restored multi-line saved value renders
 * already expanded, not clipped until the first keystroke.
 */
export function OpenAnswerField({ questionId, value, onChange, error }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function grow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    if (textareaRef.current !== null) {
      grow(textareaRef.current);
    }
    // Re-run when the question (and thus the restored value) changes, so a
    // resumed multi-line answer is already expanded on first paint.
  }, [questionId]);

  function handleInput(event: React.FormEvent<HTMLTextAreaElement>) {
    grow(event.currentTarget);
  }

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <textarea
        ref={textareaRef}
        aria-label={t.formOpenLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onInput={handleInput}
        rows={3}
        className="focus-ring w-full resize-none rounded-[var(--radius-md)] border border-line-soft bg-surface p-[var(--space-5)] text-[var(--text-base)] text-ink"
      />
      {error !== undefined ? (
        <p role="alert" className="text-[var(--text-sm)] text-[var(--danger-ink)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
