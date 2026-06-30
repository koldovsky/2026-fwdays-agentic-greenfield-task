// Thin Drizzle reads/writes for plants (design D4). No business rules here — the
// db handle is INJECTED as the first param so tests drive these against a fresh
// in-memory DB and the actions pass the singleton client. List order is
// newest-first (createdAt then id desc) — deterministic (design D6).
import { desc, eq } from "drizzle-orm";

import type { DB } from "@/db/client";
import { plants, type Plant } from "@/db/schema/plants";
import { INTERVAL_DEFAULT, type PlantInput } from "@/lib/plants/validation";

// Accept any Drizzle better-sqlite3 instance bound to the plants schema (the
// app singleton or a test DB), so queries.ts stays decoupled from the client.
type PlantsDb = Pick<DB, "select" | "insert" | "update" | "delete">;

// The persistence boundary tolerates an omitted intervalDays (defaults to the
// schema default), so seed/test helpers that build a plant directly don't have
// to restate it; the validated path always supplies it.
type PlantWriteValues = Omit<PlantInput, "intervalDays"> & {
  intervalDays?: number;
};

/** All plants, newest first (createdAt then id descending) — design D6. */
export async function listPlants(db: PlantsDb): Promise<Plant[]> {
  return db
    .select()
    .from(plants)
    .orderBy(desc(plants.createdAt), desc(plants.id))
    .all();
}

/** One plant by id, or undefined when it does not exist (not-found signal). */
export async function getPlant(
  db: PlantsDb,
  id: number,
): Promise<Plant | undefined> {
  return db.select().from(plants).where(eq(plants.id, id)).get();
}

/** Insert a validated plant; returns the created row (with its new id). */
export async function insertPlant(
  db: PlantsDb,
  values: PlantWriteValues,
): Promise<Plant> {
  return db
    .insert(plants)
    .values({
      name: values.name,
      species: values.species,
      acquiredDate: values.acquiredDate,
      intervalDays: values.intervalDays ?? INTERVAL_DEFAULT,
    })
    .returning()
    .get();
}

/**
 * Update the given fields of a plant; returns the updated row, or undefined
 * when no row matched (the plant was deleted — a not-found signal).
 */
export async function updatePlant(
  db: PlantsDb,
  id: number,
  values: PlantWriteValues,
): Promise<Plant | undefined> {
  return db
    .update(plants)
    .set({
      name: values.name,
      species: values.species,
      acquiredDate: values.acquiredDate,
      intervalDays: values.intervalDays ?? INTERVAL_DEFAULT,
    })
    .where(eq(plants.id, id))
    .returning()
    .get();
}

/**
 * Delete a plant by id. A missing id is a no-op (no throw) — the DB-level
 * ON DELETE CASCADE removes the plant's own children (design D5). Returns the
 * number of rows removed so the service can signal not-found.
 */
export async function deletePlant(db: PlantsDb, id: number): Promise<number> {
  const result = db.delete(plants).where(eq(plants.id, id)).run();
  return result.changes;
}
