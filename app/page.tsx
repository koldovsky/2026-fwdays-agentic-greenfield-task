// Home / plant list (placeholder) — server component (design.md D1).
// Real plant data lands in slice 2; this slice renders a placeholder list view
// inside the shell and demonstrates the shared inline-error contract via a small
// example form (so FR-SHELL-03 is provably exercised in the running app).

import { ExampleForm } from "@/components/forms/ExampleForm";
import { uk } from "@/lib/i18n/uk";

export default function Home() {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{uk.nav.plants}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Список рослин зʼявиться згодом. Поки що це порожній перелік.
      </p>
      <ul className="mt-4 list-none space-y-2 text-foreground">
        <li className="text-sm text-zinc-500 dark:text-zinc-500">Поки що немає рослин.</li>
      </ul>
      <ExampleForm />
    </section>
  );
}
