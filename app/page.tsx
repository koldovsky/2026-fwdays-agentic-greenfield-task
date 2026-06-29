// Home / plant list (design D6) — thin server component. Fetches via
// listPlants(), renders each plant linking to its detail, OR a helpful empty
// state (FR-PLANT-04, FR-PLANT-08). Newest-first order is owned by the query.
//
// @trace FR-PLANT-04
// @trace FR-PLANT-08

import Link from "next/link";

import { db } from "@/db/client";
import { uk } from "@/lib/i18n/uk";
import { formatAcquiredDate } from "@/lib/plants/date";
import { listPlants } from "@/lib/plants/queries";

// Reads mutable plant data per request — never prerendered at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const plants = await listPlants(db);

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {uk.plants.listTitle}
        </h1>
        <Link
          href="/plants/new"
          className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {uk.plants.add}
        </Link>
      </div>

      {plants.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {uk.plants.empty}
        </p>
      ) : (
        <ul className="mt-6 list-none space-y-2">
          {plants.map((plant) => (
            <li key={plant.id}>
              <Link
                href={`/plants/${plant.id}`}
                className="block rounded-md border border-zinc-200 px-4 py-3 hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <span className="block font-medium text-foreground">
                  {plant.name}
                </span>
                <span className="block text-sm text-zinc-600 dark:text-zinc-400">
                  {plant.species}
                  {plant.acquiredDate
                    ? ` · ${formatAcquiredDate(plant.acquiredDate)}`
                    : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
