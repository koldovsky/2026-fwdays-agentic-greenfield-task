// Thin Drizzle reads/writes for growth measurements (design D5). No business
// rules here — the db handle is INJECTED as the first param so tests drive these
// against a fresh in-memory DB and the actions pass the singleton client. List
// order is date descending, tie-broken by row id descending — total and
// reproducible (SC-3).
import { desc, eq } from "drizzle-orm";

import type { DB } from "@/db/client";
import { growthMeasurements, type Measurement } from "@/db/schema/growth";

// Accept any Drizzle better-sqlite3 instance bound to the schema (the app
// singleton or a test DB), so queries.ts stays decoupled from the client.
type GrowthDb = Pick<DB, "select" | "insert" | "update" | "delete">;

/** Validated values for an insert/update (the parsed number + ISO date). */
export interface MeasurementValues {
  plantId: number;
  heightCm: number;
  measuredOn: string;
}

/** A plant's measurements, ordered date DESC then id DESC (SC-3). */
export async function listMeasurements(
  db: GrowthDb,
  plantId: number,
): Promise<Measurement[]> {
  return db
    .select()
    .from(growthMeasurements)
    .where(eq(growthMeasurements.plantId, plantId))
    .orderBy(desc(growthMeasurements.measuredOn), desc(growthMeasurements.id))
    .all();
}

/**
 * One measurement by id, or undefined when it does not exist (not-found).
 *
 * Read/test helper: not wired into a production write path (edit/delete derive
 * their not-found signal from UPDATE/DELETE returning/changes, not a prior
 * read). Retained for the upcoming chart slice and exercised by the growth
 * integration/action tests — intentional, not an oversight.
 */
export async function getMeasurement(
  db: GrowthDb,
  id: number,
): Promise<Measurement | undefined> {
  return db
    .select()
    .from(growthMeasurements)
    .where(eq(growthMeasurements.id, id))
    .get();
}

/**
 * Insert a measurement; returns the created row (with its new id). A
 * non-existent `plantId` is rejected by the FK constraint (throws) — the action
 * catches and translates it to a friendly not-found result (design D4).
 */
export async function insertMeasurement(
  db: GrowthDb,
  values: MeasurementValues,
): Promise<Measurement> {
  return db
    .insert(growthMeasurements)
    .values({
      plantId: values.plantId,
      heightCm: values.heightCm,
      measuredOn: values.measuredOn,
    })
    .returning()
    .get();
}

/**
 * Update a measurement's height + date; returns the updated row, or undefined
 * when no row matched (deleted in another tab — a not-found signal). Does not
 * change the plant linkage.
 */
export async function updateMeasurement(
  db: GrowthDb,
  id: number,
  values: Pick<MeasurementValues, "heightCm" | "measuredOn">,
): Promise<Measurement | undefined> {
  return db
    .update(growthMeasurements)
    .set({ heightCm: values.heightCm, measuredOn: values.measuredOn })
    .where(eq(growthMeasurements.id, id))
    .returning()
    .get();
}

/**
 * Delete a single measurement by id. A missing id is a no-op (no throw).
 * Returns the number of rows removed so the service can signal not-found. Only
 * the one row goes — there is no cascade up/out (SC-5).
 */
export async function deleteMeasurement(
  db: GrowthDb,
  id: number,
): Promise<number> {
  const result = db
    .delete(growthMeasurements)
    .where(eq(growthMeasurements.id, id))
    .run();
  return result.changes;
}
