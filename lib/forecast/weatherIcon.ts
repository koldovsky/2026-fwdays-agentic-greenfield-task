// WMO weather code → icon identifier mapping. Framework-free (TC-PURE-01).
// Codes: https://open-meteo.com/en/docs#weathervariables

export type WeatherIconId =
  "clear" | "partly-cloudy" | "overcast" | "fog" | "drizzle" | "rain" | "snow" | "thunderstorm";

export function weatherCodeToIcon(code: number): WeatherIconId {
  if (code === 0) return "clear";
  if (code <= 2) return "partly-cloudy";
  if (code === 3) return "overcast";
  if (code <= 49) return "fog"; // 45, 48 fog; others are fog/rime
  if (code <= 57) return "drizzle"; // 51-57 drizzle
  if (code <= 67) return "rain"; // 61-67 rain
  if (code <= 77) return "snow"; // 71-77 snow / snow grains
  if (code <= 82) return "rain"; // 80-82 rain showers
  if (code <= 86) return "snow"; // 85-86 snow showers
  if (code <= 99) return "thunderstorm"; // 95-99 thunderstorm
  return "overcast";
}
