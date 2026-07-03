import { vi } from "vitest";
import type { ProfileApi } from "@/app/hooks/useProfile";
import type { SavedEntry } from "@/app/lib/storage";

/** Build a ProfileApi stub for component tests (methods are spies). */
export function makeProfile(overrides: Partial<ProfileApi> = {}): ProfileApi {
  const saved: Record<string, SavedEntry> = overrides.saved ?? {};
  const compare: string[] = overrides.compare ?? [];
  const api = {
    scores: { ukr: 152, math: 138, hist: 145, eng: 161 },
    benefits: { village: false, quota: false, orphan: false },
    elective: "Англійська" as const,
    fields: [],
    cities: [],
    saved,
    compare,
    setScore: vi.fn(),
    setElective: vi.fn(),
    toggleBenefit: vi.fn(),
    toggleField: vi.fn(),
    toggleCity: vi.fn(),
    toggleSave: vi.fn(),
    toggleCompare: vi.fn(),
    advanceStatus: vi.fn(),
    isSaved: (id: string) => !!saved[id],
    inCompare: (id: string) => compare.includes(id),
    ...overrides,
  };
  return api as unknown as ProfileApi;
}
