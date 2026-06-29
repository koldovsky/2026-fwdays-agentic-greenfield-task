// RED (Phase 4b) — written from the spec/design BEFORE the implementation.
// Exercises lib/plants/validation.ts: the zod create schema + the FormData ->
// ActionResult mapper (validatePlantInput) the add-plant action and the eval
// already consume. Asserts the SPECIFIED behavior (trim, species default,
// optional/future/malformed acquired date), not whatever code happens to exist.
// Imports fail until lib/plants/validation.ts is built.
//
// @trace FR-PLANT-01
// @trace FR-PLANT-02
// @trace FR-PLANT-03
// @trace SC-1
// @trace SC-2
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SPECIES_DEFAULT, validatePlantInput } from "@/lib/plants/validation";

// Build a FormData the way the add-plant form submits it. Fields are omitted
// (never set) to simulate "left untouched"; passing null also omits.
function form(fields: Record<string, string | null>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null) fd.set(k, v);
  }
  return fd;
}

// Pin a deterministic "today" in Europe/Kiev so future-date assertions are
// stable regardless of when the suite runs.
const TODAY_KIEV = "2026-06-29";
beforeEach(() => {
  vi.useFakeTimers();
  // 2026-06-29 12:00 in Kiev (EEST = UTC+3) -> 09:00Z; mid-day avoids any
  // midnight-boundary ambiguity for the "today in Kiev" derivation.
  vi.setSystemTime(new Date("2026-06-29T09:00:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("SPECIES_DEFAULT", () => {
  it("is the canonical Ukrainian money-tree string (design D2)", () => {
    expect(SPECIES_DEFAULT).toBe("Грошове дерево (Crassula ovata)");
  });
});

describe("validatePlantInput — name", () => {
  it("rejects a missing name with an inline field error (FR-PLANT-01)", () => {
    const result = validatePlantInput(form({ name: null }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.name).toBeTruthy();
    // never a raw throw / whole-form error for a missing field
    expect(result.formError).toBeUndefined();
  });

  it("rejects a blank name", () => {
    const result = validatePlantInput(form({ name: "" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.name).toBeTruthy();
  });

  it("rejects a whitespace-only name (trimmed to empty)", () => {
    const result = validatePlantInput(form({ name: "   \t  " }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.name).toBeTruthy();
  });

  it("trims leading/trailing whitespace from a valid name before storage", () => {
    const result = validatePlantInput(form({ name: "  Ficus  " }));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.name).toBe("Ficus");
  });

  it("accepts a name of exactly 200 chars after trimming (boundary)", () => {
    const result = validatePlantInput(form({ name: "n".repeat(200) }));
    expect(result.ok).toBe(true);
  });

  it("rejects a name of 201 chars after trimming (boundary + 1)", () => {
    const result = validatePlantInput(form({ name: "n".repeat(201) }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.name).toBeTruthy();
  });
});

describe("validatePlantInput — species default & verbatim", () => {
  it("defaults species to SPECIES_DEFAULT when omitted (FR-PLANT-02)", () => {
    const result = validatePlantInput(form({ name: "Фікус" }));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.species).toBe(SPECIES_DEFAULT);
  });

  it("defaults species to SPECIES_DEFAULT when blank", () => {
    const result = validatePlantInput(form({ name: "Фікус", species: "" }));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.species).toBe(SPECIES_DEFAULT);
  });

  it("keeps a custom species' free text (editable, FR-PLANT-02)", () => {
    const result = validatePlantInput(
      form({ name: "Фікус", species: "Ficus lyrata — фікус ліровидний!" }),
    );
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.species).toBe("Ficus lyrata — фікус ліровидний!");
  });

  it("trims a custom species consistently with name (consistency fix)", () => {
    // Deliberate consistency fix: species is trimmed like name, so surrounding
    // whitespace is never persisted and the length bound measures the stored
    // value (see lib/plants/validation.ts review fix #2).
    const result = validatePlantInput(
      form({ name: "Фікус", species: "  Monstera deliciosa  " }),
    );
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.species).toBe("Monstera deliciosa");
  });

  it("accepts species of exactly 200 chars (boundary)", () => {
    const result = validatePlantInput(form({ name: "x", species: "s".repeat(200) }));
    expect(result.ok).toBe(true);
  });

  it("rejects species over 200 chars with an inline field error (boundary + 1)", () => {
    const result = validatePlantInput(form({ name: "x", species: "s".repeat(201) }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.species).toBeTruthy();
  });
});

describe("validatePlantInput — acquired date (D3, SC-1, SC-2)", () => {
  it("treats an omitted acquired date as null (optional, FR-PLANT-03)", () => {
    const result = validatePlantInput(form({ name: "x", acquiredDate: null }));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.acquiredDate).toBeNull();
  });

  it("treats a blank acquired date as null (optional)", () => {
    const result = validatePlantInput(form({ name: "x", acquiredDate: "" }));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.acquiredDate).toBeNull();
  });

  it("accepts a valid past ISO date verbatim", () => {
    const result = validatePlantInput(form({ name: "x", acquiredDate: "2020-01-15" }));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.acquiredDate).toBe("2020-01-15");
  });

  it("accepts today in Kiev (boundary — today is allowed, SC-2)", () => {
    const result = validatePlantInput(form({ name: "x", acquiredDate: TODAY_KIEV }));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.acquiredDate).toBe(TODAY_KIEV);
  });

  it("rejects a future date (tomorrow in Kiev) with an inline field error (SC-2)", () => {
    const result = validatePlantInput(form({ name: "x", acquiredDate: "2026-06-30" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.acquiredDate).toBeTruthy();
  });

  it("rejects a malformed (non YYYY-MM-DD) date with an inline field error", () => {
    const result = validatePlantInput(form({ name: "x", acquiredDate: "29.06.2026" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.acquiredDate).toBeTruthy();
  });

  it("rejects an impossible calendar date that matches the regex (2026-02-30)", () => {
    const result = validatePlantInput(form({ name: "x", acquiredDate: "2026-02-30" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.acquiredDate).toBeTruthy();
  });
});

describe("validatePlantInput — failure echoes submitted values", () => {
  it("echoes the raw submitted values so the form repopulates (FR-SHELL-03)", () => {
    const result = validatePlantInput(form({ name: "", species: "Кактус" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.values?.name).toBe("");
    expect(result.values?.species).toBe("Кактус");
  });
});
