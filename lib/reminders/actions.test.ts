// RED (Phase 4b, slice 7 add-reminders, tasks 1.9–1.10) — the water-now
// server-action contract, written from the spec BEFORE the implementation.
// `waterNowAction(plantId)`:
//   - guards the id (positive integer) -> a malformed id is a friendly not-found,
//     never a write, never a raw throw;
//   - REUSES the watering service to log a watering dated today (Europe/Kiev),
//     so the plant is no longer due and the home due count drops (FR-REM-05);
//   - is a NO-OP when the plant's latest watering is already today: returns
//     ok() WITHOUT inserting a second event (no duplicate history), the plant
//     stays not-due;
//   - maps a deleted/non-existent plant to a friendly not-found (no FK 500, no
//     resurrection);
//   - revalidates the home path `/` (and the plant detail) on success.
//
// Uses a real temp-file SQLite via the singleton client (the watering-actions
// test pattern) and stubs next/cache so the action runs outside a request scope.
// Imports fail until lib/reminders/actions.ts (and the interval schema/queries)
// are built. That is the intended RED.
//
// @trace FR-REM-05
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// The action revalidates the home + detail paths via next/cache; stub it so the
// action runs outside a request scope and we can assert the paths it revalidates.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Point the Drizzle singleton at a fresh temp-file DB and apply migrations BEFORE
// importing the action (which transitively imports the singleton db/client).
beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), "reminders-actions-"));
  process.env.DATABASE_URL = `file:${join(dir, "actions.db")}`;
});

async function migrateDb() {
  if (existsSync(join(process.cwd(), "db", "migrations"))) {
    const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
    const { db } = await import("@/db/client");
    migrate(db, { migrationsFolder: join(process.cwd(), "db", "migrations") });
  }
}

/** Create a real plant (with an interval) so a water-now insert satisfies the FK. */
async function seedPlant(intervalDays = 7): Promise<number> {
  const { insertPlant } = await import("@/lib/plants/queries");
  const { SPECIES_DEFAULT } = await import("@/lib/plants/validation");
  const { db } = await import("@/db/client");
  const plant = await insertPlant(db, {
    name: "Грошове дерево",
    species: SPECIES_DEFAULT,
    acquiredDate: null,
    intervalDays,
  });
  return plant.id;
}

async function eventCount(plantId: number): Promise<number> {
  const { listWaterings } = await import("@/lib/watering/queries");
  const { db } = await import("@/db/client");
  return (await listWaterings(db, plantId)).length;
}

describe("waterNowAction — logs today + drops the plant from due (FR-REM-05)", () => {
  beforeEach(migrateDb);
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("logs a watering dated today (Europe/Kiev) and the plant is no longer due", async () => {
    const { waterNowAction } = await import("@/lib/reminders/actions");
    const { getHomeReminders } = await import("@/lib/reminders/service");
    const { todayInKiev } = await import("@/lib/dates");
    const { listWaterings } = await import("@/lib/watering/queries");
    const { db } = await import("@/db/client");

    const overdue = await seedPlant(7);
    const today = todayInKiev();

    // Before: never watered -> overdue -> due.
    const before = await getHomeReminders(db, today);
    expect(before.dueRows.map((r) => r.plant.id)).toContain(overdue);
    const beforeCount = before.dueCount;

    const result = await waterNowAction(overdue);
    expect(result.ok).toBe(true);

    // A watering dated today was logged for this plant.
    const events = await listWaterings(db, overdue);
    expect(events).toHaveLength(1);
    expect(events[0]?.wateredOn).toBe(today);

    // After: interval 7 -> due today+7 -> healthy -> not due; the count dropped.
    const after = await getHomeReminders(db, today);
    expect(after.dueRows.map((r) => r.plant.id)).not.toContain(overdue);
    expect(after.dueCount).toBe(beforeCount - 1);
  });

  it("revalidates the home path `/` and the plant detail on success", async () => {
    const { revalidatePath } = await import("next/cache");
    const { waterNowAction } = await import("@/lib/reminders/actions");
    const id = await seedPlant(7);

    await waterNowAction(id);
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith(`/plants/${id}`);
  });

  it("a malformed plantId (0 / negative / float / NaN) is a friendly not-found, never a write or throw", async () => {
    const { waterNowAction } = await import("@/lib/reminders/actions");
    expect((await waterNowAction(0)).ok).toBe(false);
    expect((await waterNowAction(-5)).ok).toBe(false);
    expect((await waterNowAction(1.5)).ok).toBe(false);
    expect((await waterNowAction(Number.NaN)).ok).toBe(false);
  });

  it("a deleted / non-existent plant resolves to a friendly not-found, never a raw FK 500 or resurrection", async () => {
    const { waterNowAction } = await import("@/lib/reminders/actions");

    const result = await waterNowAction(987_654);
    expect(result.ok).toBe(false);

    // No event was created/resurrected for the missing plant.
    expect(await eventCount(987_654)).toBe(0);
  });
});

describe("waterNowAction — already-watered-today is a no-op (FR-REM-05)", () => {
  beforeEach(migrateDb);
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT insert a second event when the latest watering is already today, and stays not-due", async () => {
    const { waterNowAction } = await import("@/lib/reminders/actions");
    const { getHomeReminders } = await import("@/lib/reminders/service");
    const { todayInKiev } = await import("@/lib/dates");
    const { db } = await import("@/db/client");

    const id = await seedPlant(7);
    const today = todayInKiev();

    // First water-now logs today's event.
    const first = await waterNowAction(id);
    expect(first.ok).toBe(true);
    expect(await eventCount(id)).toBe(1);

    // Second water-now on a plant already watered today is a NO-OP: ok(), no
    // duplicate event, plant stays not-due.
    const second = await waterNowAction(id);
    expect(second.ok).toBe(true);
    expect(await eventCount(id)).toBe(1);

    const after = await getHomeReminders(db, today);
    expect(after.dueRows.map((r) => r.plant.id)).not.toContain(id);
  });
});
