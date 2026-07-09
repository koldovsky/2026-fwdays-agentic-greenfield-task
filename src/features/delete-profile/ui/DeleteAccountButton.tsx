"use client";

// Delete-account control (FR-CV-05, NFR-GDPR-02): a two-step confirm that calls
// DELETE /api/account (hard delete, cascade) and then does a full navigation to
// "/" — the route clears the session cookie in its response, so a hard load
// drops the now-orphaned client session rather than leaving a stale island.
// Destructive + irreversible, so it never fires on a single click.
import { useState } from "react";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";

export interface DeleteAccountButtonProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

type Phase = "idle" | "confirm" | "pending" | "error";

export function DeleteAccountButton({ locale = "ua" }: DeleteAccountButtonProps) {
  const copy = t(locale).profile;
  const [phase, setPhase] = useState<Phase>("idle");

  async function handleDelete() {
    setPhase("pending");
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) {
        setPhase("error");
        return;
      }
      // Session cookie was cleared server-side; a hard load returns anonymous.
      window.location.assign("/");
    } catch {
      setPhase("error");
    }
  }

  if (phase === "idle" || phase === "error") {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" onClick={() => setPhase("confirm")}>
          {copy.deleteAction}
        </Button>
        {phase === "error" && (
          <p role="alert" className="text-sm text-gap-text">
            {copy.deleteError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-hairline bg-surface-warm p-4">
      <p className="text-sm text-ink">{copy.deleteConfirmPrompt}</p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPhase("idle")}
          disabled={phase === "pending"}
        >
          {copy.deleteCancelAction}
        </Button>
        <Button variant="dark" size="sm" onClick={handleDelete} disabled={phase === "pending"}>
          {phase === "pending" ? copy.deletePending : copy.deleteConfirmAction}
        </Button>
      </div>
    </div>
  );
}
