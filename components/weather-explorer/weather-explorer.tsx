"use client";

import { useState } from "react";
import { AnimatedBackground } from "@/components/animated-bg/animated-background";
import { AppFooter } from "@/components/bottom-jokes/app-footer";
import { CitySearch } from "@/components/city-search/city-search";
import { ForecastPanel } from "@/components/forecast/forecast-panel";
import { MapPanel } from "@/components/map/map-panel";
import { PinnedCitiesBar } from "@/components/weekend-compare/pinned-cities-bar";
import { WeekendComparePanel } from "@/components/weekend-compare/weekend-compare-panel";
import type { CityLocation } from "@/lib/city-search/geocoding";
import { selectedLocationToSearchParams } from "@/lib/city-search/geocoding";
import { uk } from "@/lib/i18n/uk";
import { shellContent } from "@/lib/shell/shell-content";
import {
  addPinnedCity,
  removePinnedCity,
} from "@/lib/weekend-compare/pins";

export function WeatherExplorer() {
  const [selectedLocation, setSelectedLocation] = useState<CityLocation | null>(null);
  const [pinnedCities, setPinnedCities] = useState<CityLocation[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  function handleSelectLocation(location: CityLocation) {
    setSelectedLocation(location);

    const nextUrl = new URL(window.location.href);
    nextUrl.search = selectedLocationToSearchParams(location).toString();
    window.history.replaceState(null, "", nextUrl);
  }

  function handlePin(location: CityLocation) {
    setPinnedCities((current) => addPinnedCity(current, location));
  }

  function handleUnpin(location: CityLocation) {
    setPinnedCities((current) => removePinnedCity(current, location));
  }

  return (
    <>
      <AnimatedBackground location={selectedLocation} />
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-5 pb-10 pt-4 sm:px-8 md:grid-cols-2 xl:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.35fr)_minmax(18rem,1fr)]">
      <section className="md:col-span-2 xl:col-span-1" aria-labelledby="shell-hero-title">
        <div className="flex h-full flex-col items-center gap-6 rounded-[2rem] border border-white/70 bg-white/80 px-6 py-12 text-center shadow-[0_24px_80px_rgba(26,35,50,0.10)] backdrop-blur dark:border-white/10 dark:bg-[#1a2332]/90 sm:px-10 xl:items-start xl:text-left">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#3b6fd9] dark:text-[#6b9fff]">
            {shellContent.eyebrow}
          </p>
          <div className="space-y-4">
            <h1
              id="shell-hero-title"
              className="text-balance text-4xl font-semibold tracking-tight text-[#1a2332] dark:text-[#e8edf4] sm:text-5xl"
            >
              {shellContent.heroTitle}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#5c6b7a] dark:text-[#8b9bb0]">
              {shellContent.heroSubtitle}
            </p>
          </div>

          <CitySearch
            key={
              selectedLocation
                ? `${selectedLocation.id}-${selectedLocation.latitude.toFixed(4)}-${selectedLocation.longitude.toFixed(4)}`
                : "empty"
            }
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectLocation}
          />

          <p className="text-sm text-[#5c6b7a] dark:text-[#8b9bb0]">
            {shellContent.geolocationPolicy}
          </p>

          <aside className="mt-auto rounded-3xl border border-[#d8e3f0] bg-white/60 p-5 text-left dark:border-white/10 dark:bg-[#0f1419]/55">
            <h2 className="text-lg font-semibold text-[#1a2332] dark:text-[#e8edf4]">
              {shellContent.sidePanelTitle}
            </h2>
            <p className="mt-2 leading-7 text-[#5c6b7a] dark:text-[#8b9bb0]">
              {shellContent.sidePanelText}
            </p>
          </aside>
        </div>
      </section>

      <div className="flex flex-col gap-4 md:col-span-1 xl:col-span-1">
        <PinnedCitiesBar
          pinnedCities={pinnedCities}
          activeLocation={selectedLocation}
          onPin={handlePin}
          onUnpin={handleUnpin}
        />

        <label className="flex items-start gap-3 rounded-[1.5rem] border border-white/70 bg-white/70 p-4 shadow-[0_18px_60px_rgba(26,35,50,0.08)] backdrop-blur dark:border-white/10 dark:bg-[#1a2332]/80">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[#3b6fd9]"
            checked={compareMode}
            disabled={pinnedCities.length === 0}
            onChange={(event) => setCompareMode(event.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium text-[#1a2332] dark:text-[#e8edf4]">
              {uk.compare.toggleLabel}
            </span>
            <span className="mt-1 block text-sm leading-6 text-[#5c6b7a] dark:text-[#8b9bb0]">
              {uk.compare.toggleHint}
            </span>
          </span>
        </label>

        {compareMode ? (
          <WeekendComparePanel
            pinnedCities={pinnedCities}
            activeLocation={selectedLocation}
            onMakeActive={handleSelectLocation}
          />
        ) : (
          <ForecastPanel key={selectedLocation?.id ?? "empty"} location={selectedLocation} />
        )}
      </div>

      <MapPanel location={selectedLocation} onSelectLocation={handleSelectLocation} />
    </main>
    <AppFooter location={selectedLocation} />
    </>
  );
}
