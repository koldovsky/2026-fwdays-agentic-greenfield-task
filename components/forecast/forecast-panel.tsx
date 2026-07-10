"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { CityLocation } from "@/lib/city-search/geocoding";
import { fetchForecast } from "@/lib/forecast/forecast-client";
import type { ForecastViewModel } from "@/lib/forecast/forecast";
import { uk } from "@/lib/i18n/uk";

const TemperatureChart = dynamic(
  () => import("./temperature-chart").then((module) => module.TemperatureChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 rounded-3xl bg-[#f4f7fb] dark:bg-[#0f1419]" />
    ),
  },
);

type ForecastPanelProps = {
  location: CityLocation | null;
};

type ForecastState = {
  key: string | null;
  forecast: ForecastViewModel | null;
  errorKey: string | null;
};

export function ForecastPanel({ location }: ForecastPanelProps) {
  const [forecastState, setForecastState] = useState<ForecastState>({
    key: null,
    forecast: null,
    errorKey: null,
  });
  const locationKey = location ? forecastPanelKey(location) : null;

  useEffect(() => {
    if (!location) {
      return;
    }

    let cancelled = false;
    const requestedKey = forecastPanelKey(location);

    fetchForecast(location)
      .then((nextForecast) => {
        if (cancelled) {
          return;
        }

        setForecastState({
          key: requestedKey,
          forecast: nextForecast,
          errorKey: null,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setForecastState({
          key: null,
          forecast: null,
          errorKey: requestedKey,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [location]);

  if (!location) {
    return (
      <ForecastShell>
        <p className="leading-7 text-[#5c6b7a] dark:text-[#8b9bb0]">
          {uk.forecast.placeholder}
        </p>
      </ForecastShell>
    );
  }

  const forecast = forecastState.forecast;
  const isLoading = locationKey !== forecastState.key && locationKey !== forecastState.errorKey;
  const hasError = locationKey === forecastState.errorKey;

  return (
    <ForecastPanelView
      forecast={forecast}
      hasError={hasError}
      isLoading={isLoading}
    />
  );
}

type ForecastPanelViewProps = {
  forecast: ForecastViewModel | null;
  isLoading: boolean;
  hasError: boolean;
};

export function ForecastPanelView({
  forecast,
  isLoading,
  hasError,
}: ForecastPanelViewProps) {
  if (isLoading && !forecast) {
    return <ForecastMessage>{uk.forecast.loading}</ForecastMessage>;
  }

  if (hasError && !forecast) {
    return <ForecastMessage tone="error">{uk.forecast.error}</ForecastMessage>;
  }

  if (!forecast || forecast.days.length === 0) {
    return <ForecastMessage>{uk.forecast.empty}</ForecastMessage>;
  }

  return (
    <ForecastShell>
      {forecast.weekendHighlight ? (
        <div className="mb-5 rounded-3xl border border-[#d8e3f0] bg-[#f4f7fb] p-4 dark:border-white/10 dark:bg-[#0f1419]">
          <p className="text-sm font-medium text-[#5c6b7a] dark:text-[#8b9bb0]">
            {uk.forecast.weekendTitle}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#1a2332] dark:text-[#e8edf4]">
            {forecast.weekendHighlight.value}/100
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {forecast.days.map((day) => (
          <article
            key={day.date}
            className="rounded-3xl border border-[#d8e3f0] bg-white/70 p-4 dark:border-white/10 dark:bg-[#0f1419]/55"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[#5c6b7a] dark:text-[#8b9bb0]">
                  {day.weekday}
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#1a2332] dark:text-[#e8edf4]">
                  {Math.round(day.temperatureMaxC)}° / {Math.round(day.temperatureMinC)}°
                </p>
              </div>
              <span className="text-3xl" aria-hidden="true">
                {day.weatherIcon}
              </span>
            </div>
            <div className="mt-4 space-y-1 text-sm text-[#5c6b7a] dark:text-[#8b9bb0]">
              <p>
                {uk.forecast.precipitation}: {day.precipitationProbability}%
              </p>
              <p>
                {uk.forecast.wind}: {day.windSpeedMs.toFixed(1)} м/с
              </p>
              <p className={comfortTierClassName(day.comfortTier)}>
                {uk.forecast.comfort}: {day.comfort.value}/100 · {day.comfort.rationale}
              </p>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-6 rounded-3xl border border-[#d8e3f0] bg-white/70 p-4 dark:border-white/10 dark:bg-[#0f1419]/55">
        <h3 className="text-lg font-semibold text-[#1a2332] dark:text-[#e8edf4]">
          {uk.forecast.chartTitle}
        </h3>
        <TemperatureChart points={forecast.hourly} />
        {forecast.todaySun ? (
          <p className="mt-3 text-sm text-[#5c6b7a] dark:text-[#8b9bb0]">
            {uk.forecast.sunrise}: {forecast.todaySun.sunrise} · {uk.forecast.sunset}:{" "}
            {forecast.todaySun.sunset}
          </p>
        ) : null}
      </section>
    </ForecastShell>
  );
}

function ForecastMessage({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "error";
}) {
  return (
    <ForecastShell>
      <p
        className={
          tone === "error"
            ? "leading-7 text-[#c94c4c] dark:text-[#f07171]"
            : "leading-7 text-[#5c6b7a] dark:text-[#8b9bb0]"
        }
      >
        {children}
      </p>
    </ForecastShell>
  );
}

function ForecastShell({ children }: { children: ReactNode }) {
  return (
    <section className="min-h-44 rounded-[1.5rem] border border-white/70 bg-white/70 p-6 shadow-[0_18px_60px_rgba(26,35,50,0.08)] backdrop-blur dark:border-white/10 dark:bg-[#1a2332]/80 md:col-span-1 xl:col-span-1">
      <div className="mb-5 h-2 w-20 rounded-full bg-[#3b6fd9]/25 dark:bg-[#6b9fff]/25" />
      <h2 className="mb-4 text-xl font-semibold text-[#1a2332] dark:text-[#e8edf4]">
        {uk.forecast.panelTitle}
      </h2>
      {children}
    </section>
  );
}

function comfortTierClassName(tier: "green" | "yellow" | "red"): string {
  if (tier === "green") return "text-[#2d9f83] dark:text-[#4fd1a5]";
  if (tier === "yellow") return "text-[#d4a017] dark:text-[#e8b84a]";
  return "text-[#c94c4c] dark:text-[#f07171]";
}

function forecastPanelKey(location: CityLocation): string {
  return `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
}
