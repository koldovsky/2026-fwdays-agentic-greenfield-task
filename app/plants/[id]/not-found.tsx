// Plant-detail not-found boundary (design.md D5) — FR-SHELL-01.
// Triggered when the detail page calls notFound() for a missing id. Friendly
// Ukrainian copy + link back to the list, framed by the shell.

import { Button } from "@/components/ui/Button";
import { uk } from "@/lib/i18n/uk";

export default function PlantNotFound() {
  return (
    <section className="py-8">
      <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">
        {uk.notFound.title}
      </h1>
      <p className="mt-2 font-body text-sm text-stone">
        {uk.notFound.description}
      </p>
      <div className="mt-4">
        <Button variant="ghost" href="/">
          {uk.nav.backToList}
        </Button>
      </div>
    </section>
  );
}
