"use server";

// Watering server actions (design D5) — guard -> validate -> service ->
// revalidate. There is no auth in this app (NFR-SEC-01, TC-04), so there is no
// role guard step. Each action ALWAYS returns the shared ActionResult and NEVER
// throws raw on user input — it catches and translates validation / FK / SQLite
// driver errors to a human Ukrainian message, and echoes the submitted values so
// the uncontrolled form repopulates.
//
// @trace FR-WATER-01
// @trace FR-WATER-04
// @trace FR-WATER-05
// @trace FR-SHELL-03
import { revalidatePath } from "next/cache";

import { formError, ok, type ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";
import {
  createWatering,
  editWatering,
  removeWatering,
} from "@/lib/watering/service";
import { validateWateringInput } from "@/lib/watering/validation";

/** Echo the raw submitted strings so a failure repopulates the form (D5). */
function echo(formData: FormData) {
  return {
    wateredOn: String(formData.get("wateredOn") ?? ""),
    note: String(formData.get("note") ?? ""),
  };
}

/** A client-supplied id must be a positive integer (defense-in-depth). */
function isValidId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

/** Log a watering against a plant (FR-WATER-01). */
export async function createWateringAction(
  plantId: number,
  formData: FormData,
): Promise<ActionResult> {
  if (!isValidId(plantId)) {
    return formError(uk.watering.notFound, echo(formData));
  }

  const validated = validateWateringInput(formData);
  if (!validated.ok) return validated;

  try {
    const result = await createWatering(plantId, validated.data!);
    if (!result.ok) {
      // Parent plant gone — friendly not-found, never a raw FK 500.
      return formError(uk.watering.notFound, echo(formData));
    }
    revalidatePath(`/plants/${plantId}`);
    return ok();
  } catch (error) {
    console.error("createWateringAction failed:", error);
    return formError(uk.errors.generic, echo(formData));
  }
}

/** Edit a watering's date + note (FR-WATER-04). Validation gate first. */
export async function updateWateringAction(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  // Validate input BEFORE the not-found lookup so an invalid edit is an inline
  // field error regardless of whether the row still exists.
  const validated = validateWateringInput(formData);
  if (!validated.ok) return validated;

  if (!isValidId(id)) {
    return formError(uk.watering.notFound, echo(formData));
  }

  try {
    const updated = await editWatering(id, validated.data!);
    if (!updated) {
      // Row deleted in another tab — not-found, never a resurrected row.
      return formError(uk.watering.notFound, echo(formData));
    }
    revalidatePath(`/plants/${updated.plantId}`);
    return ok();
  } catch (error) {
    console.error("updateWateringAction failed:", error);
    return formError(uk.errors.generic, echo(formData));
  }
}

/** Delete a single watering (FR-WATER-05). A missing id is not-found. */
export async function deleteWateringAction(
  id: number,
  plantId?: number,
): Promise<ActionResult> {
  if (!isValidId(id)) {
    return formError(uk.watering.notFound);
  }

  try {
    const removed = await removeWatering(id);
    if (!removed) {
      return formError(uk.watering.notFound);
    }
    if (plantId != null && isValidId(plantId)) {
      revalidatePath(`/plants/${plantId}`);
    }
    return ok();
  } catch (error) {
    console.error("deleteWateringAction failed:", error);
    return formError(uk.errors.generic);
  }
}
