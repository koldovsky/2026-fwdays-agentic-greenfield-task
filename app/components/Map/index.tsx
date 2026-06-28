"use client";

// Must be a Client Component: `ssr: false` in next/dynamic only works inside
// client components (per Next.js 16 docs).
import dynamic from "next/dynamic";
import { MapSkeleton } from "./MapSkeleton";
import { usePinnedCitiesContext } from "@/app/components/PinnedCities/PinnedCitiesContext";

const MapClientDynamic = dynamic(() => import("./MapClient").then((m) => m.MapClient), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

type Props = {
  lat: number;
  lon: number;
  name: string;
};

export function Map({ lat, lon, name }: Props) {
  const { pin } = usePinnedCitiesContext();
  return (
    <div className="h-full">
      <MapClientDynamic lat={lat} lon={lon} name={name} onPin={pin} />
    </div>
  );
}
