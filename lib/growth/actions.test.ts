// RED (Phase 4b) — server-action contract, written from the spec BEFORE the
// implementation. The measurement actions must: guard -> validate -> service ->
// revalidate, and ALWAYS return the shared ActionResult, NEVER throw raw on user
// input. On invalid height/date they return { ok:false, fieldErrors, values }
// (echoing the submitted values for repopulation); on valid input they return
// { ok:true } and revalidate the plant detail path. Imports fail until
// lib/growth/actions.ts (and the schema + lib/growth modules) are built.
//
// @trace FR-GROWTH-01
// @trace FR-GROWTH-03
// @trace FR-GROWTH-04
// @trace FR-SHELL-03
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Server actions call next/cache's revalidatePath; stub it so the action runs
// outside a request scope without throwing (we assert the ActionResult contract
// and the path it revalidates, not the revalidation side effect).
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Point the Drizzle client at a fresh temp file DB and apply migrations BEFORE
// importing the action (which transitively imports the singleton db/client).
beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), "growth-actions-"));
  process.env.DATABASE_URL = `file:${join(dir, "actions.db")}`;
});

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

async function migrateDb() {
  if (existsSync(join(process.cwd(), "db", "migrations"))) {
    const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
    const { db } = await import("@/db/client");
    migrate(db, { migrationsFolder: join(process.cwd(), "db", "migrations") });
  }
}

/** Create a real plant so a valid-path measurement insert satisfies the FK. */
async function seedPlant(): Promise<number> {
  const { insertPlant } = await import("@/lib/plants/queries");
  const { SPECIES_DEFAULT } = await import("@/lib/plants/validation");
  const { db } = await import("@/db/client");
  const plant = await insertPlant(db, {
    name: "Грошове дерево",
    species: SPECIES_DEFAULT,
    acquiredDate: null,
  });
  return plant.id;
}

describe("createMeasurementAction", () => {
  beforeEach(migrateDb);
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns { ok:false, fieldErrors, values } on an invalid height, never throws (FR-GROWTH-05, FR-SHELL-03)", async () => {
    const { createMeasurementAction } = await import("@/lib/growth/actions");
    const plantId = await seedPlant();

    const result = await createMeasurementAction(
      plantId,
      form({ heightCm: "abc", measuredOn: "2026-06-20" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.heightCm).toBeTruthy();
    // echoes submitted values so the uncontrolled form repopulates (FR-SHELL-03)
    expect(result.values?.heightCm).toBe("abc");
    expect(result.values?.measuredOn).toBe("2026-06-20");
  });

  it("surfaces a future date as an inline date field error (SC-2), not a throw", async () => {
    const { createMeasurementAction } = await import("@/lib/growth/actions");
    const plantId = await seedPlant();

    const result = await createMeasurementAction(
      plantId,
      form({ heightCm: "10", measuredOn: "2999-01-01" }),
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.measuredOn).toBeTruthy();
  });

  it("returns { ok:true } on valid input (FR-GROWTH-01)", async () => {
    const { createMeasurementAction } = await import("@/lib/growth/actions");
    const plantId = await seedPlant();

    const result = await createMeasurementAction(
      plantId,
      form({ heightCm: "12,5", measuredOn: "2026-06-20" }),
    );
    expect(result.ok).toBe(true);
  });

  it("revalidates the PLANT DETAIL path on success (D5)", async () => {
    const { revalidatePath } = await import("next/cache");
    const { createMeasurementAction } = await import("@/lib/growth/actions");
    const plantId = await seedPlant();

    await createMeasurementAction(plantId, form({ heightCm: "10", measuredOn: "2026-06-20" }));
    expect(revalidatePath).toHaveBeenCalledWith(`/plants/${plantId}`);
  });

  it("rejects a measurement against a non-existent plant with a friendly result, never a raw 500 (NFR-DATA-02)", async () => {
    const { createMeasurementAction } = await import("@/lib/growth/actions");

    const result = await createMeasurementAction(
      987_654,
      form({ heightCm: "10", measuredOn: "2026-06-20" }),
    );
    expect(result.ok).toBe(false);
  });
});

// A measurement deleted in another tab is indistinguishable from a missing id by
// the time the action runs (NFR-DATA-02): the edit/delete actions must resolve to
// a not-found ActionResult — never a thrown 500 and never a resurrected row.
describe("updateMeasurementAction / deleteMeasurementAction — not-found (FR-GROWTH-03, FR-GROWTH-04)", () => {
  beforeEach(migrateDb);
  afterEach(() => {
    vi.clearAllMocks();
  });

  const MISSING_ID = 987_654;

  it("updateMeasurementAction(missingId, validForm) returns not-found, no resurrected row", async () => {
    const { updateMeasurementAction } = await import("@/lib/growth/actions");
    const { getMeasurement } = await import("@/lib/growth/queries");
    const { db } = await import("@/db/client");

    const result = await updateMeasurementAction(
      MISSING_ID,
      form({ heightCm: "10", measuredOn: "2026-06-20" }),
    );
    expect(result.ok).toBe(false);

    // The row was NOT created by the failed update (no upsert/resurrection).
    expect(await getMeasurement(db, MISSING_ID)).toBeFalsy();
  });

  it("updateMeasurementAction returns { ok:false, fieldErrors, values } on an invalid edit, never throws", async () => {
    const { updateMeasurementAction } = await import("@/lib/growth/actions");

    const result = await updateMeasurementAction(
      MISSING_ID,
      form({ heightCm: "12.55", measuredOn: "2026-06-20" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    // Invalid input is rejected by the validation gate BEFORE the not-found
    // lookup — an inline field error, never a throw.
    expect(result.fieldErrors?.heightCm).toBeTruthy();
  });

  it("deleteMeasurementAction(missingId) returns a not-found result (not a throw)", async () => {
    const { deleteMeasurementAction } = await import("@/lib/growth/actions");

    const result = await deleteMeasurementAction(MISSING_ID);
    expect(result.ok).toBe(false);
  });

  it("deleteMeasurementAction rejects a malformed id (float/0/negative) as not-found, never a write", async () => {
    const { deleteMeasurementAction } = await import("@/lib/growth/actions");

    expect((await deleteMeasurementAction(0)).ok).toBe(false);
    expect((await deleteMeasurementAction(-5)).ok).toBe(false);
    expect((await deleteMeasurementAction(1.5)).ok).toBe(false);
  });
});
