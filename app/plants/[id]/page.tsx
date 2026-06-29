// Plant detail (placeholder) — server component (design.md D1, D5).
// No DB yet (slice 2 wires the real lookup); this page demonstrates the
// detail route + the not-found boundary. A non-existent id calls notFound() so
// an unknown /plants/[id] renders the friendly not-found state, never a 500.

import { notFound } from "next/navigation";
import Link from "next/link";

import { uk } from "@/lib/i18n/uk";

// Placeholder "known" ids until slice 2 introduces a real plant store.
const KNOWN_PLACEHOLDER_IDS = new Set(["1", "2", "3"]);

export default async function PlantDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!KNOWN_PLACEHOLDER_IDS.has(id)) {
    notFound();
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {uk.nav.plants} #{id}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Деталі рослини зʼявляться у наступному етапі.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex rounded-md text-sm font-medium text-zinc-900 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:text-zinc-100"
      >
        {uk.nav.backToList}
      </Link>
    </section>
  );
}
