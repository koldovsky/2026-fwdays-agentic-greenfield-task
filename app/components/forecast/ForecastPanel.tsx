"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { uk } from "@/lib/i18n/uk";
import type { ForecastResponse } from "@/lib/forecast/types";
import { cacheKey, getCached, setCached } from "@/lib/forecast/cache";
import { useForecastBg } from "@/app/components/animated-bg/ForecastBgContext";
import { DayCard } from "./DayCard";
import { WeekendComfortBanner } from "./WeekendComfortBanner";
import { LazyHourlyChart } from "./LazyHourlyChart";
import { SunriseSunset } from "./SunriseSunset";

type Status = "idle" | "loading" | "ok" | "error";

function DayCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 h-3 rounded bg-surface-sunken" />
      <div className="mx-auto mb-2 h-7 w-7 rounded bg-surface-sunken" />
      <div className="mb-1 h-4 rounded bg-surface-sunken" />
      <div className="h-3 rounded bg-surface-sunken" />
    </div>
  );
}

export function ForecastPanel() {
  const searchParams = useSearchParams();
  const lat = searchParams.get("lat") ?? "";
  const lon = searchParams.get("lon") ?? "";

  const [data, setData] = useState<ForecastResponse | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const { setBgData } = useForecastBg();

  useEffect(() => {
    let cancelled = false;

    if (!lat || !lon) {
      setTimeout(() => {
        if (cancelled) return;
        setData(null);
        setStatus("idle");
      }, 0);
      return () => {
        cancelled = true;
      };
    }

    const key = cacheKey(lat, lon);
    const cached = getCached(key);
    if (cached) {
      setTimeout(() => {
        if (cancelled) return;
        setData(cached);
        setStatus("ok");
      }, 0);
      return () => {
        cancelled = true;
      };
    }

    // Cancel any in-flight request for a previous location.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setTimeout(() => {
      if (cancelled) return;
      setStatus("loading");
    }, 0);

    fetch(`/api/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("forecast fetch failed");
        return res.json() as Promise<ForecastResponse>;
      })
      .then((json) => {
        if (cancelled) return;
        setCached(key, json);
        setData(json);
        setStatus("ok");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lat, lon]);

  // Push weather-condition data to the animated background context (FR-ANIM-01/02).
  useEffect(() => {
    if (status === "ok" && data) {
      setBgData({
        weatherCode: data.days[0]?.weatherCode ?? null,
        sunrise: data.sunriseIso,
        sunset: data.sunsetIso,
      });
    } else if (!lat || !lon) {
      setBgData({ weatherCode: null, sunrise: null, sunset: null });
    }
  }, [status, data, lat, lon, setBgData]);

  if (status === "error") {
    return (
      <p role="alert" className="py-4 text-sm text-text-secondary">
        {uk.forecast.loadingError}
      </p>
    );
  }

  if (status === "loading" || (status === "idle" && !data)) {
    return (
      <div className="flex flex-col gap-6">
        {/* Day card skeletons */}
        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <DayCardSkeleton key={i} />
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="h-[160px] w-full animate-pulse rounded-lg bg-surface-sunken" />
        {/* Sunrise/sunset skeleton */}
        <div className="mx-auto h-4 w-48 animate-pulse rounded bg-surface-sunken" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Weekend comfort highlight */}
      <WeekendComfortBanner days={data.days} />

      {/* 7 day cards — horizontally scrollable on mobile */}
      <div className="grid grid-cols-7 gap-3" role="list" aria-label={uk.regions.forecast}>
        {data.days.map((day) => (
          <div key={day.date} role="listitem">
            <DayCard day={day} />
          </div>
        ))}
      </div>

      {/* 48-hour hourly temperature chart */}
      <LazyHourlyChart hours={data.hours} />

      {/* Sunrise / sunset */}
      <SunriseSunset
        sunriseIso={data.sunriseIso}
        sunsetIso={data.sunsetIso}
        timezone={data.timezone}
      />
    </div>
  );
}
