// RED (Phase 4b) — real-SQLite smoke/integration walkthrough of the growth
// measurement lifecycle, written from the spec BEFORE the implementation. Drives
// the slice through lib/growth/queries.ts against a FRESH in-memory DB with FKs
// enforced (test-db helper). Imports fail until the db/schema/growth.ts table and
// the lib/growth modules are built (and the growth migration is generated).
//
// Walk: empty list -> log measurements on distinct + shared dates -> list ordered
// date DESC with same-date tie-break by row id DESC (SC-3, exact order) -> edit a
// measurement's value + date -> delete a SINGLE measurement (only that row gone,
// siblings + parent plant intact, no cascade up/out) -> delete the PLANT and
// assert its measurements are removed (FK ON DELETE CASCADE, D4/SC-5).
//
// @trace FR-GROWTH-01
// @trace FR-GROWTH-02
// @trace FR-GROWTH-03
// @trace FR-GROWTH-04
// @trace SC-3
// @trace SC-5
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { makeTestDb, type TestDb } from "@/tests/helpers/test-db";
import {
  insertPlant,
  getPlant,
  deletePlant,
} from "@/lib/plants/queries";
import { SPECIES_DEFAULT } from "@/lib/plants/validation";
import {
  deleteMeasurement,
  getMeasurement,
  insertMeasurement,
  listMeasurements,
  updateMeasurement,
} from "@/lib/growth/queries";

let db: TestDb;
let plantId: number;

beforeEach(async () => {
  db = makeTestDb();
  const plant = await insertPlant(db, {
    name: "Грошове дерево",
    species: SPECIES_DEFAULT,
    acquiredDate: null,
  });
  plantId = plant.id;
});
afterEach(() => {
  db.__raw.close();
});

describe("growth measurement lifecycle (real SQLite, FKs on)", () => {
  it("starts with an empty measurement list for a plant (FR-GROWTH-02 empty-state source)", async () => {
    expect(await listMeasurements(db, plantId)).toHaveLength(0);
  });

  it("logs a measurement with an explicit date, then lists it (FR-GROWTH-01)", async () => {
    const created = await insertMeasurement(db, {
      plantId,
      heightCm: 12.5,
      measuredOn: "2026-06-20",
    });
    expect(created.id).toBeGreaterThan(0);
    expect(created.plantId).toBe(plantId);

    const all = await listMeasurements(db, plantId);
    expect(all).toHaveLength(1);
    expect(all[0]?.heightCm).toBe(12.5);
    expect(all[0]?.measuredOn).toBe("2026-06-20");
  });

  it("reads a single measurement by id (FR-GROWTH-03 target)", async () => {
    const created = await insertMeasurement(db, {
      plantId,
      heightCm: 30,
      measuredOn: "2026-05-01",
    });
    const found = await getMeasurement(db, created.id);
    expect(found?.id).toBe(created.id);
    expect(found?.heightCm).toBe(30);
    expect(found?.measuredOn).toBe("2026-05-01");
  });

  it("returns null/undefined for a non-existent measurement id (not-found, never a throw)", async () => {
    const missing = await getMeasurement(db, 999_999);
    expect(missing == null).toBe(true);
  });

  it("lists measurements ordered by date DESC (most recent first) (FR-GROWTH-02, SC-3)", async () => {
    // Insert deliberately out of date order to prove the query orders, not the
    // insertion sequence.
    await insertMeasurement(db, { plantId, heightCm: 10, measuredOn: "2026-01-10" });
    await insertMeasurement(db, { plantId, heightCm: 30, measuredOn: "2026-06-20" });
    await insertMeasurement(db, { plantId, heightCm: 20, measuredOn: "2026-03-15" });

    const all = await listMeasurements(db, plantId);
    expect(all.map((m) => m.measuredOn)).toEqual([
      "2026-06-20",
      "2026-03-15",
      "2026-01-10",
    ]);
  });

  it("tie-breaks SAME-date measurements by row id DESC (most recently created first) (SC-3)", async () => {
    // Three rows on the SAME date: the order must be deterministic and reproducible
    // — newest row id first. We assert the EXACT order, not just membership.
    const first = await insertMeasurement(db, {
      plantId,
      heightCm: 10,
      measuredOn: "2026-06-20",
    });
    const second = await insertMeasurement(db, {
      plantId,
      heightCm: 11,
      measuredOn: "2026-06-20",
    });
    const third = await insertMeasurement(db, {
      plantId,
      heightCm: 12,
      measuredOn: "2026-06-20",
    });
    expect(third.id).toBeGreaterThan(second.id);
    expect(second.id).toBeGreaterThan(first.id);

    const all = await listMeasurements(db, plantId);
    expect(all.map((m) => m.id)).toEqual([third.id, second.id, first.id]);
  });

  it("combines date DESC with the same-date id-DESC tie-break across mixed dates (SC-3)", async () => {
    const olderA = await insertMeasurement(db, { plantId, heightCm: 5, measuredOn: "2026-01-01" });
    const olderB = await insertMeasurement(db, { plantId, heightCm: 6, measuredOn: "2026-01-01" });
    const newer = await insertMeasurement(db, { plantId, heightCm: 7, measuredOn: "2026-09-09" });

    const all = await listMeasurements(db, plantId);
    // Newest date first; then within 2026-01-01, the higher id (olderB) before olderA.
    expect(all.map((m) => m.id)).toEqual([newer.id, olderB.id, olderA.id]);
  });

  it("only lists THIS plant's measurements, not another plant's (FR-GROWTH-02)", async () => {
    const other = await insertPlant(db, {
      name: "Інша рослина",
      species: SPECIES_DEFAULT,
      acquiredDate: null,
    });
    await insertMeasurement(db, { plantId, heightCm: 10, measuredOn: "2026-06-20" });
    await insertMeasurement(db, { plantId: other.id, heightCm: 99, measuredOn: "2026-06-20" });

    expect(await listMeasurements(db, plantId)).toHaveLength(1);
    expect(await listMeasurements(db, other.id)).toHaveLength(1);
  });

  it("edits a measurement's value AND date (FR-GROWTH-03)", async () => {
    const created = await insertMeasurement(db, {
      plantId,
      heightCm: 12.5,
      measuredOn: "2026-06-20",
    });
    const updated = await updateMeasurement(db, created.id, {
      heightCm: 18.5,
      measuredOn: "2026-06-25",
    });
    expect(updated?.heightCm).toBe(18.5);
    expect(updated?.measuredOn).toBe("2026-06-25");

    const after = await getMeasurement(db, created.id);
    expect(after?.heightCm).toBe(18.5);
    expect(after?.measuredOn).toBe("2026-06-25");
    // The edit did not change the plant linkage.
    expect(after?.plantId).toBe(plantId);
  });
});

describe("growth delete safety (D4, SC-5, NFR-DATA-02)", () => {
  it("deletes a SINGLE measurement — only that row goes, siblings intact, no cascade to the plant (SC-5)", async () => {
    const keepA = await insertMeasurement(db, { plantId, heightCm: 10, measuredOn: "2026-01-01" });
    const target = await insertMeasurement(db, { plantId, heightCm: 20, measuredOn: "2026-02-02" });
    const keepB = await insertMeasurement(db, { plantId, heightCm: 30, measuredOn: "2026-03-03" });

    const removed = await deleteMeasurement(db, target.id);
    expect(removed).toBe(1); // exactly one row removed

    // The targeted row is gone...
    expect(await getMeasurement(db, target.id)).toBeFalsy();
    // ...its siblings remain...
    expect(await getMeasurement(db, keepA.id)).toBeTruthy();
    expect(await getMeasurement(db, keepB.id)).toBeTruthy();
    expect(await listMeasurements(db, plantId)).toHaveLength(2);
    // ...and the parent plant is untouched (no cascade UP).
    expect(await getPlant(db, plantId)).toBeTruthy();
  });

  it("deleting a non-existent measurement is a no-op, not a throw (row-gone)", async () => {
    await expect(deleteMeasurement(db, 424_242)).resolves.toBe(0);
  });

  it("deleting the PLANT cascades to its measurements (FK ON DELETE CASCADE, D4/SC-5, FR-GROWTH-04)", async () => {
    await insertMeasurement(db, { plantId, heightCm: 10, measuredOn: "2026-01-01" });
    await insertMeasurement(db, { plantId, heightCm: 20, measuredOn: "2026-02-02" });
    expect(await listMeasurements(db, plantId)).toHaveLength(2);

    await deletePlant(db, plantId);

    // The plant is gone and its measurements were removed by the DB-level cascade.
    expect(await getPlant(db, plantId)).toBeFalsy();
    const remaining = db.__raw
      .prepare("SELECT COUNT(*) AS n FROM growth_measurements WHERE plant_id = ?")
      .get(plantId) as { n: number };
    expect(remaining.n).toBe(0);
  });

  it("rejects a measurement against a non-existent plant id (FK constraint), not a silent orphan", async () => {
    // Inserting against a missing plant id violates the FK — the smoke flow proves
    // the constraint is enforced (FKs are ON in the test helper). The friendly
    // not-found translation is the action's job; here we assert the DB rejects it.
    await expect(
      insertMeasurement(db, { plantId: 987_654, heightCm: 10, measuredOn: "2026-06-20" }),
    ).rejects.toThrow();
  });
});
