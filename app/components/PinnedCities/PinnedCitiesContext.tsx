"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import type { PinnedCity } from "@/lib/forecast/types";

interface PinnedCitiesContextType {
  pins: PinnedCity[];
  pin: (city: PinnedCity) => void;
  unpin: (city: PinnedCity) => PinnedCity | null;
}

const PinnedCitiesContext = createContext<PinnedCitiesContextType | null>(null);

export function PinnedCitiesProvider({ children }: { children: ReactNode }) {
  const [pins, setPins] = useState<PinnedCity[]>([]);
  // Ref mirrors state so unpin() can read the current list synchronously
  const pinsRef = useRef<PinnedCity[]>([]);

  const pin = useCallback((city: PinnedCity) => {
    setPins((prev) => {
      // Deduplicate by name — geocoding and reverse-geocode APIs can return
      // slightly different lat/lon for the same city, so name is the stable key.
      if (prev.some((p) => p.name === city.name)) return prev;
      // Evict oldest (index 0) when at capacity of 5
      const trimmed = prev.length >= 5 ? prev.slice(1) : prev;
      const next = [...trimmed, city];
      pinsRef.current = next;
      return next;
    });
  }, []);

  const unpin = useCallback((city: PinnedCity): PinnedCity | null => {
    const prev = pinsRef.current;
    const idx = prev.findIndex((p) => p.name === city.name);
    if (idx === -1) return null;
    const next = prev.filter((_, i) => i !== idx);
    // Fallback: city immediately before removed, or new first if removed was first
    const fallback = next.length > 0 ? next[Math.max(0, idx - 1)] : null;
    pinsRef.current = next;
    setPins(next);
    return fallback;
  }, []);

  return (
    <PinnedCitiesContext.Provider value={{ pins, pin, unpin }}>
      {children}
    </PinnedCitiesContext.Provider>
  );
}

export function usePinnedCitiesContext(): PinnedCitiesContextType {
  const ctx = useContext(PinnedCitiesContext);
  if (!ctx) throw new Error("usePinnedCitiesContext must be used within PinnedCitiesProvider");
  return ctx;
}
