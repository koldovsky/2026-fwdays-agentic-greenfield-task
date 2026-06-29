"use client";
// @trace FR-CYCLE-06 NFR-A11Y-01

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/forms/Button";
import { Dialog } from "@/components/feedback/Dialog";
import { uk } from "@/lib/i18n/uk";
import { deleteCycle } from "../actions";

const t = uk.cycles;

/**
 * Delete-cycle affordance (FR-CYCLE-06). A ghost trigger opens a confirmation
 * Dialog; only on explicit confirm does it call the HR-only `deleteCycle`
 * action (which cascades to the cycle's dependent rows) and redirect to the
 * cycles list. Never a one-click delete.
 */
export function DeleteCycleButton({ cycleId }: { cycleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCycle({ cycleId });
      if (result.ok) {
        router.push("/cycles");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        {t.delete}
      </Button>
      <Dialog
        open={open}
        title={t.deleteConfirmTitle}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        actions={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t.form.cancel}
            </Button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              aria-busy={pending}
              className="focus-ring rounded-[var(--radius-md)] bg-[var(--danger-ink)] px-[var(--space-7)] py-[var(--space-5)] text-[var(--text-base)] font-[var(--weight-medium)] text-surface transition-colors duration-[var(--motion-fast)] disabled:opacity-60"
            >
              {pending ? t.deleting : t.deleteConfirm}
            </button>
          </>
        }
      >
        {t.deleteConfirmBody}
        {error !== null ? (
          <p role="alert" className="mt-[var(--space-4)] text-[var(--text-sm)] text-[var(--danger-ink)]">
            {error}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
