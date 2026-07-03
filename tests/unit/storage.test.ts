import { beforeEach, describe, expect, it } from "vitest";
import {
  clearState,
  loadState,
  saveState,
  type PersistedState,
} from "@/app/lib/storage";
import {
  advanceStatus,
  getSnapshot,
  toggleCompare,
  toggleSave,
} from "@/app/lib/profileStore";

const sample: PersistedState = {
  scores: { ukr: 180, math: 175, hist: 160, eng: 190 },
  benefits: { village: true, quota: false, orphan: false },
  elective: "Фізика",
  fields: ["Право"],
  cities: ["Львів"],
  saved: { "knu-l": { status: "Подано", priority: 1 } },
  compare: ["knu-l", "kpi-cs"],
};

describe("storage round-trip (FR-STATE-01, TC-STORAGE-01)", () => {
  beforeEach(() => clearState());

  it("persists and reloads the full state", () => {
    saveState(sample);
    expect(loadState()).toEqual(sample);
  });

  it("returns null when nothing is stored (fresh start)", () => {
    expect(loadState()).toBeNull();
  });

  it("tolerates a corrupt payload without throwing", () => {
    window.localStorage.setItem("prokhidnyi.v1", "{not valid json");
    expect(loadState()).toBeNull();
  });

  it("drops malformed fields instead of returning unsafe shapes", () => {
    window.localStorage.setItem(
      "prokhidnyi.v1",
      JSON.stringify({ saved: null, compare: "not-an-array", scores: { ukr: "bad" } }),
    );
    expect(loadState()).toBeNull();
  });

  it("keeps only valid fields from a partially corrupt payload", () => {
    window.localStorage.setItem(
      "prokhidnyi.v1",
      JSON.stringify({
        scores: sample.scores,
        compare: null,
        saved: { bad: { status: "nope", priority: "x" } },
      }),
    );
    expect(loadState()).toEqual({ scores: sample.scores, saved: {} });
  });

  it("clearState removes persisted data", () => {
    saveState(sample);
    clearState();
    expect(loadState()).toBeNull();
  });
});

describe("profile store mutations (FR-LIST-01, FR-COMPARE-01)", () => {
  it("toggleSave adds a saved entry then removes it", () => {
    const id = "sumdu-m";
    if (getSnapshot().saved[id]) toggleSave(id); // ensure clean start
    toggleSave(id);
    expect(getSnapshot().saved[id]?.status).toBe("Збережено");
    toggleSave(id);
    expect(getSnapshot().saved[id]).toBeUndefined();
  });

  it("advanceStatus moves a saved item to the next stage", () => {
    const id = "lnu-s";
    if (!getSnapshot().saved[id]) toggleSave(id);
    advanceStatus(id);
    expect(getSnapshot().saved[id]?.status).toBe("Подано");
    toggleSave(id); // cleanup
  });

  it("assigns unique, monotonic priorities even after remove-then-add", () => {
    for (const id of Object.keys(getSnapshot().saved)) toggleSave(id); // clear
    toggleSave("knu-j");
    toggleSave("kma-f");
    toggleSave("hnu-p");
    toggleSave("kma-f"); // remove the middle one
    toggleSave("lnu-s"); // re-add — must not collide with hnu-p's priority
    const priorities = Object.values(getSnapshot().saved).map((e) => e.priority);
    expect(new Set(priorities).size).toBe(priorities.length); // all unique
    for (const id of Object.keys(getSnapshot().saved)) toggleSave(id); // cleanup
  });

  it("toggleCompare never exceeds three selections", () => {
    for (const id of getSnapshot().compare.slice()) toggleCompare(id); // clear
    for (const id of ["knu-j", "kma-f", "knu-l", "lnu-s", "kpi-cs"]) toggleCompare(id);
    expect(getSnapshot().compare.length).toBeLessThanOrEqual(3);
  });
});

// @trace FR-STATE-01, FR-LIST-01, FR-COMPARE-01
