// RED (Phase 4b) — server-action contract, written from the spec BEFORE the
// implementation. createPlantAction must: guard -> validate -> service ->
// revalidate, and ALWAYS return the shared ActionResult, NEVER throw raw on user
// input. On invalid input it returns { ok:false, fieldErrors, values } (echoing
// the submitted values for repopulation); on valid input it returns { ok:true }.
// Imports fail until lib/plants/actions.ts is built.
//
// @trace FR-PLANT-01
// @trace FR-PLANT-06
// @trace FR-PLANT-07
// @trace FR-SHELL-03
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { uk } from "@/lib/i18n/uk";
import { existsSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Server actions call next/cache's revalidatePath; stub it so the action runs
// outside a request scope without throwing (we assert the ActionResult contract,
// not the revalidation side effect).
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Point the Drizzle client at a fresh temp file DB and apply migrations BEFORE
// importing the action (which transitively imports the singleton db/client).
beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), "plants-actions-"));
  process.env.DATABASE_URL = `file:${join(dir, "actions.db")}`;
});

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("createPlantAction", () => {
  beforeEach(async () => {
    // Apply the committed schema to the temp DB so the valid-path insert works.
    if (existsSync(join(process.cwd(), "db", "migrations"))) {
      const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
      const { db } = await import("@/db/client");
      migrate(db, { migrationsFolder: join(process.cwd(), "db", "migrations") });
    }
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns { ok:false, fieldErrors, values } on invalid input, never throws", async () => {
    const { createPlantAction } = await import("@/lib/plants/actions");
    const result = await createPlantAction(form({ name: "", species: "Кактус" }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.name).toBeTruthy();
    // echoes submitted values so the uncontrolled form repopulates (FR-SHELL-03)
    expect(result.values?.name).toBe("");
    expect(result.values?.species).toBe("Кактус");
  });

  it("surfaces a future acquired date as an inline field error (SC-2), not a throw", async () => {
    const { createPlantAction } = await import("@/lib/plants/actions");
    const result = await createPlantAction(
      form({ name: "Фікус", acquiredDate: "2999-01-01" }),
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.acquiredDate).toBeTruthy();
  });

  it("returns { ok:true } on valid input (FR-PLANT-01)", async () => {
    const { createPlantAction } = await import("@/lib/plants/actions");
    const result = await createPlantAction(
      form({ name: "Здорова рослина", species: "Crassula ovata" }),
    );
    expect(result.ok).toBe(true);
  });

  it("revalidates the list path on success", async () => {
    const { revalidatePath } = await import("next/cache");
    const { createPlantAction } = await import("@/lib/plants/actions");
    await createPlantAction(form({ name: "Ще одна" }));
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});

// A plant deleted in another tab is indistinguishable from a missing id by the
// time the action runs (NFR-DATA-02): the edit/delete actions must resolve to a
// not-found ActionResult — never a thrown 500 and never a resurrected row.
describe("updatePlantAction / deletePlantAction — not-found (FR-PLANT-06, FR-PLANT-07)", () => {
  beforeEach(async () => {
    if (existsSync(join(process.cwd(), "db", "migrations"))) {
      const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
      const { db } = await import("@/db/client");
      migrate(db, { migrationsFolder: join(process.cwd(), "db", "migrations") });
    }
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  const MISSING_ID = 987_654;

  it("updatePlantAction(missingId, validForm) returns not-found, no resurrected row", async () => {
    const { updatePlantAction } = await import("@/lib/plants/actions");
    const { getPlant } = await import("@/lib/plants/queries");
    const { db } = await import("@/db/client");

    const result = await updatePlantAction(
      MISSING_ID,
      form({ name: "Привид", species: "Crassula ovata" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.formError).toBe(uk.plants.notFound);

    // The row was NOT created by the failed update (no upsert/resurrection).
    expect(await getPlant(db, MISSING_ID)).toBeFalsy();
  });

  it("deletePlantAction(missingId) returns a not-found result (not a throw)", async () => {
    const { deletePlantAction } = await import("@/lib/plants/actions");

    const result = await deletePlantAction(MISSING_ID);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.formError).toBe(uk.plants.notFound);
  });
});
