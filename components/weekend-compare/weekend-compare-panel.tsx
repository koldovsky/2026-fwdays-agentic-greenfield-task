"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { CityLocation } from "@/lib/city-search/geocoding";
import { fetchForecast } from "@/lib/forecast/forecast-client";
import { uk } from "@/lib/i18n/uk";
import { buildWeekendCompareRows, type WeekendCompareRow } from "@/lib/weekend-compare/compare-table";
import { locationKey } from "@/lib/weekend-compare/pins";
import { isActivePinnedCity } from "./pinned-cities-bar";

type WeekendComparePanelProps = {
  pinnedCities: CityLocation[];
  activeLocation: CityLocation | null;
  onMakeActive: (location: CityLocation) => void;
};

type CompareColumn = {
  location: CityLocation;
  rows: WeekendCompareRow[];
  error: boolean;
};

export function WeekendComparePanel({
  pinnedCities,
  activeLocation,
  onMakeActive,
}: WeekendComparePanelProps) {
  const pinnedKey = pinnedCities.map((city) => locationKey(city)).join("|");
  const [snapshot, setSnapshot] = useState<{
    key: string;
    columns: CompareColumn[];
  } | null>(null);
  const columns = snapshot?.key === pinnedKey ? snapshot.columns : [];
  const loading = pinnedCities.length > 0 && snapshot?.key !== pinnedKey;

  useEffect(() => {
    if (pinnedCities.length === 0) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      pinnedCities.map(async (location) => {
        try {
          const forecast = await fetchForecast(location);
          return {
            location,
            rows: buildWeekendCompareRows(forecast.days),
            error: false,
          };
        } catch {
          return {
            location,
            rows: [],
            error: true,
          };
        }
      }),
    ).then((nextColumns) => {
      if (!cancelled) {
        setSnapshot({ key: pinnedKey, columns: nextColumns });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pinnedCities, pinnedKey]);

  if (pinnedCities.length === 0) {
    return (
      <CompareShell>
        <p className="text-sm leading-6 text-[#5c6b7a] dark:text-[#8b9bb0]">
          {uk.compare.emptyPins}
        </p>
      </CompareShell>
    );
  }

  if (loading && columns.length === 0) {
    return (
      <CompareShell>
        <p className="text-sm leading-6 text-[#5c6b7a] dark:text-[#8b9bb0]">
          {uk.compare.loading}
        </p>
      </CompareShell>
    );
  }

  const hasErrors = columns.some((column) => column.error);

  return (
    <CompareShell>
      {hasErrors ? (
        <p className="mb-4 text-sm leading-6 text-[#5c6b7a] dark:text-[#8b9bb0]">
          {uk.compare.error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white/95 dark:bg-[#1a2332]/95">
            <tr>
              <th className="border-b border-[#d8e3f0] px-3 py-3 dark:border-white/10">
                {uk.forecast.weekendTitle}
              </th>
              {columns.map((column) => (
                <th
                  key={column.location.id}
                  className="border-b border-[#d8e3f0] px-3 py-3 align-top dark:border-white/10"
                >
                  <div className="space-y-2">
                    <p className="font-semibold text-[#1a2332] dark:text-[#e8edf4]">
                      {column.location.name}
                    </p>
                    {isActivePinnedCity(activeLocation, column.location) ? (
                      <p className="text-xs text-[#2d9f83] dark:text-[#4fd1a5]">
                        {uk.citySearch.selectedPrefix}
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="text-xs text-[#3b6fd9] underline-offset-2 hover:underline dark:text-[#6b9fff]"
                        onClick={() => onMakeActive(column.location)}
                      >
                        {uk.compare.makeActive}
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[uk.compare.saturday, uk.compare.sunday].map((label, index) => (
              <tr key={label}>
                <th
                  scope="row"
                  className="border-b border-[#d8e3f0] px-3 py-3 font-medium text-[#5c6b7a] dark:border-white/10 dark:text-[#8b9bb0]"
                >
                  {label}
                </th>
                {columns.map((column) => {
                  const row = column.rows[index];

                  if (column.error) {
                    return (
                      <td
                        key={column.location.id}
                        className="border-b border-[#d8e3f0] px-3 py-3 text-[#5c6b7a] dark:border-white/10 dark:text-[#8b9bb0]"
                      >
                        —
                      </td>
                    );
                  }

                  if (!row) {
                    return (
                      <td
                        key={column.location.id}
                        className="border-b border-[#d8e3f0] px-3 py-3 text-[#5c6b7a] dark:border-white/10 dark:text-[#8b9bb0]"
                      >
                        {uk.forecast.empty}
                      </td>
                    );
                  }

                  return (
                    <td
                      key={column.location.id}
                      className="border-b border-[#d8e3f0] px-3 py-3 dark:border-white/10"
                    >
                      <p className="font-medium text-[#1a2332] dark:text-[#e8edf4]">
                        {Math.round(row.temperatureMaxC)}° / {Math.round(row.temperatureMinC)}°
                      </p>
                      <p className="mt-1 text-[#5c6b7a] dark:text-[#8b9bb0]">
                        {uk.compare.precipitation}: {row.precipitationProbability}%
                      </p>
                      <p className={`mt-1 ${comfortTierClassName(row.comfortTier)}`}>
                        {uk.compare.comfort}: {row.comfortValue}/100 · {row.comfortRationale}
                      </p>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CompareShell>
  );
}

function CompareShell({ children }: { children: ReactNode }) {
  return (
    <section className="min-h-44 rounded-[1.5rem] border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_rgba(26,35,50,0.08)] backdrop-blur dark:border-white/10 dark:bg-[#1a2332]/80">
      <div className="mb-5 h-2 w-20 rounded-full bg-[#3b6fd9]/25 dark:bg-[#6b9fff]/25" />
      <h2 className="mb-4 text-xl font-semibold text-[#1a2332] dark:text-[#e8edf4]">
        {uk.compare.toggleLabel}
      </h2>
      {children}
    </section>
  );
}

function comfortTierClassName(tier: "green" | "yellow" | "red"): string {
  if (tier === "green") return "text-[#2d9f83] dark:text-[#4fd1a5]";
  if (tier === "yellow") return "text-[#d4a017] dark:text-[#e8b84a]";
  return "text-[#c94c4c] dark:text-[#f07171]";
}
