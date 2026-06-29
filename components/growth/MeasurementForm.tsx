"use client";

// Add/edit measurement form island (design D6, slice-2 D3/D4 pattern).
// useActionState over the growth actions: FormErrorBanner (top) + a FieldError
// per field, with uncontrolled inputs repopulated from result.values on a
// { ok:false } round-trip (React 19 auto-resets the form on action resolve —
// design R7). The measurement date is a native <input type="date"> defaulting to
// today; the height is a tolerant text input (accepts a decimal comma); every
// field has an accessible label.
//
// @trace FR-GROWTH-01
// @trace FR-GROWTH-03
// @trace FR-SHELL-03
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { FieldError } from "@/components/forms/FieldError";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import type { ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";
import {
  createMeasurementAction,
  updateMeasurementAction,
} from "@/lib/growth/actions";

export interface MeasurementFormDefaults {
  heightCm?: string;
  measuredOn?: string;
}

export interface MeasurementFormProps {
  /** The owning plant (for create + the success navigation/refresh). */
  plantId: number;
  /** Provide a measurement id to edit; omit to create. */
  id?: number;
  /** Initial field values (the row being edited). */
  defaults?: MeasurementFormDefaults;
  /** Today in Kiev (YYYY-MM-DD) so a fresh add defaults the date field. */
  today: string;
  /** Called after a successful save (e.g. close an edit panel). */
  onSaved?: () => void;
}

export function MeasurementForm({
  plantId,
  id,
  defaults,
  today,
  onSaved,
}: MeasurementFormProps) {
  const isEdit = id != null;
  const router = useRouter();

  async function action(
    _prev: ActionResult | undefined,
    formData: FormData,
  ): Promise<ActionResult> {
    return isEdit
      ? updateMeasurementAction(id, formData)
      : createMeasurementAction(plantId, formData);
  }

  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(action, undefined);

  // On success the server has revalidated the plant detail; refresh so the list
  // reflects the saved row, and let the parent close an edit panel.
  useEffect(() => {
    if (state?.ok) {
      onSaved?.();
      router.refresh();
    }
  }, [state, router, onSaved]);

  const failed = state && !state.ok ? state : undefined;
  const formErr = failed?.formError;
  const heightError = failed?.fieldErrors?.heightCm;
  const dateError = failed?.fieldErrors?.measuredOn;

  const heightValue = failed?.values?.heightCm ?? defaults?.heightCm ?? "";
  const dateValue = failed?.values?.measuredOn ?? defaults?.measuredOn ?? today;

  return (
    <form action={formAction} className="max-w-md" noValidate>
      <FormErrorBanner message={formErr} />

      <div className="mt-3">
        <label
          htmlFor="heightCm"
          className="block text-sm font-medium text-foreground"
        >
          {uk.growth.heightLabel}
        </label>
        <input
          id="heightCm"
          name="heightCm"
          type="text"
          inputMode="decimal"
          required
          placeholder={uk.growth.heightPlaceholder}
          defaultValue={heightValue}
          aria-invalid={heightError ? true : undefined}
          aria-describedby={heightError ? "heightCm-error" : "heightCm-hint"}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <p
          id="heightCm-hint"
          className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
        >
          {uk.growth.heightHint}
        </p>
        <FieldError id="heightCm" message={heightError} />
      </div>

      <div className="mt-3">
        <label
          htmlFor="measuredOn"
          className="block text-sm font-medium text-foreground"
        >
          {uk.growth.measuredOnLabel}
        </label>
        <input
          id="measuredOn"
          name="measuredOn"
          type="date"
          max={today}
          defaultValue={dateValue}
          aria-invalid={dateError ? true : undefined}
          aria-describedby={dateError ? "measuredOn-error" : "measuredOn-hint"}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <p
          id="measuredOn-hint"
          className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
        >
          {uk.growth.measuredOnHint}
        </p>
        <FieldError id="measuredOn" message={dateError} />
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isEdit ? uk.growth.save : uk.growth.add}
        </button>
        {isEdit && onSaved ? (
          <button
            type="button"
            onClick={onSaved}
            disabled={pending}
            className="inline-flex items-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {uk.growth.cancel}
          </button>
        ) : null}
      </div>
    </form>
  );
}
