// Plant write/business operations (design D4, D5). Sits between the actions
// (which validate + translate errors) and queries (raw Drizzle). Owns the
// not-found signal for edit/delete of a row deleted in another tab, and the
// delete-cascade semantics (DB-level ON DELETE CASCADE, declared by child
// slices against plants.id — design D5).
import { db as defaultDb, type DB } from "@/db/client";
import {
  deletePlant as deletePlantQuery,
  insertPlant as insertPlantQuery,
  updatePlant as updatePlantQuery,
} from "@/lib/plants/queries";
import type { Plant } from "@/db/schema/plants";
import type { PlantInput } from "@/lib/plants/validation";

type PlantsDb = Pick<DB, "select" | "insert" | "update" | "delete">;

/** Create a plant from validated input; returns the created row. */
export async function createPlant(
  values: PlantInput,
  db: PlantsDb = defaultDb,
): Promise<Plant> {
  return insertPlantQuery(db, values);
}

/**
 * Edit a plant; returns the updated row or `null` when the plant no longer
 * exists (deleted in another tab) — the action turns this into a not-found
 * result, never a resurrected row (NFR-DATA-02).
 */
export async function editPlant(
  id: number,
  values: PlantInput,
  db: PlantsDb = defaultDb,
): Promise<Plant | null> {
  const updated = await updatePlantQuery(db, id, values);
  return updated ?? null;
}

/**
 * Delete a plant; returns true when a row was removed, false when the id was
 * already gone (a no-op not-found, never a throw). The DB-level cascade removes
 * the plant's own children only (design D5, SC-5).
 */
export async function removePlant(
  id: number,
  db: PlantsDb = defaultDb,
): Promise<boolean> {
  const removed = await deletePlantQuery(db, id);
  return removed > 0;
}
