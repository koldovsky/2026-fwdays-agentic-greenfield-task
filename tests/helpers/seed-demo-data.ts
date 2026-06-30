// Deterministic demo seed (Phase 5) — the single source of seeded state for the
// Playwright E2E layer AND the Phase-6 demo recordings. It is:
//
//   * DETERMINISTIC — fixed plant names/species/intervals; the watering +
//     growth dates are computed RELATIVE to a pinned `today` (default
//     `todayInKiev()`) so the derived statuses (overdue / soon / healthy /
//     never-watered) are STABLE regardless of the wall-clock day the suite runs.
//   * IDEMPOTENT — upserts by a stable natural key (the plant `name`). Running
//     it twice yields the same logical dataset, no duplicates.
//   * BASELINE-RE-PINNING — this seeds the SHARED dev DB (`file:./data/app.db`),
//     which manual testers also touch: they advance statuses, add waterings,
//     edit/delete rows. So on EVERY run we DELETE each demo plant by name first
//     (the FK ON DELETE CASCADE clears its measurements + waterings, D5) and
//     re-insert from scratch — drift is assumed and reset, never merged.
//
// All dates are LOCAL calendar dates via `addDays(today, -n)` (pure string
// math) — never `new Date().toISOString().slice(0,10)`, which is UTC and drifts
// a day near Kiev midnight.
//
// `seedDemoData(db)` takes an INJECTED db handle so the E2E global-setup can
// seed the SAME SQLite file the built `next start` server reads, and the
// recordings/tests can reuse it against an in-memory DB if they want.

import { eq, inArray } from "drizzle-orm";

import type { DB } from "@/db/client";
import { plants } from "@/db/schema/plants";
import { growthMeasurements } from "@/db/schema/growth";
import { wateringEvents } from "@/db/schema/watering";
import { addDays, todayInKiev } from "@/lib/dates";
import { SPECIES_DEFAULT } from "@/lib/plants/validation";

// Accept any Drizzle better-sqlite3 instance bound to the schema (the app
// singleton, the db:seed script's handle, or an in-memory test DB).
type SeedDb = Pick<DB, "select" | "insert" | "update" | "delete">;

/** The stable natural key for each demo plant — the upsert/reset anchor. */
const DEMO = {
  overdue: "Демо: Прострочена бабусина",
  soon: "Демо: Скоро полити",
  healthy: "Демо: Здорова на підвіконні",
  never: "Демо: Ще жодного поливу",
} as const;

/** All demo plant names — used to wipe prior demo state before re-seeding. */
export const DEMO_PLANT_NAMES: readonly string[] = Object.values(DEMO);

/** A height measurement to seed, expressed as a days-ago offset from today. */
interface SeedMeasurement {
  daysAgo: number;
  heightCm: number;
}

/** A watering to seed, expressed as a days-ago offset from today. */
interface SeedWatering {
  daysAgo: number;
  note: string | null;
}

interface SeedPlantSpec {
  name: string;
  species: string;
  /** Watering interval in days (FR-REM-01). */
  intervalDays: number;
  /** Days-ago offset for the acquired date (null = no acquired date). */
  acquiredDaysAgo: number | null;
  measurements: SeedMeasurement[];
  waterings: SeedWatering[];
}

/**
 * The demo fixture, with watering offsets chosen so each plant lands in a
 * DISTINCT, STABLE status relative to `today` (interval 7 except where noted):
 *
 *   * overdue  — last watered 13 days ago, interval 7 -> due 6 days ago
 *                (today > due) => OVERDUE.
 *   * soon     — last watered 7 days ago, interval 7 -> due today
 *                (due == today) => SOON.
 *   * healthy  — last watered 1 day ago, interval 10 -> due in 9 days
 *                (due >= today+2) => HEALTHY.
 *   * never    — no waterings at all => OVERDUE (never-watered, strongest signal).
 *
 * Each plant (except `never`, which has no waterings by definition) carries a
 * couple of waterings AND a couple of growth measurements so both charts have
 * real data to plot.
 */
const SEED_SPECS: SeedPlantSpec[] = [
  {
    name: DEMO.overdue,
    species: SPECIES_DEFAULT,
    intervalDays: 7,
    acquiredDaysAgo: 400,
    measurements: [
      { daysAgo: 60, heightCm: 18.5 },
      { daysAgo: 20, heightCm: 21 },
    ],
    waterings: [
      { daysAgo: 27, note: "полив дощовою водою" },
      { daysAgo: 13, note: null },
    ],
  },
  {
    name: DEMO.soon,
    species: SPECIES_DEFAULT,
    intervalDays: 7,
    acquiredDaysAgo: 200,
    measurements: [
      { daysAgo: 40, heightCm: 12 },
      { daysAgo: 5, heightCm: 14.5 },
    ],
    waterings: [
      { daysAgo: 14, note: null },
      { daysAgo: 7, note: "звичайний полив" },
    ],
  },
  {
    name: DEMO.healthy,
    species: SPECIES_DEFAULT,
    intervalDays: 10,
    acquiredDaysAgo: 90,
    measurements: [
      { daysAgo: 30, heightCm: 9 },
      { daysAgo: 2, heightCm: 11.5 },
    ],
    waterings: [
      { daysAgo: 11, note: null },
      { daysAgo: 1, note: "після пересадки" },
    ],
  },
  {
    name: DEMO.never,
    species: SPECIES_DEFAULT,
    intervalDays: 7,
    acquiredDaysAgo: 3,
    // A single early measurement so the growth chart isn't empty even though it
    // has never been watered.
    measurements: [{ daysAgo: 1, heightCm: 6.5 }],
    waterings: [],
  },
];

/**
 * Reset and re-seed the demo dataset. Deletes any existing demo plants by name
 * (cascade clears their children), then inserts the fixture fresh with dates
 * pinned relative to `today`. Returns the created plant ids keyed by their demo
 * role so callers (E2E) can target a specific plant deterministically.
 */
export async function seedDemoData(
  db: SeedDb,
  today: string = todayInKiev(),
): Promise<{ overdue: number; soon: number; healthy: number; never: number }> {
  // 1) Re-pin baseline: wipe prior demo state. Find the demo plant rows by name,
  //    then delete them — ON DELETE CASCADE removes their measurements/waterings
  //    at the DB level (D5), so no orphans survive a tester's mid-run edits.
  const existing = await db
    .select({ id: plants.id })
    .from(plants)
    .where(inArray(plants.name, DEMO_PLANT_NAMES as string[]))
    .all();
  if (existing.length > 0) {
    await db
      .delete(plants)
      .where(
        inArray(
          plants.id,
          existing.map((row) => row.id),
        ),
      )
      .run();
  }

  // 2) Insert each spec fresh, computing every date as a LOCAL calendar date
  //    relative to the pinned `today` (pure string math, no UTC drift).
  const ids: Record<string, number> = {};
  for (const spec of SEED_SPECS) {
    const inserted = await db
      .insert(plants)
      .values({
        name: spec.name,
        species: spec.species,
        intervalDays: spec.intervalDays,
        acquiredDate:
          spec.acquiredDaysAgo === null
            ? null
            : addDays(today, -spec.acquiredDaysAgo),
      })
      .returning({ id: plants.id })
      .get();

    const plantId = inserted.id;
    ids[spec.name] = plantId;

    for (const m of spec.measurements) {
      await db
        .insert(growthMeasurements)
        .values({
          plantId,
          heightCm: m.heightCm,
          measuredOn: addDays(today, -m.daysAgo),
        })
        .run();
    }

    for (const w of spec.waterings) {
      await db
        .insert(wateringEvents)
        .values({
          plantId,
          wateredOn: addDays(today, -w.daysAgo),
          note: w.note,
        })
        .run();
    }
  }

  return {
    overdue: ids[DEMO.overdue],
    soon: ids[DEMO.soon],
    healthy: ids[DEMO.healthy],
    never: ids[DEMO.never],
  };
}

/** The demo plant natural-key names, exported for E2E queries-by-text. */
export const demoNames = DEMO;

/**
 * Remove the demo dataset entirely (used by tests/cleanup that want to assert
 * an empty-state without leftover demo rows). Idempotent.
 */
export async function clearDemoData(db: SeedDb): Promise<void> {
  const existing = await db
    .select({ id: plants.id })
    .from(plants)
    .where(inArray(plants.name, DEMO_PLANT_NAMES as string[]))
    .all();
  for (const row of existing) {
    await db.delete(plants).where(eq(plants.id, row.id)).run();
  }
}
