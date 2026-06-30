// Thin Drizzle reads/writes for watering events (design D5). No business rules
// here — the db handle is INJECTED as the first param so tests drive these
// against a fresh in-memory DB and the actions pass the singleton client. List
// order is date descending, tie-broken by row id descending — total and
// reproducible (SC-3).
import { desc, eq } from "drizzle-orm";

import type { DB } from "@/db/client";
import { wateringEvents, type Watering } from "@/db/schema/watering";

// Accept any Drizzle better-sqlite3 instance bound to the schema (the app
// singleton or a test DB), so queries.ts stays decoupled from the client.
type WateringDb = Pick<DB, "select" | "insert" | "update" | "delete">;

/** Validated values for an insert/update (the ISO date + optional note). */
export interface WateringValues {
  plantId: number;
  wateredOn: string;
  note: string | null;
}

/** A plant's waterings, ordered date DESC then id DESC (SC-3). */
export async function listWaterings(
  db: WateringDb,
  plantId: number,
): Promise<Watering[]> {
  return db
    .select()
    .from(wateringEvents)
    .where(eq(wateringEvents.plantId, plantId))
    .orderBy(desc(wateringEvents.wateredOn), desc(wateringEvents.id))
    .all();
}

/**
 * One watering by id, or undefined when it does not exist (not-found).
 *
 * Read/test helper: not wired into a production write path (edit/delete derive
 * their not-found signal from UPDATE/DELETE returning/changes, not a prior
 * read). Retained for a potential later slice and exercised by the watering
 * integration/action tests — intentional, not an oversight.
 */
export async function getWatering(
  db: WateringDb,
  id: number,
): Promise<Watering | undefined> {
  return db
    .select()
    .from(wateringEvents)
    .where(eq(wateringEvents.id, id))
    .get();
}

/**
 * Insert a watering; returns the created row (with its new id). A non-existent
 * `plantId` is rejected by the FK constraint (throws) — the action catches and
 * translates it to a friendly not-found result (design D4).
 */
export async function insertWatering(
  db: WateringDb,
  values: WateringValues,
): Promise<Watering> {
  return db
    .insert(wateringEvents)
    .values({
      plantId: values.plantId,
      wateredOn: values.wateredOn,
      note: values.note,
    })
    .returning()
    .get();
}

/**
 * Update a watering's date + note; returns the updated row, or undefined when no
 * row matched (deleted in another tab — a not-found signal). Does not change the
 * plant linkage.
 */
export async function updateWatering(
  db: WateringDb,
  id: number,
  values: Pick<WateringValues, "wateredOn" | "note">,
): Promise<Watering | undefined> {
  return db
    .update(wateringEvents)
    .set({ wateredOn: values.wateredOn, note: values.note })
    .where(eq(wateringEvents.id, id))
    .returning()
    .get();
}

/**
 * Delete a single watering by id. A missing id is a no-op (no throw). Returns the
 * number of rows removed so the service can signal not-found. Only the one row
 * goes — there is no cascade up/out (SC-5).
 */
export async function deleteWatering(
  db: WateringDb,
  id: number,
): Promise<number> {
  const result = db
    .delete(wateringEvents)
    .where(eq(wateringEvents.id, id))
    .run();
  return result.changes;
}
