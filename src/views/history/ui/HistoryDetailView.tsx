"use client";

// History detail view (add-tailoring-history, FR-HISTORY-02). Re-opens a stored
// tailoring in the SAME result-view widgets the live flow uses. Client-only
// because it owns the include-toggle state; edits are local (review mode) — this
// view does not re-persist, since a re-run against a fresh model pass is out of
// scope for this change.
import Link from "next/link";
import { useMemo, useState } from "react";

import type { Bullet } from "@/entities/bullet";
import type { TailoringRecord } from "@/shared/lib/db";
import { t, type Locale } from "@/shared/lib/i18n";
import { BulletList } from "@/widgets/bullet-list";
import { ChecklistPanel } from "@/widgets/checklist-panel";
import { ResultView } from "@/widgets/result-view";

import { toBullets, toChecklistRows } from "../lib/reopen";

export interface HistoryDetailViewProps {
  readonly record: TailoringRecord;
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

export function HistoryDetailView({ record, locale = "ua" }: HistoryDetailViewProps) {
  const copy = t(locale).history;
  const rows = useMemo(() => toChecklistRows(record), [record]);
  const [bullets, setBullets] = useState<Bullet[]>(() => toBullets(record));

  const handleToggleInclude = (id: string) => {
    setBullets((prev) =>
      prev.map((bullet) =>
        bullet.id === id ? { ...bullet, includedInExport: !bullet.includedInExport } : bullet,
      ),
    );
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <Link
        href="/history"
        className="font-body text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {copy.backToList}
      </Link>
      <h1 className="mt-4 font-display text-3xl tracking-tight text-ink">
        {record.jobTitle ?? copy.untitled}
      </h1>
      <p className="mt-2 font-body text-base text-ink-soft">{copy.detailLead}</p>

      <div className="mt-8">
        <ResultView
          locale={locale}
          left={<ChecklistPanel score={record.matchScore ?? 0} rows={rows} locale={locale} />}
          right={<BulletList bullets={bullets} onToggleInclude={handleToggleInclude} locale={locale} />}
        />
      </div>
    </main>
  );
}
