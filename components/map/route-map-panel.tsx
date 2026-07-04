"use client";

import dynamic from "next/dynamic";

import { MapSkeleton } from "@/components/map/map-skeleton";
import type { Itinerary } from "@/lib/route-engine";
import { cn } from "@/lib/utils";

const RouteMapClient = dynamic(
  () =>
    import("@/components/map/route-map").then((module) => module.RouteMap),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  },
);

type RouteMapPanelProps = {
  itinerary: Itinerary;
  className?: string;
};

export function RouteMapPanel({ itinerary, className }: RouteMapPanelProps) {
  return (
    <div className={cn("h-full w-full", className)}>
      <RouteMapClient itinerary={itinerary} />
    </div>
  );
}
