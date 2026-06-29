"use server";

// Plant server actions (design D4) — guard -> validate -> service -> revalidate.
// There is no auth in this app (NFR-SEC-01, TC-04), so there is no role guard
// step: the single local Owner performs every action. Each action ALWAYS returns
// the shared ActionResult and NEVER throws raw on user input — it catches,
// translates validation / SQLite driver errors to a human Ukrainian message,
// and echoes the submitted values so the uncontrolled form repopulates.
//
// @trace FR-PLANT-01
// @trace FR-PLANT-06
// @trace FR-PLANT-07
// @trace FR-SHELL-03
import { revalidatePath } from "next/cache";

import { formError, ok, type ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";
import { createPlant, editPlant, removePlant } from "@/lib/plants/service";
import { validatePlantInput } from "@/lib/plants/validation";

/** Echo the raw submitted strings so a failure repopulates the form (D3). */
function echo(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    species: String(formData.get("species") ?? ""),
    acquiredDate: String(formData.get("acquiredDate") ?? ""),
  };
}

/** Revalidate the views a mutation affects: the list and the plant detail. */
function revalidatePlant(id?: number) {
  revalidatePath("/");
  if (id != null) revalidatePath(`/plants/${id}`);
}

/** Create a plant (FR-PLANT-01). useActionState-compatible signature. */
export async function createPlantAction(
  formData: FormData,
): Promise<ActionResult> {
  const validated = validatePlantInput(formData);
  if (!validated.ok) return validated;

  try {
    const plant = await createPlant(validated.data!);
    revalidatePlant(plant.id);
    return ok();
  } catch (error) {
    console.error("createPlantAction failed:", error);
    return formError(uk.errors.generic, echo(formData));
  }
}

/** Edit a plant (FR-PLANT-06). All-or-nothing: validation gate before write. */
export async function updatePlantAction(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  // Defense-in-depth: the id is a client-supplied server-action argument (the
  // route loader guards a separate path callers can bypass). Drizzle already
  // parameterizes the query; this enforces the action's own contract so a
  // float/0/negative/NaN id resolves to a friendly not-found, never a write.
  if (!Number.isInteger(id) || id <= 0) {
    return formError(uk.plants.notFound, echo(formData));
  }

  const validated = validatePlantInput(formData);
  if (!validated.ok) return validated;

  try {
    const updated = await editPlant(id, validated.data!);
    if (!updated) {
      // Row deleted in another tab — not-found, never a resurrected row.
      return formError(uk.plants.notFound, echo(formData));
    }
    revalidatePlant(id);
    return ok();
  } catch (error) {
    console.error("updatePlantAction failed:", error);
    return formError(uk.errors.generic, echo(formData));
  }
}

/** Delete a plant (FR-PLANT-07). A missing id resolves to a not-found result. */
export async function deletePlantAction(id: number): Promise<ActionResult> {
  // Defense-in-depth (see updatePlantAction): validate the client-supplied id
  // so a malformed id resolves to a not-found result rather than a no-op write.
  if (!Number.isInteger(id) || id <= 0) {
    return formError(uk.plants.notFound);
  }

  try {
    const removed = await removePlant(id);
    if (!removed) {
      return formError(uk.plants.notFound);
    }
    revalidatePath("/");
    return ok();
  } catch (error) {
    console.error("deletePlantAction failed:", error);
    return formError(uk.errors.generic);
  }
}
