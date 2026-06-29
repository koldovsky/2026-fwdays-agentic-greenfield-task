"use server";

// Demo server action exercising the shared inline-error contract (FR-SHELL-03).
// A real plant-create action lands in slice 2; this one only proves the
// ActionResult → FieldError/FormErrorBanner wiring is in place. It NEVER throws
// on user input: it validates, and returns { ok:false, ... } on failure.

import { fieldError, ok, type ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";

export async function submitExample(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  // Raw (untrimmed) submitted value echoed back on failure so the form can
  // repopulate its uncontrolled input after React 19's form-action auto-reset
  // (FR-SHELL-03 "input intact"). Read outside the try so it is available in
  // the catch as well.
  const rawName = String(formData.get("name") ?? "");
  try {
    const name = rawName.trim();
    if (!name) {
      return fieldError({ name: uk.example.nameRequired }, { name: rawName });
    }
    return ok();
  } catch {
    // Unexpected failure surfaces as a whole-form message, never a raw 500.
    return { ok: false, formError: uk.errors.generic, values: { name: rawName } };
  }
}
