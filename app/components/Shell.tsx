import { Suspense } from "react";
import { uk } from "@/lib/i18n/uk";
import { TopBar } from "./TopBar";
import { Hero } from "./Hero";
import { Footer } from "./Footer";
import { CitySearch } from "./CitySearch";
import { ForecastRegionClient } from "./forecast/ForecastRegionClient";
import { ForecastBgProvider } from "./animated-bg/ForecastBgContext";
import { AnimatedBackground } from "./animated-bg/AnimatedBackground";
import { Map } from "./Map";
import { PinnedCitiesProvider } from "./PinnedCities/PinnedCitiesContext";

type Location = { lat: number; lon: number; name: string };

// Populated layout: search row + two-column content row (FR-SHELL-02).
// The outer Shell constrains height to h-dvh so no vertical scroll occurs.
// TopBar is ~64 px; main flex-1 fills the remainder.
function RegionGrid({ location }: { location: Location }) {
  return (
    <div className="flex h-full flex-col gap-4">
      {/* Row 1: Search — full-width */}
      <div aria-label={uk.regions.search} data-slot="search">
        <Suspense
          fallback={<div className="h-12 rounded-md border border-border bg-surface shadow-sm" />}
        >
          <CitySearch />
        </Suspense>
      </div>

      {/* Row 2: Forecast (65 %) + Map (35 %) side by side */}
      <div className="grid min-h-0 flex-1 grid-cols-[65%_35%] gap-4">
        {/* Forecast region — FR-FORECAST-01..05, weekend-compare */}
        <section
          aria-label={uk.regions.forecast}
          data-slot="forecast"
          className="h-full overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-sm"
        >
          <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-surface-sunken" />}>
            <ForecastRegionClient />
          </Suspense>
        </section>

        {/* Map region — FR-MAP-01..05 */}
        <section aria-label={uk.regions.map} data-slot="map" className="h-full min-h-[300px]">
          <Map lat={location.lat} lon={location.lon} name={location.name} />
        </section>
      </div>
    </div>
  );
}

// App shell (FR-SHELL-01): banner + main + contentinfo. Hero visibility is
// gated on a single boolean so the `city-search` capability can flip it via
// the ?lat=&lon=&name= URL state (FR-SEARCH-03) without re-laying out the page.
export function Shell({
  hasActiveLocation = false,
  location,
}: {
  hasActiveLocation?: boolean;
  location?: Location;
}) {
  return (
    // PinnedCitiesProvider wraps everything so CitySearch (in Hero + RegionGrid)
    // and ForecastRegionClient can both consume the same pinned-cities context.
    <PinnedCitiesProvider>
      <ForecastBgProvider>
        {/* FR-ANIM-01..04: animated background only when a location is active */}
        {hasActiveLocation && <AnimatedBackground />}
        {/* position: relative + z-index ensures content stays above the fixed bg layer */}
        {/* h-dvh when a city is active so everything fits without vertical scroll (FR-SHELL-02) */}
        <div
          className={`relative flex flex-col ${hasActiveLocation ? "h-dvh" : "min-h-screen"}`}
          style={{ zIndex: "var(--z-content)" }}
        >
          <TopBar />
          <main
            className={`mx-auto flex w-full max-w-screen-2xl flex-1 flex-col px-[22px] ${
              hasActiveLocation ? "overflow-hidden py-4" : "py-8"
            }`}
          >
            {hasActiveLocation && location ? <RegionGrid location={location} /> : <Hero />}
          </main>
          <Footer />
        </div>
      </ForecastBgProvider>
    </PinnedCitiesProvider>
  );
}
