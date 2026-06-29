// Watering write/business operations (design D4, D5). Sits between the actions
// (which validate + translate errors) and queries (raw Drizzle). Owns the
// not-found signal for edit/delete of a row deleted in another tab, and the
// plant-exists check on logging (a non-existent plant is otherwise rejected by
// the FK — this gives the action a clean signal before hitting the constraint).
// `db` is defaulted to the singleton, injectable for tests.
import { db as defaultDb, type DB } from "@/db/client";
import type { Watering } from "@/db/schema/watering";
import { getPlant } from "@/lib/plants/queries";
import {
  deleteWatering as deleteWateringQuery,
  insertWatering as insertWateringQuery,
  updateWatering as updateWateringQuery,
  type WateringValues,
} from "@/lib/watering/queries";
import type { WateringInput } from "@/lib/watering/validation";

type WateringDb = Pick<DB, "select" | "insert" | "update" | "delete">;

/** Distinguishes a missing parent plant from a successful create. */
export type CreateWateringResult =
  | { ok: true; watering: Watering }
  | { ok: false; reason: "plant-not-found" };

/**
 * Log a watering against a plant. Returns a plant-not-found signal when the
 * parent plant does not exist (the action turns it into a friendly result,
 * never a raw FK 500). On success returns the created row.
 */
export async function createWatering(
  plantId: number,
  values: WateringInput,
  db: WateringDb = defaultDb,
): Promise<CreateWateringResult> {
  const plant = await getPlant(db, plantId);
  if (!plant) {
    return { ok: false, reason: "plant-not-found" };
  }
  const insert: WateringValues = {
    plantId,
    wateredOn: values.wateredOn,
    note: values.note,
  };
  const watering = await insertWateringQuery(db, insert);
  return { ok: true, watering };
}

/**
 * Edit a watering; returns the updated row or `null` when the row no longer
 * exists (deleted in another tab) — the action turns this into a not-found
 * result, never a resurrected row (NFR-DATA-02).
 */
export async function editWatering(
  id: number,
  values: WateringInput,
  db: WateringDb = defaultDb,
): Promise<Watering | null> {
  const updated = await updateWateringQuery(db, id, {
    wateredOn: values.wateredOn,
    note: values.note,
  });
  return updated ?? null;
}

/**
 * Delete a single watering; returns true when a row was removed, false when the
 * id was already gone (a no-op not-found, never a throw). Only the one row goes —
 * no cascade up/out (SC-5).
 */
export async function removeWatering(
  id: number,
  db: WateringDb = defaultDb,
): Promise<boolean> {
  const removed = await deleteWateringQuery(db, id);
  return removed > 0;
}
