"use client";

// apps/dashboard/components/ds — DeleteLeadButton (dashboard tasks.md
// §6.8, `@trace NFR-PRIV-02`). The "Delete lead" admin action's two-step
// confirmation: a SINGLE click never deletes anything — it only opens an
// explicit confirmation step; confirming calls `DELETE /api/leads/:id`
// (tasks.md §5.6); dismissing leaves the lead exactly as before. A failed
// delete surfaces a deterministic inline error (never a raw 500), and the
// administrator can retry (the confirm step stays open on failure).

import { useState } from "react";
import { Button } from "./Button.tsx";

export interface DeleteLeadButtonProps {
  leadId: number;
  onDeleted?: () => void;
}

const FALLBACK_ERROR = "Не вдалося видалити ліда. Спробуйте ще раз.";

export function DeleteLeadButton({ leadId, onDeleted }: DeleteLeadButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          body !== null && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : FALLBACK_ERROR;
        setError(message);
        return; // stays open (confirming=true) so the administrator can retry
      }
      setConfirming(false);
      onDeleted?.();
    } catch {
      setError(FALLBACK_ERROR);
    } finally {
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="danger" iconLeft="delete" onClick={() => setConfirming(true)}>
        Видалити ліда
      </Button>
    );
  }

  return (
    <div
      data-testid="delete-lead-confirm"
      className="flex flex-col gap-2 rounded-md border p-3"
      style={{ borderColor: "var(--status-declined-solid)", backgroundColor: "var(--status-declined-bg)" }}
    >
      <p className="text-sm" style={{ color: "var(--status-declined-fg)" }}>
        Точно видалити цього ліда? Заявки та бронювання також будуть видалені — це незворотна дія.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" disabled={pending} onClick={() => void handleConfirm()}>
          Так, видалити
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
        >
          Скасувати
        </Button>
      </div>
      {error !== null ? (
        <p role="status" aria-live="polite" className="text-sm" style={{ color: "var(--status-declined-fg)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
