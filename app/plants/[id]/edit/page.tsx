// Edit-plant route (design D6) — thin server component. Loads the plant, frames
// the client form island prefilled with the row contents; notFound() on a
// missing/stale id. Same validation rules as add (enforced in the action).
//
// @trace FR-PLANT-06

import { notFound } from "next/navigation";
import Link from "next/link";

import { PlantForm } from "@/components/plants/PlantForm";
import { db } from "@/db/client";
import { uk } from "@/lib/i18n/uk";
import { getPlant } from "@/lib/plants/queries";

// Reads a mutable plant per request — never prerendered at build time.
export const dynamic = "force-dynamic";

export default async function EditPlantPage({
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

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {uk.plants.editTitle}
      </h1>
      <PlantForm
        id={plant.id}
        defaults={{
          name: plant.name,
          species: plant.species,
          acquiredDate: plant.acquiredDate,
        }}
      />
      <Link
        href={`/plants/${plant.id}`}
        className="mt-4 inline-flex rounded-md text-sm font-medium text-zinc-900 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:text-zinc-100"
      >
        {uk.nav.backToList}
      </Link>
    </section>
  );
}
