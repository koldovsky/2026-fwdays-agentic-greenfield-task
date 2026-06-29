"use client";

// Demo client form (FR-SHELL-03) — proves the shared inline-error contract is
// wired end-to-end: a server action returns an ActionResult, useActionState
// holds it, FormErrorBanner shows result.formError, and each FieldError shows
// result.fieldErrors[name] with the {id}-error association (aria-describedby +
// aria-invalid). Slices 2–5 reuse this exact pattern.

import { useActionState } from "react";

import { FieldError } from "@/components/forms/FieldError";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { submitExample } from "@/app/example-form-action";
import type { ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";

export function ExampleForm() {
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    submitExample,
    undefined,
  );

  const formError = state && !state.ok ? state.formError : undefined;
  const nameError = state && !state.ok ? state.fieldErrors?.name : undefined;
  // React 19's <form action> auto-resets uncontrolled inputs once the action
  // resolves, so on a {ok:false} validation failure the typed value would be
  // wiped. The action echoes the submitted `values` back; repopulating the
  // input via defaultValue keeps the Owner's input intact (FR-SHELL-03) WITHOUT
  // making the field controlled. Slices 2–5 reuse this exact pattern.
  const nameValue = state && !state.ok ? state.values?.name : undefined;
  const success = state?.ok === true;

  return (
    <form action={formAction} className="mt-4 max-w-sm" noValidate>
      <h2 className="text-base font-semibold text-foreground">{uk.example.formTitle}</h2>
      <FormErrorBanner message={formError} />
      <div className="mt-3">
        <label htmlFor="name" className="block text-sm font-medium text-foreground">
          {uk.example.nameLabel}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={nameValue}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "name-error" : undefined}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <FieldError id="name" message={nameError} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {uk.example.submit}
      </button>
      {success ? (
        <p role="status" className="mt-3 text-sm text-green-700 dark:text-green-400">
          {uk.example.success}
        </p>
      ) : null}
    </form>
  );
}
