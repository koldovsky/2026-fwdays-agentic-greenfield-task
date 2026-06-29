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
  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return fieldError({ name: uk.example.nameRequired });
    }
    return ok();
  } catch {
    // Unexpected failure surfaces as a whole-form message, never a raw 500.
    return { ok: false, formError: uk.errors.generic };
  }
}
