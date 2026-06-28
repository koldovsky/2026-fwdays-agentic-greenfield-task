"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { uk } from "@/lib/i18n/uk";
import type { PinnedCity } from "@/lib/forecast/types";

// Leaflet's default icon relies on auto-resolved asset paths that break with
// bundlers. Pin the icon to the CDN URLs that ship in the leaflet package.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Props = {
  lat: number;
  lon: number;
  name: string;
  onPin?: (city: PinnedCity) => void;
};

type ReverseResult = { name: string; lat: number; lon: number };

// Pans the Leaflet viewport whenever lat/lon props change after initial mount.
// Uses flyTo (animated) unless prefers-reduced-motion is set, in which case
// setView (instant) is used.
function MapViewSyncer({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip the very first effect run — MapContainer already centers on mount.
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      map.setView([lat, lon], map.getZoom());
    } else {
      map.flyTo([lat, lon], map.getZoom(), { duration: 0.8 });
    }
  }, [lat, lon, map]);

  return null;
}

function MapClickHandler({
  onLocationChange,
}: {
  onLocationChange: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapClient({ lat, lon, name, onPin }: Props) {
  const router = useRouter();
  const [errorVisible, setErrorVisible] = useState(false);

  async function handleLocationChange(clickLat: number, clickLon: number) {
    setErrorVisible(false);
    try {
      const res = await fetch(
        `/api/reverse-geocode?lat=${encodeURIComponent(clickLat)}&lon=${encodeURIComponent(clickLon)}`
      );
      if (!res.ok) {
        setErrorVisible(true);
        return;
      }
      const data: ReverseResult = await res.json();
      if (!data.name) {
        setErrorVisible(true);
        return;
      }
      const p = new URLSearchParams();
      p.set("lat", String(data.lat));
      p.set("lon", String(data.lon));
      p.set("name", data.name);
      router.push(`?${p.toString()}`);
      onPin?.({ name: data.name, lat: data.lat, lon: data.lon });
    } catch {
      setErrorVisible(true);
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-border shadow-sm">
      <MapContainer
        center={[lat, lon]}
        zoom={10}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        aria-label={uk.map.ariaLabel}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lon]}>
          <Popup>{name}</Popup>
        </Marker>
        <MapViewSyncer lat={lat} lon={lon} />
        <MapClickHandler onLocationChange={handleLocationChange} />
      </MapContainer>

      {errorVisible && (
        <p
          role="status"
          aria-live="polite"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-muted shadow-sm"
        >
          {uk.map.reverseError}
        </p>
      )}
    </div>
  );
}
