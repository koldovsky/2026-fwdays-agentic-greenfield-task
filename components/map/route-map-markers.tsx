"use client";

import L from "leaflet";
import { CircleMarker, Marker, Tooltip } from "react-leaflet";

import {
  MapStopLabel,
  shouldShowMapStopLabel,
} from "@/components/map/map-stop-label";
import type { RouteStop } from "@/lib/route-engine";

const MARKER_COLORS: Record<RouteStop["kind"], string> = {
  start: "#16a34a",
  end: "#dc2626",
  rest: "#2563eb",
  overnight: "#9333ea",
};

const MARKER_RADIUS: Record<Exclude<RouteStop["kind"], "overnight">, number> = {
  start: 8,
  end: 8,
  rest: 6,
};

function overnightIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;background:#9333ea;transform:rotate(45deg);border:2px solid #ffffff;box-sizing:border-box;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function StopLabelTooltip({ stop }: { stop: RouteStop }) {
  if (!shouldShowMapStopLabel(stop)) {
    return null;
  }

  return (
    <Tooltip
      permanent
      direction="top"
      offset={[0, -8]}
      className="map-stop-label"
      opacity={1}
    >
      <MapStopLabel stop={stop} />
    </Tooltip>
  );
}

type RouteMapMarkersProps = {
  stops: RouteStop[];
};

export function RouteMapMarkers({ stops }: RouteMapMarkersProps) {
  return (
    <>
      {stops.map((stop, index) => {
        const key = `${stop.kind}-${stop.distanceFromStartKm}-${index}`;

        if (stop.kind === "overnight") {
          return (
            <Marker
              key={key}
              position={[stop.lat, stop.lon]}
              icon={overnightIcon()}
            >
              <StopLabelTooltip stop={stop} />
            </Marker>
          );
        }

        return (
          <CircleMarker
            key={key}
            center={[stop.lat, stop.lon]}
            radius={MARKER_RADIUS[stop.kind]}
            pathOptions={{
              color: MARKER_COLORS[stop.kind],
              fillColor: MARKER_COLORS[stop.kind],
              fillOpacity: 1,
              weight: 2,
            }}
          >
            <StopLabelTooltip stop={stop} />
          </CircleMarker>
        );
      })}
    </>
  );
}
