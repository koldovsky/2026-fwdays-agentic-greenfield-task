// RED (Phase 4b, slice 7 add-reminders, tasks 1.7–1.8) — real-SQLite
// integration walkthrough of the reminders read path, written from the spec
// BEFORE the implementation. Drives lib/reminders/queries.ts (latest watering
// per plant via MAX(watered_on)) and lib/reminders/service.ts
// (`getHomeReminders`) against a FRESH in-memory DB (test-db helper). `today` is
// PINNED so the soon/healthy/overdue boundaries are exact and reproducible.
//
// Walk: seed plants with various latest-watering dates + intervals (one overdue,
// one soon, one healthy, one never-watered) -> assert getHomeReminders returns
// the correct dueRows (only soon/overdue), dueCount (soon+overdue incl.
// never-watered), allDone, and allRows (status per plant) -> dueRows are
// urgency-ordered most-overdue first -> latest-watering derives from the MOST
// RECENT event when a plant has several -> allDone is true with all-healthy AND
// with no plants.
//
// Imports fail until db/schema plants.interval_days, lib/plants/queries writes
// intervalDays, lib/reminders/queries.ts, and lib/reminders/service.ts are built
// (and the interval migration is generated). That is the intended RED.
//
// @trace FR-REM-02
// @trace FR-REM-03
// @trace FR-REM-04
// @trace FR-REM-06
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { makeTestDb, type TestDb } from "@/tests/helpers/test-db";
import { insertPlant } from "@/lib/plants/queries";
import { SPECIES_DEFAULT } from "@/lib/plants/validation";
import { insertWatering } from "@/lib/watering/queries";
import { latestWateringByPlant } from "@/lib/reminders/queries";
import { getHomeReminders } from "@/lib/reminders/service";

// Pinned "today" in Europe/Kiev — anchors every due/status assertion.
const TODAY = "2026-06-30";

let db: TestDb;

async function seedPlant(name: string, intervalDays: number): Promise<number> {
  const plant = await insertPlant(db, {
    name,
    species: SPECIES_DEFAULT,
    acquiredDate: null,
    intervalDays,
  });
  return plant.id;
}

beforeEach(() => {
  db = makeTestDb();
});
afterEach(() => {
  db.__raw.close();
});

describe("latestWateringByPlant — grouped MAX(watered_on) read (D5)", () => {
  it("returns the MOST RECENT watering date per plant, derived from many events", async () => {
    const id = await seedPlant("Фікус", 7);
    // Insert out of date order; the latest by date must win, not the last inserted.
    await insertWatering(db, { plantId: id, wateredOn: "2026-06-01", note: null });
    await insertWatering(db, { plantId: id, wateredOn: "2026-06-25", note: null });
    await insertWatering(db, { plantId: id, wateredOn: "2026-06-10", note: null });

    const map = await latestWateringByPlant(db);
    expect(map.get(id)).toBe("2026-06-25");
  });

  it("omits (or yields no date for) a plant that has never been watered", async () => {
    const id = await seedPlant("Ніколи не полита", 7);
    const map = await latestWateringByPlant(db);
    // A never-watered plant has no entry — the service treats the absence as null.
    expect(map.get(id)).toBeUndefined();
  });
});

describe("getHomeReminders — due list, count, allDone, allRows (FR-REM-02..04, FR-REM-06)", () => {
  it("classifies each plant and counts only the due ones (soon + overdue, incl. never-watered)", async () => {
    const overdue = await seedPlant("Прострочена", 7); // last 06-20 -> due 06-27 < today
    const soon = await seedPlant("Скоро", 7); // last 06-23 -> due 06-30 == today
    const healthy = await seedPlant("Здорова", 7); // last 06-28 -> due 07-05 >= today+2
    const never = await seedPlant("Ніколи", 7); // no events -> overdue

    await insertWatering(db, { plantId: overdue, wateredOn: "2026-06-20", note: null });
    await insertWatering(db, { plantId: soon, wateredOn: "2026-06-23", note: null });
    await insertWatering(db, { plantId: healthy, wateredOn: "2026-06-28", note: null });

    const result = await getHomeReminders(db, TODAY);

    // Due count = soon + overdue + never-watered (overdue) = 3; healthy excluded.
    expect(result.dueCount).toBe(3);
    expect(result.allDone).toBe(false);

    // dueRows contain only the due plants — the healthy one is absent.
    const dueIds = result.dueRows.map((r) => r.plant.id);
    expect(dueIds).toContain(overdue);
    expect(dueIds).toContain(soon);
    expect(dueIds).toContain(never);
    expect(dueIds).not.toContain(healthy);
    expect(result.dueRows).toHaveLength(3);

    // allRows carries a status for EVERY plant (feeds the card pills).
    expect(result.allRows).toHaveLength(4);
    const statusOf = (id: number) =>
      result.allRows.find((r) => r.plant.id === id)?.status;
    expect(statusOf(overdue)).toBe("overdue");
    expect(statusOf(soon)).toBe("soon");
    expect(statusOf(healthy)).toBe("healthy");
    expect(statusOf(never)).toBe("overdue");
  });

  it("orders dueRows most-overdue first, soon last (never-watered to the top)", async () => {
    const overdue5 = await seedPlant("Прострочена-5", 7); // last 06-18 -> due 06-25, overdue 5
    const overdue1 = await seedPlant("Прострочена-1", 7); // last 06-22 -> due 06-29, overdue 1
    const soon = await seedPlant("Скоро", 7); // last 06-23 -> due 06-30 (today)
    const never = await seedPlant("Ніколи", 7); // never watered -> top

    await insertWatering(db, { plantId: overdue5, wateredOn: "2026-06-18", note: null });
    await insertWatering(db, { plantId: overdue1, wateredOn: "2026-06-22", note: null });
    await insertWatering(db, { plantId: soon, wateredOn: "2026-06-23", note: null });

    const result = await getHomeReminders(db, TODAY);
    const orderedIds = result.dueRows.map((r) => r.plant.id);
    // Never-watered first (strongest signal), then 5-days-overdue, then 1-day, then soon.
    expect(orderedIds).toEqual([never, overdue5, overdue1, soon]);
  });

  it("derives status from the LATEST event when a plant has several waterings", async () => {
    // An old event would read overdue, but the most recent (06-28) makes it healthy.
    const id = await seedPlant("Багато поливів", 7);
    await insertWatering(db, { plantId: id, wateredOn: "2026-05-01", note: null });
    await insertWatering(db, { plantId: id, wateredOn: "2026-06-28", note: null });

    const result = await getHomeReminders(db, TODAY);
    expect(result.allRows.find((r) => r.plant.id === id)?.status).toBe("healthy");
    expect(result.dueRows.map((r) => r.plant.id)).not.toContain(id);
  });
});

describe("getHomeReminders — allDone (FR-REM-06)", () => {
  it("is allDone with dueCount 0 when every plant is healthy", async () => {
    const a = await seedPlant("Здорова A", 7);
    const b = await seedPlant("Здорова B", 7);
    await insertWatering(db, { plantId: a, wateredOn: "2026-06-28", note: null }); // due 07-05
    await insertWatering(db, { plantId: b, wateredOn: "2026-06-29", note: null }); // due 07-06

    const result = await getHomeReminders(db, TODAY);
    expect(result.dueCount).toBe(0);
    expect(result.dueRows).toHaveLength(0);
    expect(result.allDone).toBe(true);
    expect(result.allRows).toHaveLength(2);
  });

  it("is allDone with no plants at all (no rows, count 0, never a raw error)", async () => {
    const result = await getHomeReminders(db, TODAY);
    expect(result.dueCount).toBe(0);
    expect(result.dueRows).toHaveLength(0);
    expect(result.allRows).toHaveLength(0);
    expect(result.allDone).toBe(true);
  });
});
