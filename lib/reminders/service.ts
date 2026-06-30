// Reminders home read-service (design D5, R2). Composes the plant list + the
// latest-watering-per-plant read into the home view model, deriving each plant's
// status ONCE so the summary count, the reminder list, and the card pills all
// read from one computation (FR-REM-07, no duplicate state). `db` is defaulted to
// the singleton, injectable for tests; `today` is injectable so date boundaries
// are deterministic.
//
// @trace FR-REM-02
// @trace FR-REM-03
// @trace FR-REM-04
// @trace FR-REM-06
import { db as defaultDb, type DB } from "@/db/client";
import type { Plant } from "@/db/schema/plants";
import { addDays, todayInKiev } from "@/lib/dates";
import { listPlants } from "@/lib/plants/queries";
import { latestWateringByPlant } from "@/lib/reminders/queries";
import {
  compareUrgency,
  deriveStatus,
  isDue,
  type ReminderStatus,
} from "@/lib/reminders/status";

type RemindersDb = Pick<DB, "select" | "insert" | "update" | "delete">;

/** A plant + its derived watering status, latest watering date, and due date. */
export interface ReminderRowModel {
  plant: Plant;
  status: ReminderStatus;
  lastWateredAt: string | null;
  dueDate: string;
}

/** The home view model (design D5). `allRows` feeds the pills; `dueRows` the list. */
export interface HomeReminders {
  dueRows: ReminderRowModel[];
  dueCount: number;
  allDone: boolean;
  allRows: ReminderRowModel[];
}

/**
 * Build the home reminders view model: list plants -> latest watering per plant
 * -> derive status -> rows. `dueRows` is the soon/overdue subset, urgency-ordered
 * most-overdue first (ties by name then id). `allDone` is true when nothing is
 * due (including no plants at all) — never a raw error (FR-REM-06).
 */
export async function getHomeReminders(
  db: RemindersDb = defaultDb,
  today: string = todayInKiev(),
): Promise<HomeReminders> {
  const [plants, latestByPlant] = await Promise.all([
    listPlants(db),
    latestWateringByPlant(db),
  ]);

  const allRows: ReminderRowModel[] = plants.map((plant) => {
    const lastWateredAt = latestByPlant.get(plant.id) ?? null;
    const status = deriveStatus(
      { lastWateredAt, intervalDays: plant.intervalDays },
      today,
    );
    return {
      plant,
      status,
      lastWateredAt,
      // dueDate is informational on the row; the status already encodes it.
      dueDate: lastWateredAt
        ? addDays(lastWateredAt, plant.intervalDays)
        : today,
    };
  });

  const dueRows = allRows
    .filter((row) => isDue(row.status))
    .sort((a, b) =>
      compareUrgency(
        {
          plant: a.plant,
          lastWateredAt: a.lastWateredAt,
          intervalDays: a.plant.intervalDays,
        },
        {
          plant: b.plant,
          lastWateredAt: b.lastWateredAt,
          intervalDays: b.plant.intervalDays,
        },
        today,
      ),
    );

  return {
    dueRows,
    dueCount: dueRows.length,
    allDone: dueRows.length === 0,
    allRows,
  };
}
