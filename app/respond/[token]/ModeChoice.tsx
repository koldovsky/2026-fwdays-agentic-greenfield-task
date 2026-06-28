"use client";
// @trace FR-RESP-01 FR-RESP-02

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uk } from "@/lib/i18n/uk";
import { chooseMode } from "./actions";

const t = uk.respondent;

type Props = {
  token: string;
  subjectFirstName: string;
  methodology: string;
  deadline: Date;
};

/**
 * Mode-choice screen (FR-RESP-02). Shown when `Cycle.mode` is unset — only
 * the read-only question preview is withheld until a mode is chosen (design
 * Decision 5); the intro (who/what/deadline) and confidentiality note are
 * always shown per FR-RESP-01. Only the opaque `token` is passed to the
 * server action, never the cycle id (BC-PRIVACY-02).
 */
export function ModeChoice({ token, subjectFirstName, methodology, deadline }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingMode, setPendingMode] = useState<"form" | "interview" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChoose(mode: "form" | "interview") {
    setError(null);
    setPendingMode(mode);
    startTransition(async () => {
      const result = await chooseMode({ token, mode });
      if (result.ok) {
        router.refresh();
        return;
      }
      setError(result.error);
      setPendingMode(null);
    });
  }

  const greeting = t.greeting.replace("{name}", subjectFirstName);
  const deadlineDate = deadline.toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl px-[var(--space-9)] py-[var(--space-10)]">
      <h1 className="font-[var(--weight-semibold)] text-ink">{greeting}</h1>

      <dl className="mt-[var(--space-6)] grid grid-cols-2 gap-x-[var(--space-9)] gap-y-[var(--space-4)] text-[var(--text-sm)]">
        <div>
          <dt className="text-ink-muted">{t.methodology}</dt>
          <dd className="mt-[var(--space-1)] text-ink">{methodology}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{t.deadline}</dt>
          <dd className="mt-[var(--space-1)] text-ink">{deadlineDate}</dd>
        </div>
      </dl>

      <p className="mt-[var(--space-6)] text-ink-muted">{t.confidentiality}</p>

      <h2 className="mt-[var(--space-8)] font-[var(--weight-medium)] text-ink">
        {t.modeChoiceTitle}
      </h2>

      <div className="mt-[var(--space-8)] grid grid-cols-1 gap-[var(--space-5)] sm:grid-cols-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => handleChoose("form")}
          className="focus-ring rounded-[var(--radius-lg)] border border-line-soft bg-surface p-[var(--space-7)] text-left disabled:opacity-60"
        >
          <p className="text-[var(--text-base)] font-[var(--weight-medium)] text-ink">
            {pending && pendingMode === "form" ? t.modeChoosing : t.modeForm}
          </p>
          <p className="mt-[var(--space-2)] text-[var(--text-xs)] text-ink-muted">
            {t.modeFormHint}
          </p>
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => handleChoose("interview")}
          className="focus-ring rounded-[var(--radius-lg)] border border-line-soft bg-surface p-[var(--space-7)] text-left disabled:opacity-60"
        >
          <p className="text-[var(--text-base)] font-[var(--weight-medium)] text-ink">
            {pending && pendingMode === "interview" ? t.modeChoosing : t.modeInterview}
          </p>
          <p className="mt-[var(--space-2)] text-[var(--text-xs)] text-ink-muted">
            {t.modeInterviewHint}
          </p>
        </button>
      </div>

      {error !== null ? (
        <p role="alert" className="mt-[var(--space-6)] text-[var(--text-sm)] text-[var(--danger-ink)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
