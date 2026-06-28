import { type NextRequest } from "next/server";

// Nominatim (OSM) reverse-geocoding: keyless, no tracking, server-side only.
// TC-DATA-01: Open-Meteo forward geocoding is used for city search; Nominatim
// is used here for reverse-geocoding since Open-Meteo geocoding API does not
// expose a reverse endpoint. Both are keyless and OSM-aligned (TC-MAP-01).
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

type NominatimResult = {
  name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

export async function GET(request: NextRequest): Promise<Response> {
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return Response.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (
    isNaN(latNum) ||
    isNaN(lonNum) ||
    latNum < -90 ||
    latNum > 90 ||
    lonNum < -180 ||
    lonNum > 180
  ) {
    return Response.json(
      { error: "lat and lon must be valid geographic coordinates" },
      { status: 400 }
    );
  }

  try {
    const url =
      `${NOMINATIM_BASE}/reverse` +
      `?lat=${encodeURIComponent(lat)}` +
      `&lon=${encodeURIComponent(lon)}` +
      `&format=json` +
      `&accept-language=uk,en`;

    const upstream = await fetch(url, {
      cache: "no-store",
      headers: {
        // Nominatim Tile Usage Policy requires a valid User-Agent / Referer.
        "User-Agent": "Nadvori-WeatherApp/1.0 (https://github.com/nadvori)",
        Referer: "https://nadvori.vercel.app",
      },
    });

    if (!upstream.ok) {
      return Response.json({ error: "Reverse geocoding failed" }, { status: 502 });
    }

    const data: NominatimResult = await upstream.json();

    const name =
      data.address?.city ?? data.address?.town ?? data.address?.village ?? data.name ?? "";

    return Response.json({
      name,
      lat: parseFloat(data.lat),
      lon: parseFloat(data.lon),
    });
  } catch {
    return Response.json({ error: "Reverse geocoding unavailable" }, { status: 502 });
  }
}
