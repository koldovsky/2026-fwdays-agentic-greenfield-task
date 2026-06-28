// Canonical forecast types — consumed by forecast, comfort-score, animated-bg,
// map, and weekend-compare. Framework-free (TC-PURE-01): no next/*, no react.

export interface PinnedCity {
  lat: number;
  lon: number;
  name: string;
}

export interface ForecastDay {
  date: string; // "YYYY-MM-DD"
  weekdayUk: string; // Ukrainian weekday name from lib/i18n/uk.ts
  highC: number;
  lowC: number;
  precipProbability: number; // 0..100
  windSpeedKmh: number;
  weatherCode: number; // WMO weather code
  feelsLikeMaxC: number; // needed by comfort-score
  feelsLikeMinC: number;
  cloudCoverPercent: number; // needed by comfort-score
  uvIndexMax: number; // needed by comfort-score
}

export interface HourlyPoint {
  time: string; // ISO 8601
  tempC: number;
}

export interface ForecastResponse {
  days: ForecastDay[];
  hours: HourlyPoint[]; // first 48 entries only
  sunriseIso: string;
  sunsetIso: string;
  timezone: string;
}
