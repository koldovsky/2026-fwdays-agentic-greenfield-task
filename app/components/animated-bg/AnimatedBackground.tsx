"use client";

import { useSyncExternalStore } from "react";
import { getWeatherState } from "@/lib/weather/conditions";
import { useForecastBg } from "./ForecastBgContext";

// FR-ANIM-03 — subscribe to prefers-reduced-motion via useSyncExternalStore
// (avoids setState-in-effect; recommended React 19 pattern for external stores).
function subscribe(cb: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function getSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getServerSnapshot(): boolean {
  return false; // no reduced motion assumed during SSR
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// FR-ANIM-01, FR-ANIM-02, FR-ANIM-04
export function AnimatedBackground() {
  const { weatherCode, sunrise, sunset } = useForecastBg();
  const reducedMotion = useReducedMotion();

  // nowIso is computed at render time; only used when forecast data is present,
  // which is always a client-side re-render (no SSR/hydration mismatch risk).
  const nowIso = weatherCode !== null ? new Date().toISOString() : "";

  const state =
    weatherCode !== null && sunrise && sunset && nowIso
      ? getWeatherState(weatherCode, sunrise, sunset, nowIso)
      : null;

  const gradientClass = state ? `bg-anim-${state}` : "bg-anim-neutral";

  return (
    <div aria-hidden="true" className={`bg-anim-layer ${gradientClass}`}>
      {!reducedMotion && state === "rain" && <div className="bg-anim-rain-particles" />}
      {!reducedMotion && state === "snow" && <div className="bg-anim-snow-particles" />}
      {!reducedMotion && (state === "cloudy-day" || state === "cloudy-night") && (
        <div className="bg-anim-clouds" />
      )}
    </div>
  );
}
