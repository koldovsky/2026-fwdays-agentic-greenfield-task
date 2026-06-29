// RED (Phase 4b) — real-SQLite smoke/integration walkthrough of the plant
// lifecycle, written from the spec BEFORE the implementation. Drives the slice
// through lib/plants/queries.ts + service.ts against a FRESH in-memory DB with
// FKs enforced (test-db helper). Imports fail until the schema + lib/plants
// modules are built.
//
// Walk: empty list -> create -> list -> detail by id -> edit -> delete -> gone,
// plus a directly-inserted child row to prove ON DELETE CASCADE intent (D5).
//
// @trace FR-PLANT-01
// @trace FR-PLANT-04
// @trace FR-PLANT-05
// @trace FR-PLANT-06
// @trace FR-PLANT-07
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { makeTestDb, type TestDb } from "@/tests/helpers/test-db";
import {
  deletePlant,
  getPlant,
  insertPlant,
  listPlants,
  updatePlant,
} from "@/lib/plants/queries";
import { SPECIES_DEFAULT } from "@/lib/plants/validation";

let db: TestDb;

beforeEach(() => {
  db = makeTestDb();
});
afterEach(() => {
  db.__raw.close();
});

describe("plant lifecycle (real SQLite, FKs on)", () => {
  it("starts with an empty list (FR-PLANT-04 / FR-PLANT-08 empty state source)", async () => {
    expect(await listPlants(db)).toHaveLength(0);
  });

  it("creates a plant, then lists it (FR-PLANT-01, FR-PLANT-04)", async () => {
    const created = await insertPlant(db, {
      name: "Фікус",
      species: SPECIES_DEFAULT,
      acquiredDate: null,
    });
    expect(created.id).toBeGreaterThan(0);

    const all = await listPlants(db);
    expect(all).toHaveLength(1);
    expect(all[0]?.name).toBe("Фікус");
    expect(all[0]?.species).toBe(SPECIES_DEFAULT);
  });

  it("reads a single plant by id (FR-PLANT-05)", async () => {
    const created = await insertPlant(db, {
      name: "Монстера",
      species: "Monstera deliciosa",
      acquiredDate: "2024-05-01",
    });
    const found = await getPlant(db, created.id);
    expect(found?.id).toBe(created.id);
    expect(found?.name).toBe("Монстера");
    expect(found?.acquiredDate).toBe("2024-05-01");
  });

  it("returns null/undefined for a non-existent id (not-found, never a throw)", async () => {
    const missing = await getPlant(db, 999_999);
    expect(missing == null).toBe(true);
  });

  it("edits name, species and acquired date (FR-PLANT-06)", async () => {
    const created = await insertPlant(db, {
      name: "Старе ім'я",
      species: SPECIES_DEFAULT,
      acquiredDate: null,
    });
    await updatePlant(db, created.id, {
      name: "Нове ім'я",
      species: "Crassula ovata",
      acquiredDate: "2023-12-31",
    });
    const after = await getPlant(db, created.id);
    expect(after?.name).toBe("Нове ім'я");
    expect(after?.species).toBe("Crassula ovata");
    expect(after?.acquiredDate).toBe("2023-12-31");
  });

  it("clears the acquired date on edit (FR-PLANT-06)", async () => {
    const created = await insertPlant(db, {
      name: "Кактус",
      species: SPECIES_DEFAULT,
      acquiredDate: "2022-01-01",
    });
    await updatePlant(db, created.id, {
      name: "Кактус",
      species: SPECIES_DEFAULT,
      acquiredDate: null,
    });
    const after = await getPlant(db, created.id);
    expect(after?.acquiredDate).toBeNull();
  });

  it("deletes a plant and it is gone from the list (FR-PLANT-07)", async () => {
    const created = await insertPlant(db, {
      name: "Тимчасова",
      species: SPECIES_DEFAULT,
      acquiredDate: null,
    });
    await deletePlant(db, created.id);

    expect(await getPlant(db, created.id)).toBeFalsy();
    expect(await listPlants(db)).toHaveLength(0);
  });

  it("deleting a non-existent plant is a no-op, not a throw (FR-PLANT-07 row-gone)", async () => {
    await expect(deletePlant(db, 424_242)).resolves.not.toThrow();
  });

  it("does not affect OTHER plants when one is deleted (SC-5 / NFR-DATA-02)", async () => {
    const a = await insertPlant(db, { name: "A", species: SPECIES_DEFAULT, acquiredDate: null });
    const b = await insertPlant(db, { name: "B", species: SPECIES_DEFAULT, acquiredDate: null });
    await deletePlant(db, a.id);
    expect(await getPlant(db, b.id)).toBeTruthy();
    expect(await listPlants(db)).toHaveLength(1);
  });
});

describe("delete cascade direction (D5, FR-PLANT-07, SC-5)", () => {
  // This slice owns the parent table and the cascade DIRECTION; child tables are
  // added by later slices. We prove the INTENT: a child row whose FK references
  // plants.id ON DELETE CASCADE is removed when its parent plant is deleted.
  //
  // The child table does not exist in this slice's schema yet, so we create a
  // minimal one declaring exactly that FK against the real plants table, then
  // assert SQLite cascades the delete (FKs are ON in the test helper). This pins
  // the contract the growth/watering slices must honor.
  it("ON DELETE CASCADE removes a plant's child rows when the plant is deleted", async () => {
    const plant = await insertPlant(db, {
      name: "З дітьми",
      species: SPECIES_DEFAULT,
      acquiredDate: null,
    });

    db.__raw.exec(`
      CREATE TABLE IF NOT EXISTS _cascade_probe (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
        value TEXT
      );
    `);
    db.__raw
      .prepare("INSERT INTO _cascade_probe (plant_id, value) VALUES (?, ?)")
      .run(plant.id, "захід поливу / вимір");

    const before = db.__raw
      .prepare("SELECT COUNT(*) AS n FROM _cascade_probe WHERE plant_id = ?")
      .get(plant.id) as { n: number };
    expect(before.n).toBe(1);

    await deletePlant(db, plant.id);

    const after = db.__raw
      .prepare("SELECT COUNT(*) AS n FROM _cascade_probe WHERE plant_id = ?")
      .get(plant.id) as { n: number };
    expect(after.n).toBe(0); // cascade removed the child (SC-5)
  });
});
