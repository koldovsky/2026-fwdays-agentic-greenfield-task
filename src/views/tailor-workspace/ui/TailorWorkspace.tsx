"use client";

// tailor-workspace view — route-level composition (FR-SHELL-01/02). Owns the
// local bullet state (include-in-export toggles), seeded from the stub Tailoring
// fixture via the entity export-default rule (applyExportDefaults / BC-HONESTY-02).
// It composes the two child widgets (checklist-panel + bullet-list) into the
// layout-only result-view widget through its `left` / `right` slots — so no
// widget imports another widget; the composition happens here at the view layer.
import { useMemo, useState } from "react";

import { applyExportDefaults, type Bullet } from "@/entities/bullet";
import { t } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";
import { BulletList } from "@/widgets/bullet-list";
import { ChecklistPanel, type ChecklistPanelRow } from "@/widgets/checklist-panel";
import { ResultView } from "@/widgets/result-view";

import { tailoringFixture } from "../lib/fixture";

export interface TailorWorkspaceProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

/** Map the scored fixture checklist onto the checklist-panel row shape. */
const checklistRows: ChecklistPanelRow[] = tailoringFixture.checklist.map((row) => ({
  requirement: row.requirement,
  status: row.item.status,
  rationale: row.item.rationale,
}));

export function TailorWorkspace({ locale = "ua" }: TailorWorkspaceProps) {
  const copy = t(locale);

  // Seed bullet state with the export defaults (grounded in, overclaim-risk out).
  const [bullets, setBullets] = useState<Bullet[]>(() =>
    applyExportDefaults(
      tailoringFixture.bullets.map((bullet) => ({
        id: bullet.id,
        text: bullet.text,
        grounding: bullet.grounding,
        includedInExport: bullet.includedInExport,
      })),
    ),
  );

  const handleToggleInclude = (id: string) => {
    setBullets((prev) =>
      prev.map((bullet) =>
        bullet.id === id ? { ...bullet, includedInExport: !bullet.includedInExport } : bullet,
      ),
    );
  };

  const checklist = useMemo(
    () => (
      <ChecklistPanel score={tailoringFixture.matchScore} rows={checklistRows} locale={locale} />
    ),
    [locale],
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <p className="font-body text-base text-ink-soft leading-normal mb-8 max-w-2xl">
        {copy.workspace.lead}
      </p>

      <ResultView
        locale={locale}
        left={checklist}
        right={<BulletList bullets={bullets} onToggleInclude={handleToggleInclude} locale={locale} />}
      />
    </main>
  );
}
