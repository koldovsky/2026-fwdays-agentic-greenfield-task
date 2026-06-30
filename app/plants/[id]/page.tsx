// Plant detail (design D6, D5) — thin server component. getPlant(id) -> the
// detail render (name, species, DD.MM.YYYY acquired date) + edit link + the
// delete-with-confirm control; notFound() on a missing/stale id (no raw 500).
//
// @trace FR-PLANT-05
// @trace FR-PLANT-07

import { notFound } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { ChartErrorBoundary } from "@/components/charts/ChartErrorBoundary";
import { GrowthChart } from "@/components/charts/GrowthChart";
import { WateringChart } from "@/components/charts/WateringChart";
import { MeasurementsSection } from "@/components/growth/MeasurementsSection";
import { DeletePlantButton } from "@/components/plants/DeletePlantButton";
import { WateringsSection } from "@/components/watering/WateringsSection";
import { db } from "@/db/client";
import { toGrowthSeries, toWateringSeries } from "@/lib/charts/series";
import { formatAcquiredDate, todayInKiev } from "@/lib/dates";
import { listMeasurements } from "@/lib/growth/queries";
import { uk } from "@/lib/i18n/uk";
import { getPlant } from "@/lib/plants/queries";
import { deriveStatus, type ReminderStatus } from "@/lib/reminders/status";
import { listWaterings } from "@/lib/watering/queries";

const PILL_CLASSES: Record<ReminderStatus, string> = {
  healthy: "bg-status-healthy-chip text-status-healthy-text",
  soon: "bg-status-soon-chip text-status-soon-text",
  overdue: "bg-status-overdue-chip text-status-overdue-text",
};

const PILL_DOT: Record<ReminderStatus, string> = {
  healthy: "bg-status-healthy-dot",
  soon: "bg-status-soon-dot",
  overdue: "bg-status-overdue-dot",
};

const PILL_LABEL: Record<ReminderStatus, string> = {
  healthy: uk.plants.card.statusHealthy,
  soon: uk.plants.card.statusSoon,
  overdue: uk.plants.card.statusOverdue,
};

// Reads a mutable plant per request — never prerendered at build time.
export const dynamic = "force-dynamic";

export default async function PlantDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    notFound();
  }

  const plant = await getPlant(db, numericId);
  if (!plant) {
    notFound();
  }

  const measurements = await listMeasurements(db, numericId);
  const waterings = await listWaterings(db, numericId);
  const today = todayInKiev();

  // Derive the watering status (FR-REM-07) from the SAME rule as the home: the
  // latest watering date (waterings are date-desc, so the first is the latest)
  // plus the plant's interval, vs today.
  const lastWateredAt = waterings[0]?.wateredOn ?? null;
  const status = deriveStatus(
    { lastWateredAt, intervalDays: plant.intervalDays },
    today,
  );

  // Charts derive their series on the SERVER from the SAME arrays the page
  // already loaded (design D5, D6) — no new query, no client fetch. Each action's
  // revalidatePath re-renders this force-dynamic page, so the charts re-derive.
  const growthSeries = toGrowthSeries(measurements);
  const wateringSeries = toWateringSeries(waterings);

  return (
    <section>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">
          {plant.name}
        </h1>
        <span
          className={`inline-flex items-center gap-1.5 rounded-[999px] px-2.5 py-1 font-mono text-[11px] font-medium ${PILL_CLASSES[status]}`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${PILL_DOT[status]}`}
          />
          {PILL_LABEL[status]}
        </span>
      </div>

      <dl className="mt-4 space-y-2 font-body text-sm">
        <div className="flex gap-2">
          <dt className="font-semibold text-bark">
            {uk.plants.detailSpecies}:
          </dt>
          <dd className="text-ink">{plant.species}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold text-bark">
            {uk.plants.detailAcquiredDate}:
          </dt>
          <dd className="text-ink">
            {plant.acquiredDate
              ? formatAcquiredDate(plant.acquiredDate)
              : uk.plants.noAcquiredDate}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" href={`/plants/${plant.id}/edit`}>
          {uk.plants.edit}
        </Button>
      </div>

      <DeletePlantButton id={plant.id} />

      <section className="mt-10 border-t border-border pt-8">
        <ChartErrorBoundary fallbackMessage={uk.charts.renderError}>
          <GrowthChart series={growthSeries} />
        </ChartErrorBoundary>
      </section>

      <MeasurementsSection
        plantId={plant.id}
        measurements={measurements}
        today={today}
      />

      <section className="mt-10 border-t border-border pt-8">
        <ChartErrorBoundary fallbackMessage={uk.charts.renderError}>
          <WateringChart series={wateringSeries} />
        </ChartErrorBoundary>
      </section>

      <WateringsSection
        plantId={plant.id}
        waterings={waterings}
        today={today}
      />

      <div className="mt-8">
        <Button variant="ghost" href="/">
          {uk.nav.backToList}
        </Button>
      </div>
    </section>
  );
}
