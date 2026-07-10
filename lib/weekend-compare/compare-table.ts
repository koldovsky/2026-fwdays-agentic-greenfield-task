import type { ForecastDay } from "@/lib/forecast/forecast";
import type { ComfortBadgeTier } from "@/lib/scoring/comfort";

export type WeekendCompareRow = {
  day: "saturday" | "sunday";
  label: string;
  temperatureMaxC: number;
  temperatureMinC: number;
  precipitationProbability: number;
  comfortValue: number;
  comfortRationale: string;
  comfortTier: ComfortBadgeTier;
};

export function buildWeekendCompareRows(days: readonly ForecastDay[]): WeekendCompareRow[] {
  const sorted = [...days].toSorted((left, right) => left.date.localeCompare(right.date));
  const saturday = sorted.find((day) => weekdayUtc(day.date) === 6);

  if (!saturday) {
    return [];
  }

  const sunday = sorted.find(
    (day) => weekdayUtc(day.date) === 0 && day.date > saturday.date,
  );

  return [
    toCompareRow("saturday", saturday),
    ...(sunday ? [toCompareRow("sunday", sunday)] : []),
  ];
}

function toCompareRow(day: "saturday" | "sunday", forecastDay: ForecastDay): WeekendCompareRow {
  return {
    day,
    label: forecastDay.weekday,
    temperatureMaxC: forecastDay.temperatureMaxC,
    temperatureMinC: forecastDay.temperatureMinC,
    precipitationProbability: forecastDay.precipitationProbability,
    comfortValue: forecastDay.comfort.value,
    comfortRationale: forecastDay.comfort.rationale,
    comfortTier: forecastDay.comfortTier,
  };
}

function weekdayUtc(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}
