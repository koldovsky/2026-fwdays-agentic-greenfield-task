import { type NextRequest } from "next/server";
import { transformForecast } from "@/lib/forecast/transform";

const DAILY_VARS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "cloud_cover_mean",
  "uv_index_max",
  "weather_code",
  "sunrise",
  "sunset",
].join(",");

const HOURLY_VARS = "temperature_2m";

export async function GET(request: NextRequest): Promise<Response> {
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return Response.json({ error: "lat and lon are required" }, { status: 400 });
  }

  if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
    return Response.json({ error: "lat and lon must be numbers" }, { status: 400 });
  }

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&daily=${DAILY_VARS}` +
    `&hourly=${HOURLY_VARS}` +
    `&timezone=auto` +
    `&forecast_days=7`;

  try {
    const upstream = await fetch(url, { cache: "no-store" });
    if (!upstream.ok) {
      return Response.json({ error: "Upstream forecast API error" }, { status: 502 });
    }
    const raw = await upstream.json();
    const data = transformForecast(raw);
    return Response.json(data, {
      headers: {
        "Cache-Control": "s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch {
    return Response.json({ error: "Upstream forecast API error" }, { status: 502 });
  }
}
