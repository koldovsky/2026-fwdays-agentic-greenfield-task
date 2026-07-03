"use client";

/**
 * Profile store (state-persistence capability).
 *
 * A tiny external store consumed via `useSyncExternalStore`, which is the
 * SSR-safe way to read client-only state (localStorage) without a
 * setState-in-effect: `getServerSnapshot` returns defaults so server and first
 * client paint match, then the store hydrates from `localStorage` on first
 * subscription and React re-renders with the stored profile (FR-STATE-01).
 *
 * TC-STORAGE-01 / NFR-PRIV-01 / BC-PRIVACY-01: all state lives on-device via
 * `storage.ts`; nothing is sent anywhere and no analytics touch it.
 */
import { clampScore } from "@/app/lib/scoring";
import { nextStatus } from "@/app/lib/status";
import {
  loadState,
  saveState,
  type PersistedState,
  type SavedEntry,
} from "@/app/lib/storage";
import type { Benefits, ElectiveSubject, SubjectKey } from "@/app/lib/types";

/** Default profile — a realistic mid-range applicant (matches the prototype). */
const DEFAULT_STATE: PersistedState = {
  scores: { ukr: 152, math: 138, hist: 145, eng: 161 },
  benefits: { village: false, quota: false, orphan: false },
  elective: "Англійська",
  fields: [],
  cities: [],
  saved: {},
  compare: [],
};

const MAX_COMPARE = 3;

// Stable server snapshot: never mutated, so hydration always matches the SSR
// output before the client swaps in stored data.
const SERVER_SNAPSHOT: PersistedState = DEFAULT_STATE;

let current: PersistedState = DEFAULT_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Persist + notify after a mutation. */
function commit(next: PersistedState): void {
  current = next;
  saveState(current);
  emit();
}

/** One-time hydration from localStorage (client only, after first subscribe). */
function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  const stored = loadState();
  if (stored) {
    current = {
      ...current,
      ...(stored.scores ? { scores: { ...current.scores, ...stored.scores } } : {}),
      ...(stored.benefits ? { benefits: { ...current.benefits, ...stored.benefits } } : {}),
      ...(stored.elective !== undefined ? { elective: stored.elective } : {}),
      ...(stored.fields !== undefined ? { fields: stored.fields } : {}),
      ...(stored.cities !== undefined ? { cities: stored.cities } : {}),
      ...(stored.saved !== undefined ? { saved: stored.saved } : {}),
      ...(stored.compare !== undefined ? { compare: stored.compare } : {}),
    };
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Hydrate lazily on first subscription; React re-checks the snapshot after
  // subscribing and re-renders if the stored profile differs from the default.
  hydrate();
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): PersistedState {
  return current;
}

export function getServerSnapshot(): PersistedState {
  return SERVER_SNAPSHOT;
}

function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((x) => x !== value)
    : [...list, value];
}

// ---- Mutations (module-stable, so they never re-create across renders) ----

export function setScore(key: SubjectKey, value: number): void {
  commit({ ...current, scores: { ...current.scores, [key]: clampScore(value) } });
}

export function setElective(elective: ElectiveSubject): void {
  commit({ ...current, elective });
}

export function toggleBenefit(key: keyof Benefits): void {
  commit({
    ...current,
    benefits: { ...current.benefits, [key]: !current.benefits[key] },
  });
}

export function toggleField(field: string): void {
  commit({ ...current, fields: toggleInList(current.fields, field) });
}

export function toggleCity(city: string): void {
  commit({ ...current, cities: toggleInList(current.cities, city) });
}

export function toggleSave(id: string): void {
  const saved: Record<string, SavedEntry> = { ...current.saved };
  if (saved[id]) {
    delete saved[id];
  } else {
    // Max existing priority + 1 (not count + 1) so priorities stay unique and
    // monotonic even after a remove-then-add — otherwise the new item could
    // collide with an existing one and the saved-list order would be ambiguous.
    const maxPriority = Math.max(0, ...Object.values(saved).map((e) => e.priority));
    saved[id] = { status: "Збережено", priority: maxPriority + 1 };
  }
  commit({ ...current, saved });
}

export function toggleCompare(id: string): void {
  if (current.compare.includes(id)) {
    commit({ ...current, compare: current.compare.filter((x) => x !== id) });
    return;
  }
  if (current.compare.length >= MAX_COMPARE) return;
  commit({ ...current, compare: [...current.compare, id] });
}

export function advanceStatus(id: string): void {
  const entry = current.saved[id];
  if (!entry) return;
  commit({
    ...current,
    saved: { ...current.saved, [id]: { ...entry, status: nextStatus(entry.status) } },
  });
}

export { MAX_COMPARE };
