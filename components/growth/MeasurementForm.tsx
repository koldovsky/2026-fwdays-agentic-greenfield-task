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
import { Button } from "@/components/ui/Button";
import { fieldInputClass, fieldLabelClass, fieldHintClass } from "@/components/forms/fieldStyles";
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

  // Namespace field ids per form instance so the always-present add form and any
  // number of inline edit forms can coexist on /plants/[id] without duplicate DOM
  // ids breaking label[for]/aria-describedby association (design R7). The add form
  // is "new"; an edit form is scoped by its measurement id.
  const scope = isEdit ? `measurement-${id}` : "measurement-new";
  const heightFieldId = `${scope}-heightCm`;
  const dateFieldId = `${scope}-measuredOn`;

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

  // When a field has both a hint and an error, reference BOTH ids so assistive
  // tech keeps announcing the format/constraint hint alongside the error (append,
  // not replace).
  const heightDescribedBy = heightError
    ? `${heightFieldId}-error ${heightFieldId}-hint`
    : `${heightFieldId}-hint`;
  const dateDescribedBy = dateError
    ? `${dateFieldId}-error ${dateFieldId}-hint`
    : `${dateFieldId}-hint`;

  return (
    <form action={formAction} className="max-w-md" noValidate>
      <FormErrorBanner message={formErr} />

      <div className="mt-4">
        <label htmlFor={heightFieldId} className={fieldLabelClass}>
          {uk.growth.heightLabel}
        </label>
        <input
          id={heightFieldId}
          name="heightCm"
          type="text"
          inputMode="decimal"
          required
          placeholder={uk.growth.heightPlaceholder}
          defaultValue={heightValue}
          aria-invalid={heightError ? true : undefined}
          aria-describedby={heightDescribedBy}
          className={fieldInputClass}
        />
        <p id={`${heightFieldId}-hint`} className={fieldHintClass}>
          {uk.growth.heightHint}
        </p>
        <FieldError id={heightFieldId} message={heightError} />
      </div>

      <div className="mt-4">
        <label htmlFor={dateFieldId} className={fieldLabelClass}>
          {uk.growth.measuredOnLabel}
        </label>
        <input
          id={dateFieldId}
          name="measuredOn"
          type="date"
          max={today}
          defaultValue={dateValue}
          aria-invalid={dateError ? true : undefined}
          aria-describedby={dateDescribedBy}
          className={fieldInputClass}
        />
        <p id={`${dateFieldId}-hint`} className={fieldHintClass}>
          {uk.growth.measuredOnHint}
        </p>
        <FieldError id={dateFieldId} message={dateError} />
      </div>

      <div className="mt-5 flex gap-3">
        <Button variant="primary" type="submit" disabled={pending}>
          {isEdit ? uk.growth.save : uk.growth.add}
        </Button>
        {isEdit && onSaved ? (
          <Button
            variant="ghost"
            type="button"
            onClick={onSaved}
            disabled={pending}
          >
            {uk.growth.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
