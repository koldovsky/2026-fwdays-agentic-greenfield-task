"use client";

// Add/edit watering form island (design D6, slice-2/3 D3/D4 pattern).
// useActionState over the watering actions: FormErrorBanner (top) + a FieldError
// per field, with uncontrolled inputs repopulated from result.values on a
// { ok:false } round-trip (React 19 auto-resets the form on action resolve —
// design R6). The watering date is a native <input type="date"> defaulting to
// today; the note is an OPTIONAL free-text field; every field has an accessible
// label.
//
// @trace FR-WATER-01
// @trace FR-WATER-02
// @trace FR-SHELL-03
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { FieldError } from "@/components/forms/FieldError";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import type { ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";
import {
  createWateringAction,
  updateWateringAction,
} from "@/lib/watering/actions";
import { NOTE_MAX_LEN } from "@/lib/watering/validation";

export interface WateringFormDefaults {
  wateredOn?: string;
  note?: string;
}

export interface WateringFormProps {
  /** The owning plant (for create + the success navigation/refresh). */
  plantId: number;
  /** Provide a watering id to edit; omit to create. */
  id?: number;
  /** Initial field values (the row being edited). */
  defaults?: WateringFormDefaults;
  /** Today in Kiev (YYYY-MM-DD) so a fresh add defaults the date field. */
  today: string;
  /** Called after a successful save (e.g. close an edit panel). */
  onSaved?: () => void;
}

export function WateringForm({
  plantId,
  id,
  defaults,
  today,
  onSaved,
}: WateringFormProps) {
  const isEdit = id != null;
  const router = useRouter();

  // Namespace field ids per form instance so the always-present add form and any
  // number of inline edit forms can coexist on /plants/[id] without duplicate DOM
  // ids breaking label[for]/aria-describedby association (design R7). The add form
  // is "new"; an edit form is scoped by its watering id.
  const scope = isEdit ? `watering-${id}` : "watering-new";
  const dateFieldId = `${scope}-wateredOn`;
  const noteFieldId = `${scope}-note`;

  async function action(
    _prev: ActionResult | undefined,
    formData: FormData,
  ): Promise<ActionResult> {
    return isEdit
      ? updateWateringAction(id, formData)
      : createWateringAction(plantId, formData);
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
  const dateError = failed?.fieldErrors?.wateredOn;
  const noteError = failed?.fieldErrors?.note;

  const dateValue = failed?.values?.wateredOn ?? defaults?.wateredOn ?? today;
  const noteValue = failed?.values?.note ?? defaults?.note ?? "";

  // When a field has both a hint and an error, reference BOTH ids so assistive
  // tech keeps announcing the format/constraint hint alongside the error (append,
  // not replace).
  const dateDescribedBy = dateError
    ? `${dateFieldId}-error ${dateFieldId}-hint`
    : `${dateFieldId}-hint`;
  const noteDescribedBy = noteError
    ? `${noteFieldId}-error ${noteFieldId}-hint`
    : `${noteFieldId}-hint`;

  return (
    <form action={formAction} className="max-w-md" noValidate>
      <FormErrorBanner message={formErr} />

      <div className="mt-3">
        <label
          htmlFor={dateFieldId}
          className="block text-sm font-medium text-foreground"
        >
          {uk.watering.wateredOnLabel}
        </label>
        <input
          id={dateFieldId}
          name="wateredOn"
          type="date"
          max={today}
          defaultValue={dateValue}
          aria-invalid={dateError ? true : undefined}
          aria-describedby={dateDescribedBy}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <p
          id={`${dateFieldId}-hint`}
          className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
        >
          {uk.watering.wateredOnHint}
        </p>
        <FieldError id={dateFieldId} message={dateError} />
      </div>

      <div className="mt-3">
        <label
          htmlFor={noteFieldId}
          className="block text-sm font-medium text-foreground"
        >
          {uk.watering.noteLabel}
        </label>
        <textarea
          id={noteFieldId}
          name="note"
          rows={2}
          maxLength={NOTE_MAX_LEN}
          placeholder={uk.watering.notePlaceholder}
          defaultValue={noteValue}
          aria-invalid={noteError ? true : undefined}
          aria-describedby={noteDescribedBy}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <p
          id={`${noteFieldId}-hint`}
          className="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
        >
          {uk.watering.noteHint}
        </p>
        <FieldError id={noteFieldId} message={noteError} />
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isEdit ? uk.watering.save : uk.watering.add}
        </button>
        {isEdit && onSaved ? (
          <button
            type="button"
            onClick={onSaved}
            disabled={pending}
            className="inline-flex items-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {uk.watering.cancel}
          </button>
        ) : null}
      </div>
    </form>
  );
}
