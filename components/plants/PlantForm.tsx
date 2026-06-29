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
import { Button } from "@/components/ui/Button";
import { fieldInputClass, fieldLabelClass, fieldHintClass } from "@/components/forms/fieldStyles";
import type { ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";
import { createPlantAction, updatePlantAction } from "@/lib/plants/actions";
import { INTERVAL_DEFAULT, SPECIES_DEFAULT } from "@/lib/plants/validation";

export interface PlantFormDefaults {
  name?: string;
  species?: string;
  acquiredDate?: string | null;
  intervalDays?: number;
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

  // Namespace field ids per form instance (design R7). PlantForm renders one per
  // page today (the new/edit routes), but scoping the ids keeps it consistent with
  // the watering/measurement forms and forecloses a future collision if an add +
  // edit form ever co-render on one page. The add form is "new"; an edit form is
  // scoped by its plant id.
  const scope = isEdit ? `plant-${id}` : "plant-new";
  const nameFieldId = `${scope}-name`;
  const speciesFieldId = `${scope}-species`;
  const dateFieldId = `${scope}-acquiredDate`;
  const intervalFieldId = `${scope}-intervalDays`;

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
  const intervalError = failed?.fieldErrors?.intervalDays;

  // On a failed submit echo the raw typed values (slice-1 D3 pattern); otherwise
  // fall back to the row being edited / the species default for a fresh add.
  const nameValue = failed?.values?.name ?? defaults?.name ?? "";
  const speciesValue =
    failed?.values?.species ?? defaults?.species ?? SPECIES_DEFAULT;
  const dateValue =
    failed?.values?.acquiredDate ?? defaults?.acquiredDate ?? "";
  const intervalValue =
    failed?.values?.intervalDays ??
    (defaults?.intervalDays != null
      ? String(defaults.intervalDays)
      : String(INTERVAL_DEFAULT));

  // The name field has no hint, so its describedby is just the error (or nothing).
  // Species + acquired-date have hints: when an error shows, reference BOTH ids so
  // assistive tech keeps announcing the hint alongside the error (append, not
  // replace).
  const nameDescribedBy = nameError ? `${nameFieldId}-error` : undefined;
  const speciesDescribedBy = speciesError
    ? `${speciesFieldId}-error ${speciesFieldId}-hint`
    : `${speciesFieldId}-hint`;
  const dateDescribedBy = dateError
    ? `${dateFieldId}-error ${dateFieldId}-hint`
    : `${dateFieldId}-hint`;
  const intervalDescribedBy = intervalError
    ? `${intervalFieldId}-error ${intervalFieldId}-hint`
    : `${intervalFieldId}-hint`;

  return (
    <form action={formAction} className="max-w-md" noValidate>
      <FormErrorBanner message={formErr} />

      <div className="mt-4">
        <label htmlFor={nameFieldId} className={fieldLabelClass}>
          {uk.plants.nameLabel}
        </label>
        <input
          id={nameFieldId}
          name="name"
          type="text"
          required
          maxLength={200}
          placeholder={uk.plants.namePlaceholder}
          defaultValue={nameValue}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameDescribedBy}
          className={fieldInputClass}
        />
        <FieldError id={nameFieldId} message={nameError} />
      </div>

      <div className="mt-4">
        <label htmlFor={speciesFieldId} className={fieldLabelClass}>
          {uk.plants.speciesLabel}
        </label>
        <input
          id={speciesFieldId}
          name="species"
          type="text"
          maxLength={200}
          defaultValue={speciesValue}
          aria-invalid={speciesError ? true : undefined}
          aria-describedby={speciesDescribedBy}
          className={fieldInputClass}
        />
        <p id={`${speciesFieldId}-hint`} className={fieldHintClass}>
          {uk.plants.speciesHint}
        </p>
        <FieldError id={speciesFieldId} message={speciesError} />
      </div>

      <div className="mt-4">
        <label htmlFor={dateFieldId} className={fieldLabelClass}>
          {uk.plants.acquiredDateLabel}
        </label>
        <input
          id={dateFieldId}
          name="acquiredDate"
          type="date"
          defaultValue={dateValue}
          aria-invalid={dateError ? true : undefined}
          aria-describedby={dateDescribedBy}
          className={fieldInputClass}
        />
        <p id={`${dateFieldId}-hint`} className={fieldHintClass}>
          {uk.plants.acquiredDateHint}
        </p>
        <FieldError id={dateFieldId} message={dateError} />
      </div>

      <div className="mt-4">
        <label htmlFor={intervalFieldId} className={fieldLabelClass}>
          {uk.plants.intervalLabel}
        </label>
        <input
          id={intervalFieldId}
          name="intervalDays"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          defaultValue={intervalValue}
          aria-invalid={intervalError ? true : undefined}
          aria-describedby={intervalDescribedBy}
          className={fieldInputClass}
        />
        <p id={`${intervalFieldId}-hint`} className={fieldHintClass}>
          {uk.plants.intervalHint}
        </p>
        <FieldError id={intervalFieldId} message={intervalError} />
      </div>

      <Button variant="primary" type="submit" disabled={pending} className="mt-5">
        {uk.plants.save}
      </Button>
    </form>
  );
}
