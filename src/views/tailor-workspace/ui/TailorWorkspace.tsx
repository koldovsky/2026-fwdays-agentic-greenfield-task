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
//
// Paywall composition (add-payments-emulator task 2.1, FR-PAYWALL-01): the
// view opens widgets/paywall at the two gated points — the export CTA (when
// the server-resolved entitlement is not paid) and a `rate_limited` run
// (signalled by the form; the limit itself lives server-side, NFR-COST-02).
// No limit or entitlement logic is duplicated here.
import { useMemo, useState } from "react";

import type { Bullet } from "@/entities/bullet";
import { TailoringForm, type TailoringRunResult } from "@/features/run-tailoring";
import { UploadCvDropzone } from "@/features/upload-cv";
import { t } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";
import { BulletList } from "@/widgets/bullet-list";
import { ChecklistPanel, type ChecklistPanelRow } from "@/widgets/checklist-panel";
import { Paywall, type PaywallReason } from "@/widgets/paywall";
import { ResultView } from "@/widgets/result-view";
import { Button } from "@/shared/ui";
import { buildExportText } from "../lib/export-text";

export interface TailorWorkspaceProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /**
   * Server-resolved paid entitlement (FR-PAYWALL-01): true unlocks export.
   * Resolved by the route from the subscription state — never client-derived.
   */
  readonly paid?: boolean;
  /** Export seam — injectable in tests; defaults to a plain-text download. */
  readonly onExport?: (text: string) => void;
}

/** Default export: download the included bullets as a plain-text file. */
function downloadTextFile(text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "vouch-resume.txt";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function TailorWorkspace({
  locale = "ua",
  paid = false,
  onExport = downloadTextFile,
}: TailorWorkspaceProps) {
  const copy = t(locale);
  const [result, setResult] = useState<TailoringRunResult | null>(null);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  // Which gated action opened the paywall, if any (FR-PAYWALL-01).
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  // CV text is lifted here (add-upload-cv task 4.2) so the dropzone's
  // extracted text lands in the form's editable textarea for review before
  // tailoring — upload never bypasses review (FR-CV-01, FR-CV-03 confirm
  // half); a re-upload simply replaces it.
  const [cvText, setCvText] = useState("");

  const handleResult = (next: TailoringRunResult) => {
    setResult(next);
    // next.bullets already has export defaults applied by the loop
    // (BC-HONESTY-02) — copy (not re-derive) into local, mutable toggle state.
    setBullets([...next.bullets]);
    setPaywall(null);
  };

  const handleToggleInclude = (id: string) => {
    setBullets((prev) =>
      prev.map((bullet) =>
        bullet.id === id ? { ...bullet, includedInExport: !bullet.includedInExport } : bullet,
      ),
    );
  };

  const handleExport = () => {
    // The gate, not the limit: entitlement was resolved server-side.
    if (!paid) {
      setPaywall("export");
      return;
    }
    onExport(buildExportText(bullets));
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

      <div className="mb-6">
        <UploadCvDropzone locale={locale} onExtracted={setCvText} />
      </div>

      <TailoringForm
        locale={locale}
        onResult={handleResult}
        cvText={cvText}
        onCvTextChange={setCvText}
        onRateLimited={() => setPaywall("tailoring-limit")}
      />

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
          <div className="mt-6">
            <Button label={copy.workspace.exportAction} size="md" onClick={handleExport} />
          </div>
        </div>
      )}

      {paywall !== null && (
        <div className="mt-8">
          <Paywall reason={paywall} locale={locale} onDismiss={() => setPaywall(null)} />
        </div>
      )}
    </main>
  );
}
