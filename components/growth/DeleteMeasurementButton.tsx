"use client";

// Delete-with-confirm control for a SINGLE measurement (design D6, SC-5). Never
// a one-click silent delete: the first click reveals an explicit confirm step (a
// confirm button + a cancel); only confirming invokes the action. Cancel leaves
// the row intact. On success the page refreshes; a not-found / generic failure
// surfaces inline.
//
// @trace FR-GROWTH-04
// @trace SC-5
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { uk } from "@/lib/i18n/uk";
import { deleteMeasurementAction } from "@/lib/growth/actions";

export function DeleteMeasurementButton({
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
      const result = await deleteMeasurementAction(id, plantId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.formError ?? uk.errors.generic);
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <div>
        <FormErrorBanner message={error} />
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
        >
          {uk.growth.delete}
        </button>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={uk.growth.delete}
      className="rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
    >
      <p className="text-sm text-red-800 dark:text-red-200">
        {uk.growth.deleteConfirmPrompt}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-60"
        >
          {uk.growth.deleteConfirm}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="inline-flex items-center rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {uk.growth.deleteCancel}
        </button>
      </div>
    </div>
  );
}
