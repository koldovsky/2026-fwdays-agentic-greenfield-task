import { type NextRequest } from "next/server";

type OpenMeteoResult = {
  name: string;
  admin1?: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
};

type GeocodingResult = {
  name: string;
  admin1: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
};

export async function GET(request: NextRequest): Promise<Response> {
  const name = request.nextUrl.searchParams.get("name")?.trim();

  if (!name) {
    return Response.json([]);
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=uk&format=json`;
    const upstream = await fetch(url, { cache: "no-store" });
    if (!upstream.ok) {
      return Response.json([]);
    }
    const data = await upstream.json();
    const results: OpenMeteoResult[] = data.results ?? [];
    const mapped: GeocodingResult[] = results.map((r) => ({
      name: r.name,
      admin1: r.admin1 ?? "",
      country: r.country ?? "",
      countryCode: r.country_code ?? "",
      latitude: r.latitude,
      longitude: r.longitude,
    }));
    return Response.json(mapped);
  } catch {
    return Response.json([]);
  }
}
