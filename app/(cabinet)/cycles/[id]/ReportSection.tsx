"use client";
// @trace FR-REPORT-01 FR-REPORT-03 FR-REPORT-04 BC-BRAND-02 NFR-A11Y-02

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/forms/Button";
import { uk } from "@/lib/i18n/uk";
import type { SummaryShape } from "@/lib/ai/summary/schema";
import { draftSummary } from "./report-actions";

const t = uk.cycles.report;

/**
 * The AI summary section on the cycle detail (FR-REPORT-01/03/04). When a
 * summary is stored it renders read-only as a typeset serif document — no edit,
 * approve, lock, or version controls (out of scope). Otherwise, for a `done`
 * cycle, it offers "Draft summary" with inline progress (the button stays
 * responsive, never frozen); a second click while running is ignored. For a
 * non-`done` cycle it shows a short explanation instead of the action.
 */
export function ReportSection({
  cycleId,
  isDone,
  summary,
}: {
  cycleId: string;
  isDone: boolean;
  summary: SummaryShape | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (summary !== null) {
    return <ReportView summary={summary} />;
  }

  function handleDraft() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await draftSummary({ cycleId });
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <section>
      <h2 className="mb-[var(--space-5)] text-[var(--text-md)] font-[var(--weight-medium)] text-ink">
        {t.title}
      </h2>
      {isDone ? (
        <div className="flex flex-col gap-[var(--space-5)]">
          <Button type="button" onClick={handleDraft} disabled={pending} aria-busy={pending}>
            {pending ? t.drafting : t.draft}
          </Button>
          {error !== null ? (
            <p role="alert" className="text-[var(--text-sm)] text-[var(--danger-ink)]">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-[var(--text-sm)] text-ink-muted">{t.onlyWhenDone}</p>
      )}
    </section>
  );
}

/** Read-only typeset render of a stored summary (BC-BRAND-02, serif body). */
function ReportView({ summary }: { summary: SummaryShape }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-line-soft bg-surface p-[var(--space-8)] font-[family-name:var(--font-serif)]">
      <h2 className="mb-[var(--space-3)] text-[var(--text-serif-h)] font-[var(--weight-medium)] text-ink">
        {t.title}
      </h2>
      <p className="mb-[var(--space-7)] font-[family-name:var(--font-ui)] text-[var(--text-sm)] text-ink-muted">
        {t.readOnlyNote}
      </p>

      <ReportList title={t.strengths} items={summary.strengths} />
      <ReportList title={t.growthAreas} items={summary.growthAreas} />

      {summary.quotes.length > 0 ? (
        <div className="mt-[var(--space-7)]">
          <h3 className="mb-[var(--space-4)] font-[family-name:var(--font-ui)] text-[var(--text-xs)] font-[var(--weight-medium)] uppercase tracking-wide text-ink-muted">
            {t.quotes}
          </h3>
          <ul className="flex flex-col gap-[var(--space-5)]">
            {summary.quotes.map((quote, index) => (
              <li
                key={index}
                className="border-l-2 border-line-strong pl-[var(--space-6)] text-[var(--text-serif)] text-ink"
              >
                {quote.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-[var(--space-6)]">
      <h3 className="mb-[var(--space-4)] font-[family-name:var(--font-ui)] text-[var(--text-xs)] font-[var(--weight-medium)] uppercase tracking-wide text-ink-muted">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-[var(--text-serif)] text-ink-muted">{t.emptySection}</p>
      ) : (
        <ul className="flex list-disc flex-col gap-[var(--space-3)] pl-[var(--space-7)] text-[var(--text-serif)] leading-[var(--leading-normal)] text-ink">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
