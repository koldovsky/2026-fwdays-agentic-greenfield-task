"use client";

// GDPR "Download my data" control (NFR-GDPR-01, NFR-OBS-01). The old surface was
// a plain `<a href="/api/account/export">`, so any non-200 (e.g. unset prod env
// -> 500 export_failed) navigated the browser to raw JSON with no in-page error.
// This is a fetch-based download instead: it reads the response as a blob, hands
// it to a synthetic anchor, and surfaces a calm inline error on any failure — the
// trigger itself never carries an href and never navigates. Two-phase state
// machine mirrors DeleteAccountButton (idle | pending | error).
import { useState } from "react";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";

export interface ExportDataButtonProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

type Phase = "idle" | "pending" | "error";

const EXPORT_FILENAME = "vouch-export.json";

export function ExportDataButton({ locale = "ua" }: ExportDataButtonProps) {
  const copy = t(locale).profile;
  const [phase, setPhase] = useState<Phase>("idle");

  async function handleExport() {
    setPhase("pending");
    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) {
        setPhase("error");
        return;
      }
      // Read the body as a blob and download it client-side — no navigation, so a
      // later 500 can never replace the page with raw JSON (NFR-OBS-01).
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = EXPORT_FILENAME;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setPhase("idle");
    } catch {
      setPhase("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExport}
          disabled={phase === "pending"}
        >
          {phase === "pending" ? copy.exportPending : copy.exportAction}
        </Button>
      </div>
      {phase === "error" && (
        <p role="alert" className="text-sm text-gap-text">
          {copy.exportError}
        </p>
      )}
    </div>
  );
}
