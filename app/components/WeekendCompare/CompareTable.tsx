"use client";

import { uk } from "@/lib/i18n/uk";
import type { ForecastDay, ForecastResponse, PinnedCity } from "@/lib/forecast/types";
import { comfortScore } from "@/lib/scoring/comfort";
import { getWeekendDays } from "@/lib/forecast/weekendDays";

function comfortBadgeClass(value: number): string {
  if (value >= 70) return "bg-comfort-good-bg text-comfort-good-fg";
  if (value >= 40) return "bg-comfort-fair-bg text-comfort-fair-fg";
  return "bg-comfort-poor-bg text-comfort-poor-fg";
}

function ColumnSkeleton({ id }: { id: string }) {
  return (
    <td key={id} className="px-4 py-4 align-top">
      <div className="flex flex-col items-center gap-2">
        <div className="h-4 w-20 animate-pulse rounded bg-surface-sunken" />
        <div className="h-3 w-16 animate-pulse rounded bg-surface-sunken" />
        <div className="h-6 w-14 animate-pulse rounded-pill bg-surface-sunken" />
      </div>
    </td>
  );
}

function DayCell({ day, noData }: { day: ForecastDay | null; noData: string }) {
  if (!day) {
    return <td className="px-4 py-4 text-center font-mono text-lg text-text-muted">{noData}</td>;
  }

  const comfort = comfortScore(day);

  return (
    <td className="px-4 py-4 align-top">
      <div className="flex flex-col items-center gap-2 text-center">
        {/* Hi / Lo */}
        <div className="font-mono text-sm tabular-nums">
          <span className="font-semibold text-text">{day.highC}°</span>
          <span className="text-text-muted"> / {day.lowC}°</span>
        </div>
        {/* Precip */}
        <span className="font-mono text-xs tabular-nums text-text-secondary">
          {day.precipProbability}%{" "}
          <span className="font-sans text-text-muted">{uk.forecast.precipLabel.toLowerCase()}</span>
        </span>
        {/* Comfort badge */}
        <span
          className={[
            "w-full max-w-[64px] rounded-pill px-2 py-0.5 text-center font-mono text-xs font-semibold tabular-nums",
            comfortBadgeClass(comfort.value),
          ].join(" ")}
          aria-label={`${uk.comfort.badgeLabel}: ${comfort.value}`}
          title={comfort.rationale}
        >
          {comfort.value}
        </span>
      </div>
    </td>
  );
}

export function CompareTable({
  pins,
  forecasts,
  loading,
  onMakeActive,
}: {
  pins: PinnedCity[];
  forecasts: (ForecastResponse | null)[];
  loading: boolean[];
  onMakeActive: (pin: PinnedCity) => void;
}) {
  return (
    // Task 7.5: horizontal scroll for narrow viewports
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[320px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {/* Day-label column header (empty corner) */}
            <th
              scope="col"
              // Task 8.2: sticky top-0 keeps headers visible on vertical scroll
              className="sticky top-0 z-10 bg-surface px-4 py-3"
              aria-hidden="true"
            />
            {/* Task 8.1: city column headers */}
            {pins.map((pin) => (
              <th
                key={`${pin.lat},${pin.lon}`}
                scope="col"
                className="sticky top-0 z-10 bg-surface px-4 py-3 text-center"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-medium text-text">{pin.name}</span>
                  {/* Task 8.3: "make active" button */}
                  <button
                    type="button"
                    onClick={() => onMakeActive(pin)}
                    // Task 9.1 + 8.1 accessible label
                    aria-label={`Зробити ${pin.name} активним`}
                    className="rounded-md border border-brand px-2 py-0.5 text-xs text-brand transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
                  >
                    {uk.compare.makeActive}
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Saturday row */}
          <tr className="border-b border-border">
            <th
              scope="row"
              className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-text-secondary"
            >
              {uk.compare.saturday}
            </th>
            {pins.map((pin, i) => {
              const key = `${pin.lat},${pin.lon}`;
              if (loading[i]) return <ColumnSkeleton key={`${key}-sat`} id={`${key}-sat`} />;
              const weekend = forecasts[i] ? getWeekendDays(forecasts[i]!.days) : null;
              return (
                <DayCell
                  key={`${key}-sat`}
                  day={weekend?.saturday ?? null}
                  noData={uk.compare.noData}
                />
              );
            })}
          </tr>
          {/* Sunday row */}
          <tr>
            <th
              scope="row"
              className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-text-secondary"
            >
              {uk.compare.sunday}
            </th>
            {pins.map((pin, i) => {
              const key = `${pin.lat},${pin.lon}`;
              if (loading[i]) return <ColumnSkeleton key={`${key}-sun`} id={`${key}-sun`} />;
              const weekend = forecasts[i] ? getWeekendDays(forecasts[i]!.days) : null;
              return (
                <DayCell
                  key={`${key}-sun`}
                  day={weekend?.sunday ?? null}
                  noData={uk.compare.noData}
                />
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
