"use client";

/**
 * useProfile — read the applicant's profile + shortlist and get stable action
 * handlers (score-input + shortlist + state-persistence).
 *
 * State lives in `profileStore` and is read via `useSyncExternalStore`, so the
 * hook is SSR-safe and free of setState-in-effect. Actions are module-stable
 * functions, so consuming components can treat them as constants.
 */
import { useSyncExternalStore } from "react";
import {
  advanceStatus,
  getServerSnapshot,
  getSnapshot,
  setElective,
  setScore,
  subscribe,
  toggleBenefit,
  toggleCity,
  toggleCompare,
  toggleField,
  toggleSave,
} from "@/app/lib/profileStore";
import type { PersistedState } from "@/app/lib/storage";

export interface ProfileApi extends PersistedState {
  setScore: typeof setScore;
  setElective: typeof setElective;
  toggleBenefit: typeof toggleBenefit;
  toggleField: typeof toggleField;
  toggleCity: typeof toggleCity;
  toggleSave: typeof toggleSave;
  toggleCompare: typeof toggleCompare;
  advanceStatus: typeof advanceStatus;
  isSaved: (id: string) => boolean;
  inCompare: (id: string) => boolean;
}

export function useProfile(): ProfileApi {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    ...state,
    setScore,
    setElective,
    toggleBenefit,
    toggleField,
    toggleCity,
    toggleSave,
    toggleCompare,
    advanceStatus,
    isSaved: (id: string) => !!state.saved[id],
    inCompare: (id: string) => state.compare.includes(id),
  };
}
