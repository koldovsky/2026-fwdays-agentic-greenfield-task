"use client";

// tailor-workspace view — route-level composition (FR-SHELL-01/02). Owns the
// run result + local bullet state (include-in-export toggles). The
// export-default rule (applyExportDefaults / BC-HONESTY-02 — grounded in,
// overclaim-risk out) is applied ONCE, inside runTailoringLoop
// (features/run-tailoring/lib/loop.ts), so `next.bullets` already carries the
// correct defaults; this view just seeds local toggle state from them rather
// than re-deriving it, keeping the loop the single owner of the invariant.
// It composes the two child widgets (checklist-panel + bullet-list) into the
// layout-only result-view widget through its `left` / `right` slots — so no
// widget imports another widget; the composition happens here at the view layer.
import { useMemo, useState } from "react";

import type { Bullet } from "@/entities/bullet";
import { TailoringForm, type TailoringRunResult } from "@/features/run-tailoring";
import { t } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";
import { BulletList } from "@/widgets/bullet-list";
import { ChecklistPanel, type ChecklistPanelRow } from "@/widgets/checklist-panel";
import { ResultView } from "@/widgets/result-view";

export interface TailorWorkspaceProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

export function TailorWorkspace({ locale = "ua" }: TailorWorkspaceProps) {
  const copy = t(locale);
  const [result, setResult] = useState<TailoringRunResult | null>(null);
  const [bullets, setBullets] = useState<Bullet[]>([]);

  const handleResult = (next: TailoringRunResult) => {
    setResult(next);
    // next.bullets already has export defaults applied by the loop
    // (BC-HONESTY-02) — copy (not re-derive) into local, mutable toggle state.
    setBullets([...next.bullets]);
  };

  const handleToggleInclude = (id: string) => {
    setBullets((prev) =>
      prev.map((bullet) =>
        bullet.id === id ? { ...bullet, includedInExport: !bullet.includedInExport } : bullet,
      ),
    );
  };

  const checklistRows: ChecklistPanelRow[] = useMemo(
    () =>
      result === null
        ? []
        : result.checklist.map((row) => ({
            requirement: row.requirement,
            status: row.item.status,
            rationale: row.item.rationale,
          })),
    [result],
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <p className="font-body text-base text-ink-soft leading-normal mb-8 max-w-2xl">
        {copy.workspace.lead}
      </p>

      <TailoringForm locale={locale} onResult={handleResult} />

      {result === null ? (
        <p className="font-body text-base text-ink-soft leading-normal mt-8 max-w-2xl">
          {copy.workspace.emptyState}
        </p>
      ) : (
        <div className="mt-8">
          <ResultView
            locale={locale}
            left={<ChecklistPanel score={result.matchScore} rows={checklistRows} locale={locale} />}
            right={
              <BulletList bullets={bullets} onToggleInclude={handleToggleInclude} locale={locale} />
            }
          />
        </div>
      )}
    </main>
  );
}
