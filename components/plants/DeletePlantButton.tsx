"use client";

// Delete-with-confirm control (design D5, SC-5, FR-PLANT-07). Never a one-click
// silent delete: the first click reveals an explicit confirm step (a confirm
// button + a cancel); only confirming invokes the action. On success the page
// navigates back to the list; a not-found / generic failure surfaces inline.
//
// @trace FR-PLANT-07
// @trace SC-5
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { Button } from "@/components/ui/Button";
import { uk } from "@/lib/i18n/uk";
import { deletePlantAction } from "@/lib/plants/actions";

export function DeletePlantButton({ id }: { id: number }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    setError(undefined);
    startTransition(async () => {
      const result = await deletePlantAction(id);
      if (result.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(result.formError ?? uk.errors.generic);
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <div className="mt-6">
        <FormErrorBanner message={error} />
        <Button
          variant="danger-ghost"
          type="button"
          onClick={() => setConfirming(true)}
        >
          {uk.plants.delete}
        </Button>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={uk.plants.delete}
      className="mt-6 rounded-[14px] border border-status-overdue-dot/40 bg-status-overdue-chip p-4"
    >
      <p className="font-body text-sm text-status-overdue-text">
        {uk.plants.deleteConfirmPrompt}
      </p>
      <div className="mt-3 flex gap-3">
        <Button
          variant="danger"
          type="button"
          onClick={onConfirm}
          disabled={pending}
        >
          {uk.plants.deleteConfirm}
        </Button>
        <Button
          variant="ghost"
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          {uk.plants.deleteCancel}
        </Button>
      </div>
    </div>
  );
}
