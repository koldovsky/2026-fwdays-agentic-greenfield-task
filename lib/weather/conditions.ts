// Pure WMO-code → weather state mapping — no framework deps (TC-PURE-01).
// `nowIso` is injected so the function is fully deterministic in tests.

export type WeatherState =
  "clear-day" | "clear-night" | "cloudy-day" | "cloudy-night" | "rain" | "snow";

function isDaytime(sunrise: string, sunset: string, nowIso: string): boolean {
  try {
    const now = new Date(nowIso).getTime();
    const rise = new Date(sunrise).getTime();
    const set = new Date(sunset).getTime();
    if (isNaN(now) || isNaN(rise) || isNaN(set)) return true;
    return now >= rise && now < set;
  } catch {
    return true;
  }
}

export function getWeatherState(
  code: number,
  sunrise: string,
  sunset: string,
  nowIso: string
): WeatherState {
  const day = isDaytime(sunrise, sunset, nowIso);

  // Snow: WMO 71–77, 85–86
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return "snow";
  }

  // Rain / thunderstorm: WMO 51–67, 80–82, 95–99
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)) {
    return "rain";
  }

  // Cloudy / fog: WMO 1–3, 45, 48
  if ((code >= 1 && code <= 3) || code === 45 || code === 48) {
    return day ? "cloudy-day" : "cloudy-night";
  }

  // Clear (0) or unknown → safe fallback
  return day ? "clear-day" : "clear-night";
}
