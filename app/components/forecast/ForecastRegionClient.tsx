"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { uk } from "@/lib/i18n/uk";
import { usePinnedCities } from "@/app/hooks/usePinnedCities";
import { useCompareForecasts } from "@/app/hooks/useCompareForecasts";
import { PinnedChipRow } from "../PinnedCities/PinnedChipRow";
import { CompareTable } from "../WeekendCompare/CompareTable";
import { ForecastPanel } from "./ForecastPanel";
import type { PinnedCity } from "@/lib/forecast/types";

function IconSwitchH({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4m4 4H4" />
    </svg>
  );
}

// Task 4.3: integrates PinnedChipRow above the forecast panel.
// Tasks 5.1–5.3: owns isComparing state and the compare toggle.
// Task 8.3: handleMakeActive navigates to a pinned city and exits compare mode.
export function ForecastRegionClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeName = searchParams.get("name") ?? "";
  const { pins, unpin } = usePinnedCities();
  const { data: forecasts, loading } = useCompareForecasts(pins);

  // isComparing resets when fewer than 2 pins remain (nothing to compare)
  const [isComparing, setIsComparing] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (pins.length < 2) {
      setTimeout(() => {
        if (!cancelled) setIsComparing(false);
      }, 0);
    }
    return () => {
      cancelled = true;
    };
  }, [pins]);

  // Task 8.3: set city as active location, exit compare mode
  function handleMakeActive(pin: PinnedCity) {
    const p = new URLSearchParams();
    p.set("lat", String(pin.lat));
    p.set("lon", String(pin.lon));
    p.set("name", pin.name);
    router.push(`?${p.toString()}`);
    setIsComparing(false);
  }

  function handleUnpin(city: PinnedCity) {
    const fallback = unpin(city);
    const isActive = city.name === activeName;
    if (isActive && fallback) {
      const p = new URLSearchParams();
      p.set("lat", String(fallback.lat));
      p.set("lon", String(fallback.lon));
      p.set("name", fallback.name);
      router.push(`?${p.toString()}`);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Task 4.3: chip row + toggle header — shown only when cities are pinned */}
      {pins.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PinnedChipRow
            pins={pins}
            activeName={activeName || undefined}
            onSelect={handleMakeActive}
            onUnpin={handleUnpin}
          />

          {/* Compare toggle — disabled when fewer than 2 cities are pinned */}
          <button
            type="button"
            aria-pressed={isComparing}
            disabled={pins.length < 2}
            onClick={() => setIsComparing((v) => !v)}
            className={[
              "flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
              pins.length < 2
                ? "cursor-not-allowed border-border bg-surface text-text-faint opacity-40"
                : isComparing
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border bg-surface text-text hover:bg-surface-hover",
            ].join(" ")}
          >
            <IconSwitchH size={14} />
            {uk.compare.toggle}
          </button>
        </div>
      )}

      {/* Task 5.3: swap forecast panel ↔ compare table */}
      {isComparing ? (
        <CompareTable
          pins={pins}
          forecasts={forecasts}
          loading={loading}
          onMakeActive={handleMakeActive}
        />
      ) : (
        <ForecastPanel />
      )}
    </div>
  );
}
