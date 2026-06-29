// Add-plant route (design D6) — thin server component framing the client form
// island. On success the action revalidates the list; the form island handles
// the inline-error round-trip. Reachable in <= 2 clicks from the list (NFR-USA-01).
//
// @trace FR-PLANT-01

import Link from "next/link";

import { PlantForm } from "@/components/plants/PlantForm";
import { uk } from "@/lib/i18n/uk";

export default function NewPlantPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {uk.plants.addTitle}
      </h1>
      <PlantForm />
      <Link
        href="/"
        className="mt-4 inline-flex rounded-md text-sm font-medium text-zinc-900 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:text-zinc-100"
      >
        {uk.nav.backToList}
      </Link>
    </section>
  );
}
