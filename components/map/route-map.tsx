"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useMemo } from "react";
import { MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";

import { MapAttribution } from "@/components/map/map-attribution";
import { RouteMapMarkers } from "@/components/map/route-map-markers";
import type { Itinerary } from "@/lib/route-engine";

type FitBoundsProps = {
  positions: [number, number][];
};

function FitBounds({ positions }: FitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [24, 24] });
    }
  }, [map, positions]);

  return null;
}

type RouteMapProps = {
  itinerary: Itinerary;
};

export function RouteMap({ itinerary }: RouteMapProps) {
  const positions = useMemo(
    () =>
      itinerary.polyline.map(
        (point) => [point.lat, point.lon] as [number, number],
      ),
    [itinerary],
  );
  const center = positions[0] ?? ([50.45, 30.52] as [number, number]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden rounded-lg ring-1 ring-border">
      <MapContainer
        center={center}
        zoom={6}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          positions={positions}
          pathOptions={{ color: "#b45309", weight: 4, opacity: 0.85 }}
        />
        <RouteMapMarkers stops={itinerary.stops} />
        <FitBounds positions={positions} />
      </MapContainer>
      <MapAttribution />
    </div>
  );
}
