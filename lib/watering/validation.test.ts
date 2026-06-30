// RED (Phase 4b) — written from the spec/design BEFORE the implementation.
// Exercises lib/watering/validation.ts: the one validation decision of this
// slice — the OPTIONAL free-text note rule (design D2: trim; empty/whitespace ->
// null; reject > NOTE_MAX_LEN, never truncate) — plus the date rule reused from
// @/lib/dates (design D3: default to today in Kiev, reject malformed/impossible/
// future) and the FormData -> WateringInput mapper the log/edit actions and the
// eval consume. Asserts the SPECIFIED behavior (the exact accept/reject set from
// the spec's "Optional watering note" + "Log a watering event" requirements),
// not whatever code happens to exist. Imports fail until lib/watering/validation.ts
// (and lib/dates.ts) exist.
//
// @trace FR-WATER-01
// @trace FR-WATER-02
// @trace SC-1
// @trace SC-2
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NOTE_MAX_LEN,
  validateWateringInput,
  type WateringInput,
} from "@/lib/watering/validation";

// Build a FormData the way the add/edit-watering form submits it. Fields are
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
// NOTE_MAX_LEN — the agreed note bound (design D2 step 3). 500 chars, measured
// after trimming, in JS UTF-16 code units.
// ---------------------------------------------------------------------------
describe("NOTE_MAX_LEN — bound constant", () => {
  it("exposes the agreed maximum note length of 500 characters (design D2)", () => {
    expect(NOTE_MAX_LEN).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// validateWateringInput — note field (design D2, FR-WATER-02). The note is
// OPTIONAL: trimmed, empty/whitespace-only -> NULL (not ""), bounded to 500
// chars after trim; over-length REJECTED inline (never truncated, never
// silently accepted). A successful result carries `note: string | null`.
// ---------------------------------------------------------------------------
describe("validateWateringInput — optional note (D2, FR-WATER-02)", () => {
  it("accepts a typical note, storing the trimmed text", () => {
    const result = validateWateringInput(
      form({ wateredOn: "2026-06-20", note: "полив дощовою водою" }),
    );
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.note).toBe("полив дощовою водою");
  });

  it("trims surrounding whitespace from a note before storing", () => {
    const result = validateWateringInput(
      form({ wateredOn: "2026-06-20", note: "  полив  " }),
    );
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.note).toBe("полив");
  });

  it("treats an OMITTED note as no note (null), not an empty string (FR-WATER-02)", () => {
    const result = validateWateringInput(form({ wateredOn: "2026-06-20" }));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.note).toBeNull();
  });

  it("treats an EMPTY note as no note (null), not an empty string (FR-WATER-02)", () => {
    const result = validateWateringInput(
      form({ wateredOn: "2026-06-20", note: "" }),
    );
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.note).toBeNull();
  });

  it("treats a WHITESPACE-ONLY note as no note (null), not '' (FR-WATER-02, R1)", () => {
    const result = validateWateringInput(
      form({ wateredOn: "2026-06-20", note: "   \t \n  " }),
    );
    if (!result.ok) throw new Error("expected success");
    // The contract is NULL, never an empty string — assert strictly.
    expect(result.data?.note).toBeNull();
    expect(result.data?.note).not.toBe("");
  });

  it("accepts a note of EXACTLY 500 characters (boundary, allowed) (FR-WATER-02)", () => {
    const note = "я".repeat(NOTE_MAX_LEN);
    const result = validateWateringInput(form({ wateredOn: "2026-06-20", note }));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.note).toBe(note);
    expect(result.data?.note?.length).toBe(500);
  });

  it("measures length AFTER trimming: a 500-char note padded with whitespace is accepted (D2 step 3)", () => {
    const core = "я".repeat(NOTE_MAX_LEN);
    const result = validateWateringInput(
      form({ wateredOn: "2026-06-20", note: `   ${core}   ` }),
    );
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.note).toBe(core);
  });

  it("REJECTS a note of 501 characters inline (over the bound) — never truncated (FR-WATER-02, R2)", () => {
    const note = "я".repeat(NOTE_MAX_LEN + 1);
    const result = validateWateringInput(form({ wateredOn: "2026-06-20", note }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.note).toBeTruthy();
    // An over-length note is a FIELD problem, never a whole-form/raw error.
    expect(result.formError).toBeUndefined();
    // The over-length value is echoed verbatim (never silently truncated) so the
    // form repopulates and the Owner can shorten it (FR-SHELL-03).
    expect(result.values?.note).toBe(note);
  });

  it("REJECTS an over-length note even when the date is valid (note-only failure)", () => {
    const note = "x".repeat(NOTE_MAX_LEN + 200);
    const result = validateWateringInput(form({ wateredOn: TODAY_KIEV, note }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.note).toBeTruthy();
    // The (valid) date is not flagged.
    expect(result.fieldErrors?.wateredOn).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// validateWateringInput — wateredOn date (design D3, SC-1, SC-2). The date is
// REQUIRED but defaults to today in Kiev when omitted/blank; must be a real
// YYYY-MM-DD calendar date; must NOT be after today in Europe/Kiev. `today`
// would normally be injected, but the helper reads todayInKiev() under the
// fixed fake clock above, matching the growth pattern.
// ---------------------------------------------------------------------------
describe("validateWateringInput — wateredOn date (D3, SC-1, SC-2)", () => {
  it("defaults an OMITTED date to today in Kiev (FR-WATER-01)", () => {
    const result = validateWateringInput(form({}));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.wateredOn).toBe(TODAY_KIEV);
  });

  it("defaults a BLANK date to today in Kiev (FR-WATER-01)", () => {
    const result = validateWateringInput(form({ wateredOn: "" }));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.wateredOn).toBe(TODAY_KIEV);
  });

  it("accepts a valid PAST ISO date verbatim (FR-WATER-01, SC-1)", () => {
    const result = validateWateringInput(form({ wateredOn: "2026-01-15" }));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.wateredOn).toBe("2026-01-15");
  });

  it("accepts TODAY in Kiev (boundary — today is allowed, SC-2)", () => {
    const result = validateWateringInput(form({ wateredOn: TODAY_KIEV }));
    if (!result.ok) throw new Error("expected success");
    expect(result.data?.wateredOn).toBe(TODAY_KIEV);
  });

  it("REJECTS a FUTURE date (tomorrow in Kiev) inline (SC-2)", () => {
    const result = validateWateringInput(form({ wateredOn: "2026-06-30" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.wateredOn).toBeTruthy();
    expect(result.formError).toBeUndefined();
  });

  it("REJECTS a malformed (non YYYY-MM-DD) date inline ('not-a-date') (SC-1)", () => {
    const result = validateWateringInput(form({ wateredOn: "not-a-date" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.wateredOn).toBeTruthy();
  });

  it("REJECTS an impossible calendar date that matches the regex ('2026-02-30')", () => {
    const result = validateWateringInput(form({ wateredOn: "2026-02-30" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.wateredOn).toBeTruthy();
  });

  it("REJECTS an out-of-range month/day ('2026-13-40')", () => {
    const result = validateWateringInput(form({ wateredOn: "2026-13-40" }));
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors?.wateredOn).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// validateWateringInput — the mapper contract (FR-SHELL-03). On failure it
// returns { ok:false, fieldErrors, values } with field-keyed INLINE messages
// and echoes the raw submitted strings so the uncontrolled form repopulates;
// never throws, even on adversarial input.
// ---------------------------------------------------------------------------
describe("validateWateringInput — failure echoes submitted values (FR-SHELL-03)", () => {
  it("echoes the raw submitted date and note so the form repopulates", () => {
    const result = validateWateringInput(
      form({ wateredOn: "2026-13-40", note: "  частковий полив  " }),
    );
    if (result.ok) throw new Error("expected failure");
    // Raw strings echoed verbatim (NOT trimmed/normalized) for repopulation.
    expect(result.values?.wateredOn).toBe("2026-13-40");
    expect(result.values?.note).toBe("  частковий полив  ");
  });

  it("never throws on adversarial input (an oversized note) (FR-SHELL-03)", () => {
    expect(() =>
      validateWateringInput(
        form({ wateredOn: "2026-06-20", note: "я".repeat(100_000) }),
      ),
    ).not.toThrow();
  });

  it("never throws when both date and note are adversarial", () => {
    expect(() =>
      validateWateringInput(
        form({ wateredOn: "9".repeat(10_000), note: " ".repeat(50_000) }),
      ),
    ).not.toThrow();
  });

  it("produces a fully-typed WateringInput on success (plantId is NOT part of input here)", () => {
    const result = validateWateringInput(
      form({ wateredOn: "2026-06-20", note: "ok" }),
    );
    if (!result.ok) throw new Error("expected success");
    const input: WateringInput = result.data!;
    expect(input.wateredOn).toBe("2026-06-20");
    expect(input.note).toBe("ok");
  });
});
