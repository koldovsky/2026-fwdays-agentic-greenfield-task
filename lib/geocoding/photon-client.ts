import type { GeocodedPlace } from "./types";

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    city?: string;
    state?: string;
    county?: string;
    country?: string;
    type?: string;
    osm_value?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

const PHOTON_API = "https://photon.komoot.io/api/";

function normalizeFeature(feature: PhotonFeature, index: number): GeocodedPlace | null {
  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) {
    return null;
  }

  const [lon, lat] = coords;
  const props = feature.properties ?? {};
  const name = props.name ?? props.city ?? "";
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const region = props.state ?? props.county ?? "";
  const country = props.country ?? "";

  return {
    id: `photon:${lat},${lon},${index}`,
    name,
    region,
    country,
    lat,
    lon,
  };
}

export async function searchPhoton(
  query: string,
  signal: AbortSignal,
): Promise<GeocodedPlace[]> {
  const url = new URL(PHOTON_API);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");

  const response = await fetch(url.toString(), {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as PhotonResponse;
  const features = data.features ?? [];

  return features.flatMap((feature, index) => {
    const place = normalizeFeature(feature, index);
    return place ? [place] : [];
  });
}
