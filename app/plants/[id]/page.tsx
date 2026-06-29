// Plant detail (design D6, D5) — thin server component. getPlant(id) -> the
// detail render (name, species, DD.MM.YYYY acquired date) + edit link + the
// delete-with-confirm control; notFound() on a missing/stale id (no raw 500).
//
// @trace FR-PLANT-05
// @trace FR-PLANT-07

import { notFound } from "next/navigation";
import Link from "next/link";

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
import { listWaterings } from "@/lib/watering/queries";

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

  // Charts derive their series on the SERVER from the SAME arrays the page
  // already loaded (design D5, D6) — no new query, no client fetch. Each action's
  // revalidatePath re-renders this force-dynamic page, so the charts re-derive.
  const growthSeries = toGrowthSeries(measurements);
  const wateringSeries = toWateringSeries(waterings);

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {plant.name}
      </h1>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="font-medium text-zinc-600 dark:text-zinc-400">
            {uk.plants.detailSpecies}:
          </dt>
          <dd className="text-foreground">{plant.species}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-zinc-600 dark:text-zinc-400">
            {uk.plants.detailAcquiredDate}:
          </dt>
          <dd className="text-foreground">
            {plant.acquiredDate
              ? formatAcquiredDate(plant.acquiredDate)
              : uk.plants.noAcquiredDate}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex gap-3">
        <Link
          href={`/plants/${plant.id}/edit`}
          className="inline-flex items-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {uk.plants.edit}
        </Link>
      </div>

      <DeletePlantButton id={plant.id} />

      <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <ChartErrorBoundary fallbackMessage={uk.charts.renderError}>
          <GrowthChart series={growthSeries} />
        </ChartErrorBoundary>
      </section>

      <MeasurementsSection
        plantId={plant.id}
        measurements={measurements}
        today={today}
      />

      <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <ChartErrorBoundary fallbackMessage={uk.charts.renderError}>
          <WateringChart series={wateringSeries} />
        </ChartErrorBoundary>
      </section>

      <WateringsSection
        plantId={plant.id}
        waterings={waterings}
        today={today}
      />

      <Link
        href="/"
        className="mt-6 inline-flex rounded-md text-sm font-medium text-zinc-900 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:text-zinc-100"
      >
        {uk.nav.backToList}
      </Link>
    </section>
  );
}
