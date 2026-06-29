// Edit-plant route (design D6) — thin server component. Loads the plant, frames
// the client form island prefilled with the row contents; notFound() on a
// missing/stale id. Same validation rules as add (enforced in the action).
//
// @trace FR-PLANT-06

import { notFound } from "next/navigation";

import { PlantForm } from "@/components/plants/PlantForm";
import { Button } from "@/components/ui/Button";
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
      <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">
        {uk.plants.editTitle}
      </h1>
      <PlantForm
        key={plant.id}
        id={plant.id}
        defaults={{
          name: plant.name,
          species: plant.species,
          acquiredDate: plant.acquiredDate,
        }}
      />
      <div className="mt-4">
        <Button variant="ghost" href={`/plants/${plant.id}`}>
          {uk.nav.backToList}
        </Button>
      </div>
    </section>
  );
}
