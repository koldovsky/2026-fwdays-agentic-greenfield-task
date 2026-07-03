/**
 * Client-side persistence (state-persistence capability).
 *
 * TC-STORAGE-01: `localStorage` only, no backend. NFR-PRIV-01 / BC-PRIVACY-01:
 * sensitive scores/benefits never leave the device and no analytics touch them.
 *
 * SSR-safe (guards `window`), versioned key, and corruption-tolerant: a missing
 * or unparseable payload yields `null` so callers fall back to fresh defaults
 * rather than crashing. Well-formed JSON with the wrong shape is sanitized field
 * by field instead of being spread verbatim into the store.
 */
import { clampScore } from "@/app/lib/scoring";
import {
  ELECTIVE_SUBJECTS,
  type ApplicationStatus,
  type Benefits,
  type ElectiveSubject,
  type Scores,
  type SubjectKey,
} from "@/app/lib/types";

/** Versioned key — bump the suffix on a breaking shape change. */
const STORAGE_KEY = "prokhidnyi.v1";

const SUBJECT_KEYS: SubjectKey[] = ["ukr", "math", "hist", "eng"];
const BENEFIT_KEYS: (keyof Benefits)[] = ["village", "quota", "orphan"];
const STATUS_VALUES: ApplicationStatus[] = [
  "Збережено",
  "Подано",
  "Розглядається",
  "Рекомендовано",
  "Зараховано",
];

/** One saved program: its application status and shortlist priority. */
export interface SavedEntry {
  status: ApplicationStatus;
  priority: number;
}

/** The full persisted profile (FR-STATE-01). */
export interface PersistedState {
  scores: Scores;
  benefits: Benefits;
  elective: ElectiveSubject;
  fields: string[];
  cities: string[];
  saved: Record<string, SavedEntry>;
  compare: string[];
}

/** True only in a browser with a working `localStorage`. */
function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeScores(raw: unknown): Scores | undefined {
  if (!isRecord(raw)) return undefined;
  const scores = {} as Scores;
  for (const key of SUBJECT_KEYS) {
    const value = raw[key];
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    scores[key] = clampScore(value);
  }
  return scores;
}

function sanitizeBenefits(raw: unknown): Benefits | undefined {
  if (!isRecord(raw)) return undefined;
  const benefits = {} as Benefits;
  for (const key of BENEFIT_KEYS) {
    benefits[key] = raw[key] === true;
  }
  return benefits;
}

function sanitizeElective(raw: unknown): ElectiveSubject | undefined {
  if (typeof raw !== "string") return undefined;
  return (ELECTIVE_SUBJECTS as readonly string[]).includes(raw)
    ? (raw as ElectiveSubject)
    : undefined;
}

function sanitizeStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  if (!raw.every((item) => typeof item === "string")) return undefined;
  return raw;
}

function sanitizeSaved(raw: unknown): Record<string, SavedEntry> | undefined {
  if (!isRecord(raw)) return undefined;
  const saved: Record<string, SavedEntry> = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (!isRecord(entry)) continue;
    if (typeof entry.status !== "string" || !STATUS_VALUES.includes(entry.status as ApplicationStatus)) {
      continue;
    }
    if (typeof entry.priority !== "number" || !Number.isFinite(entry.priority)) continue;
    saved[id] = {
      status: entry.status as ApplicationStatus,
      priority: entry.priority,
    };
  }
  return saved;
}

/** Drop unknown / malformed fields so hydration cannot crash the UI. */
function sanitizePayload(raw: unknown): Partial<PersistedState> | null {
  if (!isRecord(raw)) return null;
  const out: Partial<PersistedState> = {};
  const scores = sanitizeScores(raw.scores);
  if (scores) out.scores = scores;
  const benefits = sanitizeBenefits(raw.benefits);
  if (benefits) out.benefits = benefits;
  const elective = sanitizeElective(raw.elective);
  if (elective) out.elective = elective;
  const fields = sanitizeStringArray(raw.fields);
  if (fields) out.fields = fields;
  const cities = sanitizeStringArray(raw.cities);
  if (cities) out.cities = cities;
  const saved = sanitizeSaved(raw.saved);
  if (saved) out.saved = saved;
  const compare = sanitizeStringArray(raw.compare);
  if (compare) out.compare = compare;
  return Object.keys(out).length > 0 ? out : null;
}

/** Load persisted state, or `null` if absent/corrupt (fresh-start fallback). */
export function loadState(): Partial<PersistedState> | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitizePayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Persist state. Silently no-ops when storage is unavailable or throws. */
export function saveState(state: PersistedState): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private-mode — non-fatal, the app keeps working in-memory */
  }
}

/** Remove all persisted state (fresh start). */
export function clearState(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* non-fatal */
  }
}

/** Re-exported so consumers can type against the storage shapes directly. */
export type { Benefits, Scores };
