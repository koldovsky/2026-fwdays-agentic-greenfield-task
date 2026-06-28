"use client";

import { usePinnedCitiesContext } from "@/app/components/PinnedCities/PinnedCitiesContext";

export function usePinnedCities() {
  return usePinnedCitiesContext();
}
