// RED (Phase 4b) — server-action contract, written from the spec BEFORE the
// implementation. The watering actions must: guard -> validate -> service ->
// revalidate, and ALWAYS return the shared ActionResult, NEVER throw raw on user
// input. On an invalid date/note they return { ok:false, fieldErrors, values }
// (echoing the submitted values for repopulation); on valid input they return
// { ok:true } and revalidate the plant detail path. A non-existent plant on
// logging, and an edit/delete of a missing watering id, each resolve to a
// friendly not-found result. A malformed id (float/0/negative/NaN) is a friendly
// not-found, never a write. Imports fail until lib/watering/actions.ts (and the
// schema + lib/watering modules) are built.
//
// @trace FR-WATER-01
// @trace FR-WATER-04
// @trace FR-WATER-05
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
  const dir = mkdtempSync(join(tmpdir(), "watering-actions-"));
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

/** Create a real plant so a valid-path watering insert satisfies the FK. */
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

describe("createWateringAction", () => {
  beforeEach(migrateDb);
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns { ok:false, fieldErrors, values } on a FUTURE date, never throws (SC-2, FR-SHELL-03)", async () => {
    const { createWateringAction } = await import("@/lib/watering/actions");
    const plantId = await seedPlant();

    const result = await createWateringAction(
      plantId,
      form({ wateredOn: "2999-01-01", note: "полив" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.wateredOn).toBeTruthy();
    // echoes submitted values so the uncontrolled form repopulates (FR-SHELL-03)
    expect(result.values?.wateredOn).toBe("2999-01-01");
    expect(result.values?.note).toBe("полив");
  });

  it("returns { ok:false, fieldErrors, values } on an OVER-LONG note inline (FR-WATER-02, FR-SHELL-03)", async () => {
    const { createWateringAction } = await import("@/lib/watering/actions");
    const plantId = await seedPlant();

    const note = "я".repeat(501);
    const result = await createWateringAction(
      plantId,
      form({ wateredOn: "2026-06-20", note }),
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.note).toBeTruthy();
    // The over-length note is echoed (never truncated) for repopulation.
    expect(result.values?.note).toBe(note);
  });

  it("returns { ok:true } on valid input — date + note (FR-WATER-01)", async () => {
    const { createWateringAction } = await import("@/lib/watering/actions");
    const plantId = await seedPlant();

    const result = await createWateringAction(
      plantId,
      form({ wateredOn: "2026-06-20", note: "полив дощовою водою" }),
    );
    expect(result.ok).toBe(true);
  });

  it("returns { ok:true } with NO note (note is optional, FR-WATER-02)", async () => {
    const { createWateringAction } = await import("@/lib/watering/actions");
    const plantId = await seedPlant();

    const result = await createWateringAction(
      plantId,
      form({ wateredOn: "2026-06-20", note: "" }),
    );
    expect(result.ok).toBe(true);
  });

  it("revalidates the PLANT DETAIL path on success (D5)", async () => {
    const { revalidatePath } = await import("next/cache");
    const { createWateringAction } = await import("@/lib/watering/actions");
    const plantId = await seedPlant();

    await createWateringAction(plantId, form({ wateredOn: "2026-06-20", note: "" }));
    expect(revalidatePath).toHaveBeenCalledWith(`/plants/${plantId}`);
  });

  it("rejects a watering against a non-existent plant with a friendly result, never a raw 500 (NFR-DATA-02)", async () => {
    const { createWateringAction } = await import("@/lib/watering/actions");

    const result = await createWateringAction(
      987_654,
      form({ wateredOn: "2026-06-20", note: "" }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a malformed plantId (float/0/negative) as a friendly result, never a write (D5)", async () => {
    const { createWateringAction } = await import("@/lib/watering/actions");

    expect((await createWateringAction(0, form({ wateredOn: "2026-06-20" }))).ok).toBe(false);
    expect((await createWateringAction(-5, form({ wateredOn: "2026-06-20" }))).ok).toBe(false);
    expect((await createWateringAction(1.5, form({ wateredOn: "2026-06-20" }))).ok).toBe(false);
    expect((await createWateringAction(Number.NaN, form({ wateredOn: "2026-06-20" }))).ok).toBe(false);
  });
});

// A watering deleted in another tab is indistinguishable from a missing id by the
// time the action runs (NFR-DATA-02): the edit/delete actions must resolve to a
// not-found ActionResult — never a thrown 500 and never a resurrected row.
describe("updateWateringAction / deleteWateringAction — not-found (FR-WATER-04, FR-WATER-05)", () => {
  beforeEach(migrateDb);
  afterEach(() => {
    vi.clearAllMocks();
  });

  const MISSING_ID = 987_654;

  it("updateWateringAction(missingId, validForm) returns not-found, no resurrected row", async () => {
    const { updateWateringAction } = await import("@/lib/watering/actions");
    const { getWatering } = await import("@/lib/watering/queries");
    const { db } = await import("@/db/client");

    const result = await updateWateringAction(
      MISSING_ID,
      form({ wateredOn: "2026-06-20", note: "оновлено" }),
    );
    expect(result.ok).toBe(false);

    // The row was NOT created by the failed update (no upsert/resurrection).
    expect(await getWatering(db, MISSING_ID)).toBeFalsy();
  });

  it("updateWateringAction returns { ok:false, fieldErrors, values } on an invalid edit (over-long note), never throws", async () => {
    const { updateWateringAction } = await import("@/lib/watering/actions");

    const result = await updateWateringAction(
      MISSING_ID,
      form({ wateredOn: "2026-06-20", note: "я".repeat(501) }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    // Invalid input is rejected by the validation gate BEFORE the not-found
    // lookup — an inline field error, never a throw.
    expect(result.fieldErrors?.note).toBeTruthy();
  });

  it("updateWateringAction surfaces a FUTURE date as an inline date field error on edit (SC-2)", async () => {
    const { updateWateringAction } = await import("@/lib/watering/actions");

    const result = await updateWateringAction(
      MISSING_ID,
      form({ wateredOn: "2999-01-01", note: "" }),
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.wateredOn).toBeTruthy();
  });

  it("deleteWateringAction(missingId) returns a not-found result (not a throw)", async () => {
    const { deleteWateringAction } = await import("@/lib/watering/actions");

    const result = await deleteWateringAction(MISSING_ID);
    expect(result.ok).toBe(false);
  });

  it("deleteWateringAction rejects a malformed id (float/0/negative/NaN) as not-found, never a write", async () => {
    const { deleteWateringAction } = await import("@/lib/watering/actions");

    expect((await deleteWateringAction(0)).ok).toBe(false);
    expect((await deleteWateringAction(-5)).ok).toBe(false);
    expect((await deleteWateringAction(1.5)).ok).toBe(false);
    expect((await deleteWateringAction(Number.NaN)).ok).toBe(false);
  });
});
