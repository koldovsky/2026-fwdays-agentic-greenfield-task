import { Suspense } from "react";
import { uk } from "@/lib/i18n/uk";
import { CitySearch } from "./CitySearch";

// Skeleton sized to match the CitySearch input so layout is stable on load
function SearchSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-12 w-full rounded-md border border-border bg-surface shadow-sm"
    />
  );
}

// First-load empty/hero state (FR-SHELL-03): calm Ukrainian hero copy with a
// prominently centered city-search slot.
export function Hero() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-[22px] py-16 text-center">
      <div className="w-full max-w-[560px]">
        <h1 className="m-0 text-3xl font-bold leading-tight tracking-[-0.02em] text-text sm:text-[2.25rem]">
          {uk.hero.heading}
        </h1>
        <p className="mx-auto mt-2.5 mb-7 max-w-prose text-balance text-md text-text-secondary">
          {uk.hero.subcopy}
        </p>
        {/* Suspense boundary required by Next.js App Router for useSearchParams */}
        <div aria-label={uk.regions.search} data-slot="search">
          <Suspense fallback={<SearchSkeleton />}>
            <CitySearch />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
