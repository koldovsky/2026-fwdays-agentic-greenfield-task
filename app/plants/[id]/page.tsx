// Plant detail (design D6, D5) — thin server component. getPlant(id) -> the
// detail render (name, species, DD.MM.YYYY acquired date) + edit link + the
// delete-with-confirm control; notFound() on a missing/stale id (no raw 500).
//
// @trace FR-PLANT-05
// @trace FR-PLANT-07

import { notFound } from "next/navigation";
import Link from "next/link";

import { MeasurementsSection } from "@/components/growth/MeasurementsSection";
import { DeletePlantButton } from "@/components/plants/DeletePlantButton";
import { db } from "@/db/client";
import { formatAcquiredDate, todayInKiev } from "@/lib/dates";
import { listMeasurements } from "@/lib/growth/queries";
import { uk } from "@/lib/i18n/uk";
import { getPlant } from "@/lib/plants/queries";

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

      <MeasurementsSection
        plantId={plant.id}
        measurements={measurements}
        today={todayInKiev()}
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
