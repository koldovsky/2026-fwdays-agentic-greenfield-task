// Plant-detail not-found boundary (design.md D5) — FR-SHELL-01.
// Triggered when the detail page calls notFound() for a missing id. Friendly
// Ukrainian copy + link back to the list, framed by the shell.

import Link from "next/link";

import { uk } from "@/lib/i18n/uk";

export default function PlantNotFound() {
  return (
    <section className="py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{uk.notFound.title}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{uk.notFound.description}</p>
      <Link
        href="/"
        className="mt-4 inline-flex rounded-md text-sm font-medium text-zinc-900 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:text-zinc-100"
      >
        {uk.nav.backToList}
      </Link>
    </section>
  );
}
