// Home / plant list (design D6, D7) — thin server component. Fetches via
// listPlants(), renders each plant as a «Поливайко» PlantCard linking to its
// detail, OR a helpful empty state (FR-PLANT-04, FR-PLANT-08). Newest-first
// order is owned by the query.
//
// @trace FR-PLANT-04
// @trace FR-PLANT-08
// @trace FR-DS-03

import { db } from "@/db/client";
import { uk } from "@/lib/i18n/uk";
import { formatAcquiredDate } from "@/lib/dates";
import { listPlants } from "@/lib/plants/queries";
import { PlantCard } from "@/components/plants/PlantCard";
import { Button } from "@/components/ui/Button";

// Reads mutable plant data per request — never prerendered at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const plants = await listPlants(db);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">
          {uk.plants.listTitle}
        </h1>
        <Button variant="primary" href="/plants/new">
          {uk.plants.add}
        </Button>
      </div>

      {plants.length === 0 ? (
        <p className="mt-8 rounded-[14px] border border-dashed border-border bg-cloud px-4 py-10 text-center font-body text-sm text-stone">
          {uk.plants.empty}
        </p>
      ) : (
        <ul className="mt-8 grid list-none grid-cols-1 gap-5 sm:grid-cols-2">
          {plants.map((plant) => (
            <li key={plant.id}>
              <PlantCard
                id={plant.id}
                name={plant.name}
                species={plant.species}
                meta={
                  plant.acquiredDate
                    ? formatAcquiredDate(plant.acquiredDate)
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
