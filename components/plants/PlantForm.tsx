"use client";

// Add/edit plant form island (design D6, slice-1 D3/D4 pattern). useActionState
// over the plant actions: FormErrorBanner (top) + a FieldError per field, with
// uncontrolled inputs repopulated from result.values on a { ok:false } round-trip
// (React 19 auto-resets the form on action resolve — design R4). The acquired
// date is a native <input type="date">; every field has an accessible label.
//
// @trace FR-PLANT-01
// @trace FR-PLANT-06
// @trace FR-SHELL-03

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { FieldError } from "@/components/forms/FieldError";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import type { ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";
import { createPlantAction, updatePlantAction } from "@/lib/plants/actions";
import { SPECIES_DEFAULT } from "@/lib/plants/validation";

export interface PlantFormDefaults {
  name?: string;
  species?: string;
  acquiredDate?: string | null;
}

export interface PlantFormProps {
  /** Provide a plant id to edit; omit to create. */
  id?: number;
  /** Initial field values (the row being edited). */
  defaults?: PlantFormDefaults;
}

export function PlantForm({ id, defaults }: PlantFormProps) {
  const isEdit = id != null;
  const router = useRouter();

  async function action(
    _prev: ActionResult | undefined,
    formData: FormData,
  ): Promise<ActionResult> {
    return isEdit
      ? updatePlantAction(id, formData)
      : createPlantAction(formData);
  }

  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(action, undefined);

  // On success the server has revalidated; navigate to the plant detail (edit)
  // or the list (add) so the Owner sees the saved result.
  useEffect(() => {
    if (state?.ok) {
      router.push(isEdit ? `/plants/${id}` : "/");
      router.refresh();
    }
  }, [state, isEdit, id, router]);

  const failed = state && !state.ok ? state : undefined;
  const formErr = failed?.formError;
  const nameError = failed?.fieldErrors?.name;
  const speciesError = failed?.fieldErrors?.species;
  const dateError = failed?.fieldErrors?.acquiredDate;

  // On a failed submit echo the raw typed values (slice-1 D3 pattern); otherwise
  // fall back to the row being edited / the species default for a fresh add.
  const nameValue = failed?.values?.name ?? defaults?.name ?? "";
  const speciesValue =
    failed?.values?.species ?? defaults?.species ?? SPECIES_DEFAULT;
  const dateValue =
    failed?.values?.acquiredDate ?? defaults?.acquiredDate ?? "";

  return (
    <form action={formAction} className="max-w-md" noValidate>
      <FormErrorBanner message={formErr} />

      <div className="mt-3">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-foreground"
        >
          {uk.plants.nameLabel}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={200}
          placeholder={uk.plants.namePlaceholder}
          defaultValue={nameValue}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "name-error" : undefined}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <FieldError id="name" message={nameError} />
      </div>

      <div className="mt-3">
        <label
          htmlFor="species"
          className="block text-sm font-medium text-foreground"
        >
          {uk.plants.speciesLabel}
        </label>
        <input
          id="species"
          name="species"
          type="text"
          maxLength={200}
          defaultValue={speciesValue}
          aria-invalid={speciesError ? true : undefined}
          aria-describedby={
            speciesError ? "species-error" : "species-hint"
          }
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <p id="species-hint" className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {uk.plants.speciesHint}
        </p>
        <FieldError id="species" message={speciesError} />
      </div>

      <div className="mt-3">
        <label
          htmlFor="acquiredDate"
          className="block text-sm font-medium text-foreground"
        >
          {uk.plants.acquiredDateLabel}
        </label>
        <input
          id="acquiredDate"
          name="acquiredDate"
          type="date"
          defaultValue={dateValue}
          aria-invalid={dateError ? true : undefined}
          aria-describedby={
            dateError ? "acquiredDate-error" : "acquiredDate-hint"
          }
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <p
          id="acquiredDate-hint"
          className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
        >
          {uk.plants.acquiredDateHint}
        </p>
        <FieldError id="acquiredDate" message={dateError} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {uk.plants.save}
      </button>
    </form>
  );
}
