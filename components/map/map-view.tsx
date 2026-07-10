"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { CityLocation } from "@/lib/city-search/geocoding";
import {
  DEFAULT_MAP_ZOOM,
  getMapCenter,
  getMarkerPopupLabel,
  MAP_MIN_HEIGHT_PX,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/lib/map/map-config";
import { cityMarkerIcon } from "./map-icons";

type MapViewProps = {
  location: CityLocation;
  onMapClick: (latitude: number, longitude: number) => void;
};

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function MapSizeSync() {
  const map = useMap();

  useEffect(() => {
    const syncSize = () => {
      map.invalidateSize({ animate: false });
    };

    syncSize();
    const frame = window.requestAnimationFrame(syncSize);

    const container = map.getContainer().parentElement;
    const observer =
      container &&
      new ResizeObserver(() => {
        syncSize();
      });

    if (container && observer) {
      observer.observe(container);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}

export function MapView({ location, onMapClick }: MapViewProps) {
  const mapKey = `${location.id}-${location.latitude.toFixed(4)}-${location.longitude.toFixed(4)}`;

  return (
    <MapContainer
      key={mapKey}
      center={getMapCenter(location)}
      zoom={DEFAULT_MAP_ZOOM}
      scrollWheelZoom
      style={{ height: MAP_MIN_HEIGHT_PX, width: "100%" }}
      className="z-0 rounded-[1.25rem]"
      aria-label={location.label}
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <MapSizeSync />
      <MapClickHandler onMapClick={onMapClick} />
      <Marker position={getMapCenter(location)} icon={cityMarkerIcon}>
        <Popup>{getMarkerPopupLabel(location)}</Popup>
      </Marker>
    </MapContainer>
  );
}
