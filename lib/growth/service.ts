// Growth measurement write/business operations (design D4, D5). Sits between the
// actions (which validate + translate errors) and queries (raw Drizzle). Owns
// the not-found signal for edit/delete of a row deleted in another tab, and the
// plant-exists check on logging (a non-existent plant is otherwise rejected by
// the FK — this gives the action a clean signal before hitting the constraint).
// `db` is defaulted to the singleton, injectable for tests.
import { db as defaultDb, type DB } from "@/db/client";
import type { Measurement } from "@/db/schema/growth";
import { getPlant } from "@/lib/plants/queries";
import {
  deleteMeasurement as deleteMeasurementQuery,
  insertMeasurement as insertMeasurementQuery,
  updateMeasurement as updateMeasurementQuery,
  type MeasurementValues,
} from "@/lib/growth/queries";
import type { GrowthInput } from "@/lib/growth/validation";

type GrowthDb = Pick<DB, "select" | "insert" | "update" | "delete">;

/** Distinguishes a missing parent plant from a successful create. */
export type CreateMeasurementResult =
  | { ok: true; measurement: Measurement }
  | { ok: false; reason: "plant-not-found" };

/**
 * Log a measurement against a plant. Returns a plant-not-found signal when the
 * parent plant does not exist (the action turns it into a friendly result,
 * never a raw FK 500). On success returns the created row.
 */
export async function createMeasurement(
  plantId: number,
  values: GrowthInput,
  db: GrowthDb = defaultDb,
): Promise<CreateMeasurementResult> {
  const plant = await getPlant(db, plantId);
  if (!plant) {
    return { ok: false, reason: "plant-not-found" };
  }
  const insert: MeasurementValues = {
    plantId,
    heightCm: values.heightCm,
    measuredOn: values.measuredOn,
  };
  const measurement = await insertMeasurementQuery(db, insert);
  return { ok: true, measurement };
}

/**
 * Edit a measurement; returns the updated row or `null` when the row no longer
 * exists (deleted in another tab) — the action turns this into a not-found
 * result, never a resurrected row (NFR-DATA-02).
 */
export async function editMeasurement(
  id: number,
  values: GrowthInput,
  db: GrowthDb = defaultDb,
): Promise<Measurement | null> {
  const updated = await updateMeasurementQuery(db, id, {
    heightCm: values.heightCm,
    measuredOn: values.measuredOn,
  });
  return updated ?? null;
}

/**
 * Delete a single measurement; returns true when a row was removed, false when
 * the id was already gone (a no-op not-found, never a throw). Only the one row
 * goes — no cascade up/out (SC-5).
 */
export async function removeMeasurement(
  id: number,
  db: GrowthDb = defaultDb,
): Promise<boolean> {
  const removed = await deleteMeasurementQuery(db, id);
  return removed > 0;
}
