// Home — the «Поливайко» reminder-centric view (design D7). Thin server
// component: loads getHomeReminders(db) ONCE so the summary count, the reminder
// list, and the card pills all read from the SAME derived status (FR-REM-07).
// Renders a pine summary card (due count), then — when something is due — the
// urgency-ordered reminder rows, or the all-done state when nothing is due; the
// plant card grid stays below with each pill wired to the real status. The empty
// state shows when no plants exist (FR-PLANT-08).
//
// @trace FR-REM-03
// @trace FR-REM-04
// @trace FR-REM-05
// @trace FR-REM-06
// @trace FR-REM-07
// @trace FR-PLANT-04
// @trace FR-PLANT-08
// @trace FR-DS-03

import { db } from "@/db/client";
import { uk } from "@/lib/i18n/uk";
import { formatAcquiredDate, todayInKiev } from "@/lib/dates";
import { getHomeReminders } from "@/lib/reminders/service";
import { dueGapDays } from "@/lib/reminders/status";
import { AllDoneState } from "@/components/reminders/AllDoneState";
import { ReminderRow } from "@/components/reminders/ReminderRow";
import { SummaryCard } from "@/components/reminders/SummaryCard";
import { PlantCard } from "@/components/plants/PlantCard";
import { Button } from "@/components/ui/Button";

// Reads mutable plant data per request — never prerendered at build time.
export const dynamic = "force-dynamic";

/**
 * Per-plant due-line copy that conveys urgency from the day gap (FR-REM-04):
 * overdue -> "Прострочено на N дн." (N days past due), due today -> "Полити
 * сьогодні", due tomorrow -> "Полити завтра". `gap` is days from today to the
 * plant's due date (negative = overdue); a never-watered plant has gap 0 and is
 * shown as overdue today.
 */
function dueLabelFor(status: "soon" | "overdue", gap: number): string {
  if (status === "overdue") {
    // gap <= 0 for overdue; never-watered is gap 0 (due "today" but overdue).
    const daysPast = Math.max(1, -gap);
    return uk.reminders.dueLineOverdueDays(daysPast);
  }
  // soon: due today (gap 0) or tomorrow (gap 1).
  return gap <= 0 ? uk.reminders.dueLineToday : uk.reminders.dueLineTomorrow;
}

export default async function Home() {
  const today = todayInKiev();
  const { dueRows, dueCount, allDone, allRows } = await getHomeReminders(db, today);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">
          {uk.plants.listTitle}
        </h1>
        <Button variant="primary" href="/plants/new">
          {uk.plants.add}
        </Button>
      </div>

      <SummaryCard count={dueCount} />

      {allDone ? (
        <AllDoneState />
      ) : (
        <section>
          <h2 className="font-display text-[13px] font-bold uppercase tracking-wide text-stone">
            {uk.reminders.sectionTitle}
          </h2>
          <ul className="mt-4 space-y-3 list-none">
            {dueRows.map((row) => {
              // dueRows only ever hold soon/overdue (the due statuses).
              const status = row.status === "overdue" ? "overdue" : "soon";
              const gap = dueGapDays(
                {
                  lastWateredAt: row.lastWateredAt,
                  intervalDays: row.plant.intervalDays,
                },
                today,
              );
              return (
                <li key={row.plant.id}>
                  <ReminderRow
                    id={row.plant.id}
                    name={row.plant.name}
                    status={status}
                    dueLabel={dueLabelFor(status, gap)}
                    meta={row.plant.species}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {allRows.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-border bg-cloud px-4 py-10 text-center font-body text-sm text-stone">
          {uk.plants.empty}
        </p>
      ) : (
        <ul className="grid list-none grid-cols-1 gap-5 sm:grid-cols-2">
          {allRows.map((row) => (
            <li key={row.plant.id}>
              <PlantCard
                id={row.plant.id}
                name={row.plant.name}
                species={row.plant.species}
                status={row.status}
                meta={
                  row.plant.acquiredDate
                    ? formatAcquiredDate(row.plant.acquiredDate)
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
