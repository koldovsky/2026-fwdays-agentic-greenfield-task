// Global not-found boundary (design.md D5) — FR-SHELL-01.
// Friendly Ukrainian state with a link back to the list — never a raw 500 or
// blank screen. The shell still frames this (it lives under the root layout).

import { Button } from "@/components/ui/Button";
import { uk } from "@/lib/i18n/uk";

export default function NotFound() {
  return (
    <section className="py-8">
      <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">
        {uk.notFound.title}
      </h1>
      <p className="mt-2 font-body text-sm text-stone">
        {uk.notFound.genericDescription}
      </p>
      <div className="mt-4">
        <Button variant="ghost" href="/">
          {uk.nav.backToList}
        </Button>
      </div>
    </section>
  );
}
