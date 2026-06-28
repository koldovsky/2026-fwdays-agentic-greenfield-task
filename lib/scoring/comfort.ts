// Pure comfort scoring function — no framework deps (TC-PURE-01).
//
// Algorithm: value = round((min(sub-scores) + weightedAvg(sub-scores)) / 2)
//
// The min/avg blend lets a single extreme factor (e.g. -10 °C feels-like, 80%
// precip) drag the total well below its weighted contribution while leaving
// mild-but-imperfect days in the comfortable zone. All constants are in one
// place at the top for easy tuning.

import type { ForecastDay } from "@/lib/forecast/types";
import { uk } from "@/lib/i18n/uk";

// --- Weights (must sum to 1) ---
const W = {
  feelsLike: 0.4,
  precip: 0.2,
  uv: 0.2,
  wind: 0.1,
  cloud: 0.1,
} as const;

// --- Sub-score helpers (each returns 0..100) ---

function feelsLikeScore(maxC: number): number {
  // Optimal 18–26 °C; steep drop beyond that band (10 pts/°C)
  if (maxC >= 18 && maxC <= 26) return 100;
  if (maxC < 18) return Math.max(0, 100 - (18 - maxC) * 10);
  return Math.max(0, 100 - (maxC - 26) * 10);
}

function precipScore(pct: number): number {
  return Math.max(0, 100 - pct);
}

function uvScore(uv: number): number {
  if (uv <= 3) return 100;
  return Math.max(0, 100 - (uv - 3) * 12.5);
}

function windScore(kmh: number): number {
  // ≤ 15 km/h → 100; reaches 0 at ~82 km/h
  return Math.max(0, 100 - Math.max(0, kmh - 15) * 1.5);
}

function cloudScore(pct: number): number {
  if (pct <= 20) return 100;
  if (pct >= 80) return 40;
  return 100 - ((pct - 20) / 60) * 60;
}

// --- Dominant-factor key selection ---

type RationaleKey = "good" | "cold" | "hot" | "rainy" | "windy";

function dominantKey(day: ForecastDay, value: number): RationaleKey {
  if (value >= 70) return "good";

  // Weighted deficit per factor — highest deficit names the rationale.
  const feelsLikeDeficit = (100 - feelsLikeScore(day.feelsLikeMaxC)) * W.feelsLike;
  const precipDeficit = (100 - precipScore(day.precipProbability)) * W.precip;
  const windDeficit = (100 - windScore(day.windSpeedKmh)) * W.wind;

  const deficits: Array<[RationaleKey, number]> = [
    [day.feelsLikeMaxC < 22 ? "cold" : "hot", feelsLikeDeficit],
    ["rainy", precipDeficit],
    ["windy", windDeficit],
  ];

  deficits.sort((a, b) => b[1] - a[1]);
  return deficits[0][0];
}

// --- Public API ---

export interface ComfortResult {
  value: number;
  rationale: string;
}

export function comfortScore(day: ForecastDay): ComfortResult {
  const fl = feelsLikeScore(day.feelsLikeMaxC);
  const pr = precipScore(day.precipProbability);
  const uv = uvScore(day.uvIndexMax);
  const wi = windScore(day.windSpeedKmh);
  const cl = cloudScore(day.cloudCoverPercent);

  const weightedAvg = fl * W.feelsLike + pr * W.precip + uv * W.uv + wi * W.wind + cl * W.cloud;
  const minSub = Math.min(fl, pr, uv, wi, cl);

  const raw = (weightedAvg + minSub) / 2;
  const value = Math.round(Math.min(100, Math.max(0, raw)));
  const key = dominantKey(day, value);

  return { value, rationale: uk.comfort[key] };
}
