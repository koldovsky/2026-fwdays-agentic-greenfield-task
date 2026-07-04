"use client";

import { ConfigPanel } from "@/components/empty-state/config-panel";
import { RouteMapPanel } from "@/components/map/route-map-panel";
import { ItinerarySidebar } from "@/components/route-details/itinerary-sidebar";
import { useRoutePlan } from "@/components/route-planning/route-plan-provider";
import { cn } from "@/lib/utils";

/** Shared width for the form column and route-details column. */
const SIDE_COLUMN_CLASS = "w-full shrink-0 lg:w-80 xl:w-96";

const RESULTS_ROW_CLASS =
  "flex min-h-0 w-full flex-1 flex-col gap-4 lg:flex-row lg:items-stretch lg:overflow-hidden";

export function RouteResultsLayout() {
  const { itinerary, status } = useRoutePlan();
  const hasResults = status === "success" && itinerary !== null;

  if (!hasResults) {
    return (
      <div className="flex w-full flex-1 items-center justify-center overflow-visible px-4">
        <ConfigPanel className="w-full" />
      </div>
    );
  }

  return (
    <div className={RESULTS_ROW_CLASS}>
      <section className={cn("flex min-h-0 flex-col overflow-visible", SIDE_COLUMN_CLASS)}>
        <ConfigPanel fillHeight className="min-h-0" />
      </section>

      <section className="flex min-h-[280px] min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
        <RouteMapPanel itinerary={itinerary} className="h-full min-h-[280px] flex-1 lg:min-h-0" />
      </section>

      <section className={cn("flex min-h-0 flex-col lg:overflow-hidden", SIDE_COLUMN_CLASS)}>
        <ItinerarySidebar className="h-full min-h-0" />
      </section>
    </div>
  );
}
