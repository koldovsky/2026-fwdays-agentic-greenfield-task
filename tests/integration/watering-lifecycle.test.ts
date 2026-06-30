// RED (Phase 4b) — real-SQLite smoke/integration walkthrough of the watering
// event lifecycle, written from the spec BEFORE the implementation. Drives the
// slice through lib/watering/queries.ts against a FRESH in-memory DB with FKs
// enforced (test-db helper). Imports fail until the db/schema/watering.ts table
// and the lib/watering modules are built (and the watering migration is
// generated).
//
// Walk: empty list -> log waterings WITH and WITHOUT a note on distinct + shared
// dates -> list ordered date DESC with same-date tie-break by row id DESC (SC-3,
// exact order) -> per-plant isolation -> edit a watering's date + note (incl.
// CLEARING the note to NULL) -> delete a SINGLE watering (only that row gone,
// siblings + parent plant + its measurements intact, no cascade up/out) -> delete
// the PLANT and assert its waterings cascade-removed (FK ON DELETE CASCADE,
// D4/SC-5) while another plant's data survives.
//
// @trace FR-WATER-01
// @trace FR-WATER-02
// @trace FR-WATER-03
// @trace FR-WATER-04
// @trace FR-WATER-05
// @trace SC-3
// @trace SC-5
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { makeTestDb, type TestDb } from "@/tests/helpers/test-db";
import { insertPlant, getPlant, deletePlant } from "@/lib/plants/queries";
import { SPECIES_DEFAULT } from "@/lib/plants/validation";
// The growth queries are reused to PROVE a watering delete does NOT touch a
// plant's measurements, and that a plant delete cascades BOTH children (D4, SC-5).
import {
  insertMeasurement,
  listMeasurements,
} from "@/lib/growth/queries";
import {
  deleteWatering,
  getWatering,
  insertWatering,
  listWaterings,
  updateWatering,
} from "@/lib/watering/queries";

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

describe("watering event lifecycle (real SQLite, FKs on)", () => {
  it("starts with an empty watering list for a plant (FR-WATER-03 empty-state source)", async () => {
    expect(await listWaterings(db, plantId)).toHaveLength(0);
  });

  it("logs a watering WITH a note, then lists it (FR-WATER-01, FR-WATER-02)", async () => {
    const created = await insertWatering(db, {
      plantId,
      wateredOn: "2026-06-20",
      note: "полив дощовою водою",
    });
    expect(created.id).toBeGreaterThan(0);
    expect(created.plantId).toBe(plantId);

    const all = await listWaterings(db, plantId);
    expect(all).toHaveLength(1);
    expect(all[0]?.wateredOn).toBe("2026-06-20");
    expect(all[0]?.note).toBe("полив дощовою водою");
  });

  it("logs a watering WITHOUT a note — note persists as NULL, not '' (FR-WATER-02)", async () => {
    const created = await insertWatering(db, {
      plantId,
      wateredOn: "2026-06-21",
      note: null,
    });
    expect(created.note).toBeNull();

    const found = await getWatering(db, created.id);
    expect(found?.note).toBeNull();
    expect(found?.note).not.toBe("");
  });

  it("reads a single watering by id (FR-WATER-04 target)", async () => {
    const created = await insertWatering(db, {
      plantId,
      wateredOn: "2026-05-01",
      note: null,
    });
    const found = await getWatering(db, created.id);
    expect(found?.id).toBe(created.id);
    expect(found?.wateredOn).toBe("2026-05-01");
  });

  it("returns null/undefined for a non-existent watering id (not-found, never a throw)", async () => {
    const missing = await getWatering(db, 999_999);
    expect(missing == null).toBe(true);
  });

  it("lists waterings ordered by date DESC (most recent first) (FR-WATER-03, SC-3)", async () => {
    // Insert deliberately out of date order to prove the query orders, not the
    // insertion sequence.
    await insertWatering(db, { plantId, wateredOn: "2026-01-10", note: null });
    await insertWatering(db, { plantId, wateredOn: "2026-06-20", note: null });
    await insertWatering(db, { plantId, wateredOn: "2026-03-15", note: null });

    const all = await listWaterings(db, plantId);
    expect(all.map((w) => w.wateredOn)).toEqual([
      "2026-06-20",
      "2026-03-15",
      "2026-01-10",
    ]);
  });

  it("tie-breaks SAME-date waterings by row id DESC (most recently created first) (SC-3)", async () => {
    // Three rows on the SAME date: the order must be deterministic and
    // reproducible — newest row id first. We assert the EXACT order.
    const first = await insertWatering(db, {
      plantId,
      wateredOn: "2026-06-20",
      note: "перший",
    });
    const second = await insertWatering(db, {
      plantId,
      wateredOn: "2026-06-20",
      note: null,
    });
    const third = await insertWatering(db, {
      plantId,
      wateredOn: "2026-06-20",
      note: "третій",
    });
    expect(third.id).toBeGreaterThan(second.id);
    expect(second.id).toBeGreaterThan(first.id);

    const all = await listWaterings(db, plantId);
    expect(all.map((w) => w.id)).toEqual([third.id, second.id, first.id]);
  });

  it("combines date DESC with the same-date id-DESC tie-break across mixed dates (SC-3)", async () => {
    const olderA = await insertWatering(db, { plantId, wateredOn: "2026-01-01", note: null });
    const olderB = await insertWatering(db, { plantId, wateredOn: "2026-01-01", note: null });
    const newer = await insertWatering(db, { plantId, wateredOn: "2026-09-09", note: null });

    const all = await listWaterings(db, plantId);
    // Newest date first; then within 2026-01-01, the higher id (olderB) before olderA.
    expect(all.map((w) => w.id)).toEqual([newer.id, olderB.id, olderA.id]);
  });

  it("only lists THIS plant's waterings, not another plant's (per-plant isolation, FR-WATER-03)", async () => {
    const other = await insertPlant(db, {
      name: "Інша рослина",
      species: SPECIES_DEFAULT,
      acquiredDate: null,
    });
    await insertWatering(db, { plantId, wateredOn: "2026-06-20", note: null });
    await insertWatering(db, { plantId: other.id, wateredOn: "2026-06-20", note: "чужий" });

    expect(await listWaterings(db, plantId)).toHaveLength(1);
    expect(await listWaterings(db, other.id)).toHaveLength(1);
    expect((await listWaterings(db, other.id))[0]?.note).toBe("чужий");
  });

  it("edits a watering's date AND note (FR-WATER-04)", async () => {
    const created = await insertWatering(db, {
      plantId,
      wateredOn: "2026-06-20",
      note: "старий запис",
    });
    const updated = await updateWatering(db, created.id, {
      wateredOn: "2026-06-25",
      note: "оновлений запис",
    });
    expect(updated?.wateredOn).toBe("2026-06-25");
    expect(updated?.note).toBe("оновлений запис");

    const after = await getWatering(db, created.id);
    expect(after?.wateredOn).toBe("2026-06-25");
    expect(after?.note).toBe("оновлений запис");
    // The edit did not change the plant linkage.
    expect(after?.plantId).toBe(plantId);
  });

  it("clears the note on edit — note becomes NULL, the rest unchanged (FR-WATER-04, FR-WATER-02)", async () => {
    const created = await insertWatering(db, {
      plantId,
      wateredOn: "2026-06-20",
      note: "буде стерто",
    });
    const updated = await updateWatering(db, created.id, {
      wateredOn: "2026-06-20",
      note: null,
    });
    expect(updated?.note).toBeNull();
    expect(updated?.wateredOn).toBe("2026-06-20");

    const after = await getWatering(db, created.id);
    expect(after?.note).toBeNull();
    expect(after?.note).not.toBe("");
  });
});

describe("watering delete safety (D4, SC-5, NFR-DATA-02)", () => {
  it("deletes a SINGLE watering — only that row goes, siblings + plant + its measurements intact (SC-5)", async () => {
    const keepA = await insertWatering(db, { plantId, wateredOn: "2026-01-01", note: null });
    const target = await insertWatering(db, { plantId, wateredOn: "2026-02-02", note: "ціль" });
    const keepB = await insertWatering(db, { plantId, wateredOn: "2026-03-03", note: null });
    // The plant also has a growth measurement — a watering delete must NOT touch it.
    const measurement = await insertMeasurement(db, {
      plantId,
      heightCm: 12.5,
      measuredOn: "2026-02-02",
    });

    const removed = await deleteWatering(db, target.id);
    expect(removed).toBe(1); // exactly one row removed

    // The targeted row is gone...
    expect(await getWatering(db, target.id)).toBeFalsy();
    // ...its sibling waterings remain...
    expect(await getWatering(db, keepA.id)).toBeTruthy();
    expect(await getWatering(db, keepB.id)).toBeTruthy();
    expect(await listWaterings(db, plantId)).toHaveLength(2);
    // ...the parent plant is untouched (no cascade UP)...
    expect(await getPlant(db, plantId)).toBeTruthy();
    // ...and the plant's growth measurement is untouched (no cascade ACROSS, SC-5).
    expect(await listMeasurements(db, plantId)).toHaveLength(1);
    expect((await listMeasurements(db, plantId))[0]?.id).toBe(measurement.id);
  });

  it("deleting a non-existent watering is a no-op, not a throw (row-gone)", async () => {
    await expect(deleteWatering(db, 424_242)).resolves.toBe(0);
  });

  it("deleting the PLANT cascades to its waterings (and measurements), other plants intact (FK ON DELETE CASCADE, D4/SC-5)", async () => {
    // Plant A gets waterings + a measurement; plant B gets its own watering.
    await insertWatering(db, { plantId, wateredOn: "2026-01-01", note: null });
    await insertWatering(db, { plantId, wateredOn: "2026-02-02", note: "A" });
    await insertMeasurement(db, { plantId, heightCm: 10, measuredOn: "2026-01-01" });
    expect(await listWaterings(db, plantId)).toHaveLength(2);

    const other = await insertPlant(db, {
      name: "Інша рослина",
      species: SPECIES_DEFAULT,
      acquiredDate: null,
    });
    await insertWatering(db, { plantId: other.id, wateredOn: "2026-04-04", note: "B" });

    await deletePlant(db, plantId);

    // Plant A is gone and BOTH its children cascade-removed by the DB.
    expect(await getPlant(db, plantId)).toBeFalsy();
    const remaining = db.__raw
      .prepare("SELECT COUNT(*) AS n FROM watering_events WHERE plant_id = ?")
      .get(plantId) as { n: number };
    expect(remaining.n).toBe(0);
    expect(await listMeasurements(db, plantId)).toHaveLength(0);

    // Plant B's data survives — the cascade is scoped to the deleted plant.
    expect(await getPlant(db, other.id)).toBeTruthy();
    expect(await listWaterings(db, other.id)).toHaveLength(1);
  });

  it("rejects a watering against a non-existent plant id (FK constraint), not a silent orphan", async () => {
    // Inserting against a missing plant id violates the FK — the smoke flow
    // proves the constraint is enforced (FKs are ON in the test helper). The
    // friendly not-found translation is the action's job; here the DB rejects it.
    await expect(
      insertWatering(db, { plantId: 987_654, wateredOn: "2026-06-20", note: null }),
    ).rejects.toThrow();
  });
});
