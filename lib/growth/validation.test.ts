// RED (Phase 4b) — written from the spec/design BEFORE the implementation.
// Exercises lib/growth/validation.ts: the load-bearing height-parse rule
// (design D2) and the FormData -> ActionResult mapper (validateMeasurementInput)
// the log/edit actions and the eval consume. Asserts the SPECIFIED behavior
// (the exact accept/reject set from the spec's "Validate height input"
// requirement, the comma-as-decimal rule, the grouping-separator rejection, the
// at-most-one-decimal-place precision cap, the > 0 and <= 1000 bounds, and the
// required-date default + future-date rejection), not whatever code happens to
// exist. Imports fail until lib/growth/validation.ts (and lib/dates.ts) exist.
//
// @trace FR-GROWTH-01
// @trace FR-GROWTH-05
// @trace SC-1
// @trace SC-2
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  HEIGHT_MAX_CM,
  parseHeightCm,
  validateMeasurementInput,
} from "@/lib/growth/validation";

// Build a FormData the way the add/edit-measurement form submits it. Fields are
// omitted (never set) to simulate "left untouched"; passing null also omits.
function form(fields: Record<string, string | null>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null) fd.set(k, v);
  }
  return fd;
}

// Pin a deterministic "today" in Europe/Kiev so the default-date and future-date
// assertions are stable regardless of when the suite runs.
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

// ---------------------------------------------------------------------------
// parseHeightCm — the critical pure function (design D2). Returns the parsed
// number on success, or null on any rejection (a thin signal the mapper turns
// into a field-keyed Ukrainian message). Every accept/reject case named in the
// spec's "Validate height input" requirement has a colocated assertion here.
// ---------------------------------------------------------------------------
describe("parseHeightCm — bound constant", () => {
  it("exposes the agreed upper bound of 1000 cm (design D2 step 7)", () => {
    expect(HEIGHT_MAX_CM).toBe(1000);
  });
});

describe("parseHeightCm — accepts", () => {
  it("accepts an integer with no separator: '42' -> 42 (FR-GROWTH-05)", () => {
    expect(parseHeightCm("42")).toBe(42);
  });

  it("accepts a dot decimal: '12.5' -> 12.5 (FR-GROWTH-05)", () => {
    expect(parseHeightCm("12.5")).toBe(12.5);
  });

  it("accepts a comma decimal, treating ',' as the decimal separator: '12,5' -> 12.5 (FR-GROWTH-05, NFR-LOC-01)", () => {
    expect(parseHeightCm("12,5")).toBe(12.5);
  });

  it("accepts a trailing zero with a dot: '12.50' -> 12.5 (FR-GROWTH-05)", () => {
    expect(parseHeightCm("12.50")).toBe(12.5);
  });

  it("accepts a trailing zero with a comma: '12,50' -> 12.5 (FR-GROWTH-05)", () => {
    expect(parseHeightCm("12,50")).toBe(12.5);
  });

  it("trims surrounding whitespace: '  7  ' -> 7 (design D2 step 1)", () => {
    expect(parseHeightCm("  7  ")).toBe(7);
  });

  it("accepts a value exactly at the upper bound: '1000' -> 1000 (boundary)", () => {
    expect(parseHeightCm("1000")).toBe(1000);
  });

  it("accepts the smallest representable one-decimal value above zero: '0.1' -> 0.1 (boundary, > 0)", () => {
    expect(parseHeightCm("0.1")).toBe(0.1);
  });
});

describe("parseHeightCm — rejects (returns null)", () => {
  it("rejects an empty string (blank height is required) (FR-GROWTH-05)", () => {
    expect(parseHeightCm("")).toBeNull();
  });

  it("rejects a whitespace-only string (blank after trim) (FR-GROWTH-05)", () => {
    expect(parseHeightCm("   \t ")).toBeNull();
  });

  it("rejects a non-numeric value: 'abc' (FR-GROWTH-05)", () => {
    expect(parseHeightCm("abc")).toBeNull();
  });

  it("rejects another non-numeric value: 'tall' (FR-GROWTH-05)", () => {
    expect(parseHeightCm("tall")).toBeNull();
  });

  it("rejects a negative value: '-3' (sign is non-numeric here) (FR-GROWTH-05)", () => {
    expect(parseHeightCm("-3")).toBeNull();
  });

  it("rejects zero: '0' (must be strictly > 0) (FR-GROWTH-05)", () => {
    expect(parseHeightCm("0")).toBeNull();
  });

  it("rejects zero with a comma: '0,0' (must be strictly > 0) (FR-GROWTH-05)", () => {
    expect(parseHeightCm("0,0")).toBeNull();
  });

  it("rejects zero with a dot: '0.0' (must be strictly > 0) (FR-GROWTH-05)", () => {
    expect(parseHeightCm("0.0")).toBeNull();
  });

  it("rejects just over the upper bound: '1000.1' (must be <= 1000) (FR-GROWTH-05)", () => {
    expect(parseHeightCm("1000.1")).toBeNull();
  });

  it("rejects a wildly oversized value: '999999999' (must be <= 1000) (FR-GROWTH-05)", () => {
    expect(parseHeightCm("999999999")).toBeNull();
  });

  it("rejects over-precision with a dot: '12.55' (at most one decimal place) (FR-GROWTH-05)", () => {
    expect(parseHeightCm("12.55")).toBeNull();
  });

  it("rejects over-precision with a comma: '12,555' (at most one decimal place) (FR-GROWTH-05)", () => {
    expect(parseHeightCm("12,555")).toBeNull();
  });

  it("rejects a grouping/thousands separator (ambiguous): '1,000' (FR-GROWTH-05, NFR-LOC-01)", () => {
    // 1,000 could mean 1000 (grouping) or 1.0 (decimal comma) — ambiguous in the
    // Owner's Kiev locale, so it is treated as non-numeric and REJECTED, never
    // silently reinterpreted (design R1). NOTE: 1000 is within bounds, so this
    // must fail on the SEPARATOR rule, not the bound — a weaker parser that read
    // it as 1000 would wrongly accept it.
    expect(parseHeightCm("1,000")).toBeNull();
  });

  it("rejects more than one separator: '12.5.5' (FR-GROWTH-05)", () => {
    expect(parseHeightCm("12.5.5")).toBeNull();
  });

  it("rejects a mixed grouping + decimal with a space: '1 200,5' (FR-GROWTH-05, NFR-LOC-01)", () => {
    expect(parseHeightCm("1 200,5")).toBeNull();
  });

  it("rejects an internal space even without a comma: '1 200' (space is non-numeric)", () => {
    expect(parseHeightCm("1 200")).toBeNull();
  });

  it("rejects a leading-separator malformed value: '.5' (a digit is required before the separator) (design D2 step 4)", () => {
    expect(parseHeightCm(".5")).toBeNull();
  });

  it("rejects a leading-comma malformed value: ',5' (a digit is required before the separator)", () => {
    expect(parseHeightCm(",5")).toBeNull();
  });

  it("rejects a trailing separator: '12.' (numeric shape requires a digit after the separator)", () => {
    expect(parseHeightCm("12.")).toBeNull();
  });

  it("rejects an explicit positive sign: '+5' (sign is non-numeric here)", () => {
    expect(parseHeightCm("+5")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateMeasurementInput — the FormData -> ActionResult mapper. On failure it
// returns { ok:false, fieldErrors, values } with a field-keyed INLINE Ukrainian
// message (never a raw throw / whole-form error for a field problem) and echoes
// the raw submitted strings so the uncontrolled form repopulates (FR-SHELL-03).
// `today` is injectable for deterministic tests; defaults to today in Kiev.
// ---------------------------------------------------------------------------
describe("validateMeasurementInput — height field", () => {
  it("rejects a blank height with an inline height field error (FR-GROWTH-05)", () => {
    const result = validateMeasurementInput(form({ heightCm: "" }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.heightCm).toBeTruthy();
    // never a raw throw / whole-form error for a single bad field
    expect(result.formError).toBeUndefined();
  });

  it("rejects a missing (omitted) height with an inline height field error", () => {
    const result = validateMeasurementInput(form({ heightCm: null }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.heightCm).toBeTruthy();
  });

  it("rejects a non-numeric height inline ('abc') (FR-GROWTH-05)", () => {
    const result = validateMeasurementInput(form({ heightCm: "abc" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.heightCm).toBeTruthy();
  });

  it("rejects a negative height inline ('-3') (FR-GROWTH-05)", () => {
    const result = validateMeasurementInput(form({ heightCm: "-3" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.heightCm).toBeTruthy();
  });

  it("rejects a zero height inline ('0') (FR-GROWTH-05)", () => {
    const result = validateMeasurementInput(form({ heightCm: "0" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.heightCm).toBeTruthy();
  });

  it("rejects an over-bound height inline ('1000.1') (FR-GROWTH-05)", () => {
    const result = validateMeasurementInput(form({ heightCm: "1000.1" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.heightCm).toBeTruthy();
  });

  it("rejects an over-precision height inline ('12.55') (FR-GROWTH-05)", () => {
    const result = validateMeasurementInput(form({ heightCm: "12.55" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.heightCm).toBeTruthy();
  });

  it("rejects a grouping-separator height inline ('1,000') (FR-GROWTH-05, NFR-LOC-01)", () => {
    const result = validateMeasurementInput(form({ heightCm: "1,000" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.heightCm).toBeTruthy();
  });

  it("accepts a valid decimal-comma height, storing it as the parsed number (FR-GROWTH-05)", () => {
    const result = validateMeasurementInput(
      form({ heightCm: "12,5", measuredOn: "2026-06-20" }),
    );
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.heightCm).toBe(12.5);
  });

  it("accepts a valid integer height, storing it as a number (FR-GROWTH-05)", () => {
    const result = validateMeasurementInput(
      form({ heightCm: "42", measuredOn: "2026-06-20" }),
    );
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.heightCm).toBe(42);
  });
});

describe("validateMeasurementInput — measuredOn date (D3, SC-1, SC-2)", () => {
  it("defaults an omitted date to today in Kiev (FR-GROWTH-01)", () => {
    const result = validateMeasurementInput(form({ heightCm: "10" }));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.measuredOn).toBe(TODAY_KIEV);
  });

  it("defaults a blank date to today in Kiev (FR-GROWTH-01)", () => {
    const result = validateMeasurementInput(
      form({ heightCm: "10", measuredOn: "" }),
    );
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.measuredOn).toBe(TODAY_KIEV);
  });

  it("accepts a valid past ISO date verbatim", () => {
    const result = validateMeasurementInput(
      form({ heightCm: "10", measuredOn: "2026-01-15" }),
    );
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.measuredOn).toBe("2026-01-15");
  });

  it("accepts today in Kiev (boundary — today is allowed, SC-2)", () => {
    const result = validateMeasurementInput(
      form({ heightCm: "10", measuredOn: TODAY_KIEV }),
    );
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.measuredOn).toBe(TODAY_KIEV);
  });

  it("rejects a future date (tomorrow in Kiev) with an inline date field error (SC-2)", () => {
    const result = validateMeasurementInput(
      form({ heightCm: "10", measuredOn: "2026-06-30" }),
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.measuredOn).toBeTruthy();
  });

  it("rejects a malformed (non YYYY-MM-DD) date inline ('not-a-date') (SC-1)", () => {
    const result = validateMeasurementInput(
      form({ heightCm: "10", measuredOn: "not-a-date" }),
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.measuredOn).toBeTruthy();
  });

  it("rejects an impossible calendar date that matches the regex ('2026-02-30')", () => {
    const result = validateMeasurementInput(
      form({ heightCm: "10", measuredOn: "2026-02-30" }),
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.measuredOn).toBeTruthy();
  });

  it("rejects an out-of-range month ('2026-13-40')", () => {
    const result = validateMeasurementInput(
      form({ heightCm: "10", measuredOn: "2026-13-40" }),
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.measuredOn).toBeTruthy();
  });
});

describe("validateMeasurementInput — failure echoes submitted values (FR-SHELL-03)", () => {
  it("echoes the raw submitted height and date so the form repopulates", () => {
    const result = validateMeasurementInput(
      form({ heightCm: "abc", measuredOn: "2026-06-20" }),
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.values?.heightCm).toBe("abc");
    expect(result.values?.measuredOn).toBe("2026-06-20");
  });

  it("never throws on adversarial input (oversized string) (FR-SHELL-03)", () => {
    expect(() =>
      validateMeasurementInput(form({ heightCm: "9".repeat(10_000) })),
    ).not.toThrow();
  });
});
