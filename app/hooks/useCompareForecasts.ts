"use client";

import { useEffect, useRef, useState } from "react";
import type { ForecastResponse, PinnedCity } from "@/lib/forecast/types";

export function useCompareForecasts(pins: PinnedCity[]): {
  data: (ForecastResponse | null)[];
  loading: boolean[];
} {
  const [data, setData] = useState<(ForecastResponse | null)[]>([]);
  const [loading, setLoading] = useState<boolean[]>([]);
  // Module-level LRU cache keyed by "lat,lon"
  const cacheRef = useRef(new Map<string, ForecastResponse>());

  useEffect(() => {
    let cancelled = false;

    if (pins.length === 0) {
      setTimeout(() => {
        if (!cancelled) {
          setData([]);
          setLoading([]);
        }
      }, 0);
      return () => {
        cancelled = true;
      };
    }

    const keys = pins.map((p) => `${p.lat},${p.lon}`);

    // Initialise from cache — avoid a loading flash for already-fetched cities
    setTimeout(() => {
      if (cancelled) return;
      setData(keys.map((k) => cacheRef.current.get(k) ?? null));
      setLoading(keys.map((k) => !cacheRef.current.has(k)));
    }, 0);

    // Fetch only cities not yet in the cache
    const fetchers = pins.map((pin, i) => async () => {
      const key = keys[i];
      if (cacheRef.current.has(key)) return;
      try {
        const res = await fetch(
          `/api/forecast?lat=${encodeURIComponent(String(pin.lat))}&lon=${encodeURIComponent(String(pin.lon))}`
        );
        if (!res.ok) throw new Error("forecast fetch failed");
        const json = (await res.json()) as ForecastResponse;
        if (cancelled) return;
        cacheRef.current.set(key, json);
        setData((prev) => {
          if (prev.length !== pins.length) return prev;
          const next = [...prev];
          next[i] = json;
          return next;
        });
        setLoading((prev) => {
          if (prev.length !== pins.length) return prev;
          const next = [...prev];
          next[i] = false;
          return next;
        });
      } catch {
        if (cancelled) return;
        setLoading((prev) => {
          if (prev.length !== pins.length) return prev;
          const next = [...prev];
          next[i] = false;
          return next;
        });
      }
    });

    void Promise.all(fetchers.map((f) => f()));

    return () => {
      cancelled = true;
    };
  }, [pins]);

  return { data, loading };
}
