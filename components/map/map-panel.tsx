"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { selectedLocationToSearchParams, type CityLocation } from "@/lib/city-search/geocoding";
import { uk } from "@/lib/i18n/uk";
import { reverseGeocodeCoordinates } from "@/lib/map/reverse-geocode-client";
import { MapSkeleton } from "./map-skeleton";

const MapView = dynamic(() => import("./map-view").then((module) => module.MapView), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

type MapPanelProps = {
  location: CityLocation | null;
  onSelectLocation: (location: CityLocation) => void;
};

export function MapPanel({ location, onSelectLocation }: MapPanelProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleMapClick(latitude: number, longitude: number) {
    setStatus("loading");

    try {
      const nextLocation = await reverseGeocodeCoordinates(latitude, longitude);
      onSelectLocation(nextLocation);

      const nextUrl = new URL(window.location.href);
      nextUrl.search = selectedLocationToSearchParams(nextLocation).toString();
      window.history.replaceState(null, "", nextUrl);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      className="flex min-h-[24rem] flex-col rounded-[1.5rem] border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_rgba(26,35,50,0.08)] backdrop-blur dark:border-white/10 dark:bg-[#1a2332]/80 md:col-span-1 xl:col-span-1"
      aria-labelledby="map-panel-title"
    >
      <div className="mb-5 h-2 w-20 rounded-full bg-[#3b6fd9]/25 dark:bg-[#6b9fff]/25" />
      <h2
        id="map-panel-title"
        className="text-xl font-semibold text-[#1a2332] dark:text-[#e8edf4]"
      >
        {uk.map.panelTitle}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#5c6b7a] dark:text-[#8b9bb0]">
        {uk.map.hint}
      </p>

      <div className="relative mt-5 h-[320px] shrink-0 overflow-hidden rounded-[1.25rem] border border-[#d8e3f0] dark:border-white/10">
        {location ? (
          <MapView location={location} onMapClick={handleMapClick} />
        ) : (
          <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm leading-6 text-[#5c6b7a] dark:text-[#8b9bb0]">
            {uk.map.placeholder}
          </div>
        )}
      </div>

      {status === "loading" ? (
        <p className="mt-3 text-sm text-[#5c6b7a] dark:text-[#8b9bb0]">{uk.map.loading}</p>
      ) : null}
      {status === "error" ? (
        <p className="mt-3 text-sm text-[#5c6b7a] dark:text-[#8b9bb0]">{uk.map.error}</p>
      ) : null}
    </section>
  );
}
