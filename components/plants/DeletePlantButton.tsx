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
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
        >
          {uk.plants.delete}
        </button>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={uk.plants.delete}
      className="mt-6 rounded-md border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
    >
      <p className="text-sm text-red-800 dark:text-red-200">
        {uk.plants.deleteConfirmPrompt}
      </p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-60"
        >
          {uk.plants.deleteConfirm}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="inline-flex items-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {uk.plants.deleteCancel}
        </button>
      </div>
    </div>
  );
}
