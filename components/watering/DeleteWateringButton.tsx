"use client";

// Delete-with-confirm control for a SINGLE watering (design D6, SC-5). Never a
// one-click silent delete: the first click reveals an explicit confirm step (a
// confirm button + a cancel); only confirming invokes the action. Cancel leaves
// the row intact. On success the page refreshes; a not-found / generic failure
// surfaces inline (and a not-found also refreshes to reconcile the stale list).
//
// @trace FR-WATER-05
// @trace SC-5
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { Button } from "@/components/ui/Button";
import { uk } from "@/lib/i18n/uk";
import { deleteWateringAction } from "@/lib/watering/actions";

export function DeleteWateringButton({
  id,
  plantId,
}: {
  id: number;
  plantId: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteWateringAction(id, plantId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.formError ?? uk.errors.generic);
        setConfirming(false);
        // A not-found result means the row was already deleted elsewhere (e.g. a
        // second tab) and the on-screen list is stale — refresh so the rendered
        // rows reconcile with server state while the message stays visible.
        if (result.formError === uk.watering.notFound) {
          router.refresh();
        }
      }
    });
  }

  if (!confirming) {
    return (
      <div>
        <FormErrorBanner message={error} />
        <Button
          variant="ghost"
          type="button"
          onClick={() => setConfirming(true)}
          className="text-danger hover:bg-status-overdue-chip"
        >
          {uk.watering.delete}
        </Button>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={uk.watering.delete}
      className="rounded-[14px] border border-status-overdue-dot/40 bg-status-overdue-chip p-3"
    >
      <p className="font-body text-sm text-status-overdue-text">
        {uk.watering.deleteConfirmPrompt}
      </p>
      <div className="mt-2 flex gap-2">
        <Button
          variant="danger"
          type="button"
          onClick={onConfirm}
          disabled={pending}
        >
          {uk.watering.deleteConfirm}
        </Button>
        <Button
          variant="ghost"
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          {uk.watering.deleteCancel}
        </Button>
      </div>
    </div>
  );
}
