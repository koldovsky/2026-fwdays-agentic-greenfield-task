"use server";

// Water-now server action (design D6) — guard -> no-op check -> reuse the
// watering service -> revalidate. There is no auth in this app (NFR-SEC-01), so
// there is no role guard step. ALWAYS returns the shared ActionResult and NEVER
// throws raw: a malformed id or a missing plant resolves to a friendly not-found
// (no FK 500, no resurrection), and an already-watered-today plant is a true
// no-op (ok(), no second event) so the watering history stays clean and the
// status is idempotent (FR-REM-05).
//
// @trace FR-REM-05
// @trace FR-SHELL-03
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { formError, ok, type ActionResult } from "@/lib/forms/result";
import { todayInKiev } from "@/lib/dates";
import { uk } from "@/lib/i18n/uk";
import { latestWateringByPlant } from "@/lib/reminders/queries";
import { createWatering } from "@/lib/watering/service";

/** A client-supplied id must be a positive integer (defense-in-depth). */
function isValidId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

/**
 * Log today's watering for a plant via the watering service (FR-REM-05). A
 * malformed id or a missing plant is a friendly not-found. When the plant's
 * latest watering is already today, it is a no-op: returns `ok()` WITHOUT
 * inserting a second event. Revalidates the home and the plant detail on success.
 */
export async function waterNowAction(plantId: number): Promise<ActionResult> {
  if (!isValidId(plantId)) {
    return formError(uk.reminders.notFound);
  }

  try {
    const today = todayInKiev();

    // No-op when the latest event is already today: no duplicate history, the
    // status stays idempotent. (The plant may still not exist — the create path
    // below resolves that to not-found; here we only short-circuit a real
    // already-watered-today plant.)
    const latestByPlant = await latestWateringByPlant(db);
    if (latestByPlant.get(plantId) === today) {
      return ok();
    }

    const result = await createWatering(
      plantId,
      { wateredOn: today, note: null },
      db,
    );
    if (!result.ok) {
      // Parent plant gone — friendly not-found, never a raw FK 500.
      return formError(uk.reminders.notFound);
    }

    revalidatePath("/");
    revalidatePath(`/plants/${plantId}`);
    return ok();
  } catch (error) {
    console.error("waterNowAction failed:", error);
    return formError(uk.errors.generic);
  }
}
