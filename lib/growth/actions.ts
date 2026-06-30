"use server";

// Growth measurement server actions (design D5) — guard -> validate -> service
// -> revalidate. There is no auth in this app (NFR-SEC-01, TC-04), so there is
// no role guard step. Each action ALWAYS returns the shared ActionResult and
// NEVER throws raw on user input — it catches and translates validation / FK /
// SQLite driver errors to a human Ukrainian message, and echoes the submitted
// values so the uncontrolled form repopulates.
//
// @trace FR-GROWTH-01
// @trace FR-GROWTH-03
// @trace FR-GROWTH-04
// @trace FR-SHELL-03
import { revalidatePath } from "next/cache";

import { formError, ok, type ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";
import {
  createMeasurement,
  editMeasurement,
  removeMeasurement,
} from "@/lib/growth/service";
import { validateMeasurementInput } from "@/lib/growth/validation";

/** Echo the raw submitted strings so a failure repopulates the form (D5). */
function echo(formData: FormData) {
  return {
    heightCm: String(formData.get("heightCm") ?? ""),
    measuredOn: String(formData.get("measuredOn") ?? ""),
  };
}

/** A client-supplied id must be a positive integer (defense-in-depth). */
function isValidId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

/** Log a measurement against a plant (FR-GROWTH-01). */
export async function createMeasurementAction(
  plantId: number,
  formData: FormData,
): Promise<ActionResult> {
  if (!isValidId(plantId)) {
    return formError(uk.growth.notFound, echo(formData));
  }

  const validated = validateMeasurementInput(formData);
  if (!validated.ok) return validated;

  try {
    const result = await createMeasurement(plantId, validated.data!);
    if (!result.ok) {
      // Parent plant gone — friendly not-found, never a raw FK 500.
      return formError(uk.growth.notFound, echo(formData));
    }
    revalidatePath(`/plants/${plantId}`);
    return ok();
  } catch (error) {
    console.error("createMeasurementAction failed:", error);
    return formError(uk.errors.generic, echo(formData));
  }
}

/** Edit a measurement's value + date (FR-GROWTH-03). Validation gate first. */
export async function updateMeasurementAction(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  // Validate input BEFORE the not-found lookup so an invalid edit is an inline
  // field error regardless of whether the row still exists.
  const validated = validateMeasurementInput(formData);
  if (!validated.ok) return validated;

  if (!isValidId(id)) {
    return formError(uk.growth.notFound, echo(formData));
  }

  try {
    const updated = await editMeasurement(id, validated.data!);
    if (!updated) {
      // Row deleted in another tab — not-found, never a resurrected row.
      return formError(uk.growth.notFound, echo(formData));
    }
    revalidatePath(`/plants/${updated.plantId}`);
    return ok();
  } catch (error) {
    console.error("updateMeasurementAction failed:", error);
    return formError(uk.errors.generic, echo(formData));
  }
}

/** Delete a single measurement (FR-GROWTH-04). A missing id is not-found. */
export async function deleteMeasurementAction(
  id: number,
  plantId?: number,
): Promise<ActionResult> {
  if (!isValidId(id)) {
    return formError(uk.growth.notFound);
  }

  try {
    const removed = await removeMeasurement(id);
    if (!removed) {
      return formError(uk.growth.notFound);
    }
    if (plantId != null && isValidId(plantId)) {
      revalidatePath(`/plants/${plantId}`);
    }
    return ok();
  } catch (error) {
    console.error("deleteMeasurementAction failed:", error);
    return formError(uk.errors.generic);
  }
}
