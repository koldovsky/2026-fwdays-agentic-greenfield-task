// Thin Drizzle read for the reminders home (design D5). One grouped query returns
// the latest `watered_on` per plant (MAX(watered_on) GROUP BY plant_id), so the
// home load stays two queries (plants + latest-waterings) regardless of plant
// count (NFR-PERF-01). The db handle is INJECTED as the first param so tests drive
// it against a fresh in-memory DB and the service passes the singleton client.
//
// @trace FR-REM-02
import { max } from "drizzle-orm";

import type { DB } from "@/db/client";
import { wateringEvents } from "@/db/schema/watering";

type RemindersDb = Pick<DB, "select">;

/**
 * The latest watering date per plant as a `Map<plantId, YYYY-MM-DD>`. A plant
 * that has never been watered has NO entry (the service treats the absence as a
 * null last-watering date — never watered -> overdue). Dates compare correctly
 * under MAX because they are zero-padded ISO strings.
 */
export async function latestWateringByPlant(
  db: RemindersDb,
): Promise<Map<number, string>> {
  const rows = await db
    .select({
      plantId: wateringEvents.plantId,
      latest: max(wateringEvents.wateredOn),
    })
    .from(wateringEvents)
    .groupBy(wateringEvents.plantId)
    .all();

  const map = new Map<number, string>();
  for (const row of rows) {
    if (row.latest != null) map.set(row.plantId, row.latest);
  }
  return map;
}
