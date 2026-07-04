"use client";

import { DayGroupCard } from "@/components/route-details/day-group-card";
import { useRoutePlan } from "@/components/route-planning/route-plan-provider";
import {
  estimateDurationMinutes,
  formatDurationUk,
} from "@/lib/itinerary-metrics";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ItinerarySidebarProps = {
  className?: string;
};

export function ItinerarySidebar({ className }: ItinerarySidebarProps) {
  const { itinerary, status } = useRoutePlan();

  if (status !== "success" || !itinerary) {
    return null;
  }

  const totalDuration = formatDurationUk(
    estimateDurationMinutes(itinerary.totalDistanceKm),
  );

  return (
    <aside
      aria-live="polite"
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card text-foreground",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
        <section>
          <h2 className="text-base font-semibold leading-tight text-foreground">
            {t("itinerary.overviewTitle")}
          </h2>
          <dl className="mt-3 grid gap-2 text-sm text-foreground">
            <div className="flex items-baseline justify-between gap-4">
              <dt>{t("itinerary.distance")}</dt>
              <dd className="font-mono tabular-nums">
                {itinerary.totalDistanceKm} km
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt>{t("itinerary.days")}</dt>
              <dd className="font-mono tabular-nums">{itinerary.totalDays}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt>{t("itinerary.duration")}</dt>
              <dd className="font-mono tabular-nums">{totalDuration}</dd>
            </div>
          </dl>
        </section>

        <div className="flex flex-col gap-3">
          {itinerary.days.map((day) => (
            <DayGroupCard key={day.dayIndex} day={day} />
          ))}
        </div>
      </div>
    </aside>
  );
}
