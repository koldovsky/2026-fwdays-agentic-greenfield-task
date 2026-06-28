// @trace FR-CYCLE-01
import { describe, expect, it } from "vitest";
import { makeCreateCycleInputSchema } from "@/lib/schemas/cycle";

/**
 * Red-first unit tests for the cycle creation input schema (FR-CYCLE-01).
 * The module does NOT yet exist — this suite MUST fail red on import.
 *
 * `makeCreateCycleInputSchema(todayISO)` is a factory that returns a Zod schema
 * with the deadline rule anchored to the injected `todayISO` ("YYYY-MM-DD"),
 * making every assertion deterministic and wall-clock-independent.
 *
 * Invariants under test (from spec.md FR-CYCLE-01 scenarios):
 *   - templateId / subjectId: non-empty, max 128 chars
 *   - deadline: strict ISO YYYY-MM-DD only (locale form "DD.MM.YYYY" rejected)
 *   - deadline: strictly AFTER today (today itself rejected)
 *   - deadline: within 365 days from today (366+ rejected)
 *   - Each rejection is surfaced on the correct field path
 *
 * Zod 4 notes:
 *   - `result.error.issues` (not `.errors`)
 *   - `i.path` is an array — check `.includes("deadline")` etc.
 */

const TODAY = "2026-06-28";

function schema() {
  return makeCreateCycleInputSchema(TODAY);
}

/** Minimal valid payload — a baseline we mutate per test. */
const VALID = {
  templateId: "tpl_01j6z8kv5k00000000000000",
  subjectId: "emp_01j6z8kv5k00000000000001",
  deadline: "2026-06-30",
} as const;

// ---------------------------------------------------------------------------
// ACCEPTS — valid inputs
// ---------------------------------------------------------------------------

describe("makeCreateCycleInputSchema — accepts valid input", () => {
  it("accepts a strictly-future ISO date two days from today", () => {
    const result = schema().safeParse(VALID);
    expect(result.success).toBe(true);
  });

  it("accepts a deadline 364 days from today (within the 365-day window)", () => {
    // 2026-06-28 + 364 days = 2027-06-27
    const result = schema().safeParse({ ...VALID, deadline: "2027-06-27" });
    expect(result.success).toBe(true);
  });

  it("accepts a deadline exactly 365 days from today", () => {
    // 2026-06-28 + 365 days = 2027-06-28
    const result = schema().safeParse({ ...VALID, deadline: "2027-06-28" });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// REJECTS deadline — locale format
// ---------------------------------------------------------------------------

describe("makeCreateCycleInputSchema — rejects locale-formatted deadline", () => {
  it("rejects DD.MM.YYYY locale format and flags the deadline field", () => {
    const result = schema().safeParse({ ...VALID, deadline: "28.06.2026" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path.includes("deadline"))).toBe(true);
  });

  it("rejects a malformed non-date string on the deadline field", () => {
    const result = schema().safeParse({ ...VALID, deadline: "not-a-date" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path.includes("deadline"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// REJECTS deadline — past or today
// ---------------------------------------------------------------------------

describe("makeCreateCycleInputSchema — rejects past or today deadline", () => {
  it("rejects today's date (must be strictly after today)", () => {
    const result = schema().safeParse({ ...VALID, deadline: "2026-06-28" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path.includes("deadline"))).toBe(true);
  });

  it("rejects a past date", () => {
    const result = schema().safeParse({ ...VALID, deadline: "2026-06-01" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path.includes("deadline"))).toBe(true);
  });

  it("rejects yesterday", () => {
    const result = schema().safeParse({ ...VALID, deadline: "2026-06-27" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path.includes("deadline"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// REJECTS deadline — out of range (> 365 days)
// ---------------------------------------------------------------------------

describe("makeCreateCycleInputSchema — rejects deadline beyond 365-day horizon", () => {
  it("rejects a deadline 366 days from today", () => {
    // 2026-06-28 + 366 days = 2027-06-29
    const result = schema().safeParse({ ...VALID, deadline: "2027-06-29" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path.includes("deadline"))).toBe(true);
  });

  it("rejects an absurdly far future date (9999-12-31)", () => {
    const result = schema().safeParse({ ...VALID, deadline: "9999-12-31" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path.includes("deadline"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// REJECTS templateId
// ---------------------------------------------------------------------------

describe("makeCreateCycleInputSchema — rejects invalid templateId", () => {
  it("rejects an empty templateId and flags the templateId field", () => {
    const result = schema().safeParse({ ...VALID, templateId: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path.includes("templateId"))).toBe(true);
  });

  it("rejects a missing templateId and flags the templateId field", () => {
    const { templateId: _tid, ...rest } = VALID;
    void _tid;
    const result = schema().safeParse(rest);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path.includes("templateId"))).toBe(true);
  });

  it("rejects a templateId over 128 characters and flags the templateId field", () => {
    const result = schema().safeParse({ ...VALID, templateId: "t".repeat(129) });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path.includes("templateId"))).toBe(true);
  });

  it("accepts a templateId of exactly 128 characters", () => {
    const result = schema().safeParse({ ...VALID, templateId: "t".repeat(128) });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// REJECTS subjectId
// ---------------------------------------------------------------------------

describe("makeCreateCycleInputSchema — rejects invalid subjectId", () => {
  it("rejects an empty subjectId and flags the subjectId field", () => {
    const result = schema().safeParse({ ...VALID, subjectId: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path.includes("subjectId"))).toBe(true);
  });

  it("rejects a missing subjectId and flags the subjectId field", () => {
    const { subjectId: _sid, ...rest } = VALID;
    void _sid;
    const result = schema().safeParse(rest);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path.includes("subjectId"))).toBe(true);
  });

  it("rejects a subjectId over 128 characters and flags the subjectId field", () => {
    const result = schema().safeParse({ ...VALID, subjectId: "s".repeat(129) });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.path.includes("subjectId"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TypeScript type inferred from schema (structural check via successful parse)
// ---------------------------------------------------------------------------

describe("makeCreateCycleInputSchema — inferred type shape", () => {
  it("parsed output has templateId, subjectId, and deadline as strings", () => {
    const result = schema().safeParse(VALID);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(typeof result.data.templateId).toBe("string");
    expect(typeof result.data.subjectId).toBe("string");
    expect(typeof result.data.deadline).toBe("string");
  });
});
