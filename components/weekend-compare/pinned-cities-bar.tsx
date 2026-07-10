"use client";

import type { CityLocation } from "@/lib/city-search/geocoding";
import { uk } from "@/lib/i18n/uk";
import {
  canPinCity,
  isPinned,
  isSameLocation,
  locationKey,
} from "@/lib/weekend-compare/pins";

type PinnedCitiesBarProps = {
  pinnedCities: CityLocation[];
  activeLocation: CityLocation | null;
  onPin: (location: CityLocation) => void;
  onUnpin: (location: CityLocation) => void;
};

export function PinnedCitiesBar({
  pinnedCities,
  activeLocation,
  onPin,
  onUnpin,
}: PinnedCitiesBarProps) {
  const showPinButton =
    activeLocation &&
    !isPinned(pinnedCities, activeLocation) &&
    canPinCity(pinnedCities);

  return (
    <section
      className="rounded-[1.5rem] border border-white/70 bg-white/70 p-4 shadow-[0_18px_60px_rgba(26,35,50,0.08)] backdrop-blur dark:border-white/10 dark:bg-[#1a2332]/80"
      aria-label={uk.compare.pinnedTitle}
    >
      <div className="flex flex-wrap items-center gap-2">
        {pinnedCities.map((city) => (
          <span
            key={locationKey(city)}
            className="inline-flex items-center gap-2 rounded-full border border-[#d8e3f0] bg-white px-3 py-1.5 text-sm text-[#1a2332] dark:border-white/10 dark:bg-[#0f1419] dark:text-[#e8edf4]"
          >
            {city.flag ? `${city.flag} ` : ""}
            {city.name}
            <button
              type="button"
              className="text-[#5c6b7a] underline-offset-2 hover:underline dark:text-[#8b9bb0]"
              onClick={() => onUnpin(city)}
            >
              {uk.compare.removePin}
            </button>
          </span>
        ))}
      </div>

      {showPinButton ? (
        <button
          type="button"
          className="mt-3 rounded-full bg-[#3b6fd9] px-4 py-2 text-sm font-medium text-white dark:bg-[#6b9fff] dark:text-[#0f1419]"
          onClick={() => onPin(activeLocation)}
        >
          {uk.compare.pinLabel}
        </button>
      ) : null}

      {activeLocation &&
      !isPinned(pinnedCities, activeLocation) &&
      !canPinCity(pinnedCities) ? (
        <p className="mt-3 text-sm text-[#5c6b7a] dark:text-[#8b9bb0]">{uk.compare.pinLimit}</p>
      ) : null}
    </section>
  );
}

export function isActivePinnedCity(
  activeLocation: CityLocation | null,
  city: CityLocation,
): boolean {
  return activeLocation ? isSameLocation(activeLocation, city) : false;
}
