// @trace FR-RESP-02 TC-VALID-01
//
// RED tests for the chooseMode server action — written BEFORE the
// implementation exists. Every test in this file must fail (module not
// found) until app/respond/[token]/actions.ts is created.
//
// Design authority: openspec/changes/add-respond/design.md
//   - Server action contract: "## Server action: chooseMode"
//   - Decision 1: first-write-wins via updateMany guarded by WHERE mode IS NULL
// Requirement: openspec/specs/respond/spec.md FR-RESP-02,
//   "Invalid, expired, or out-of-bounds entry is handled calmly"

import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";

// Mock the Prisma client so no real DB connection is needed — same
// convention as app/respond/[token]/queries.test.ts.
vi.mock("@/lib/db", () => ({
  db: {
    cycle: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// Mock server-only so the import guard does not block test execution.
vi.mock("server-only", () => ({}));

// Import the function under test AFTER the mocks are registered.
// This import will fail (ERR_MODULE_NOT_FOUND) until actions.ts is created —
// that is the expected RED state.
import { chooseMode } from "./actions";

const VALID_TOKEN = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

/** A full cycle row shape, matching the Prisma Cycle model, for findUnique mocks. */
function makeCycleStub(overrides: Record<string, unknown> = {}) {
  return {
    id: "cycle-id-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    token: VALID_TOKEN,
    status: "collecting" as const,
    mode: null,
    deadline: new Date(Date.now() + 10 * 86_400_000),
    subjectId: "subject-id-1",
    templateId: "template-id-1",
    templateSnapshot: {},
    ...overrides,
  };
}

describe("chooseMode", () => {
  beforeEach(() => {
    vi.mocked(db.cycle.findUnique).mockReset();
    vi.mocked(db.cycle.updateMany).mockReset();
  });

  // -------------------------------------------------------------------------
  // Malformed input — rejected at the Zod boundary, no DB call at all
  // -------------------------------------------------------------------------

  it("rejects a payload with a malformed token, with no DB call", async () => {
    const result = await chooseMode({ token: "not-a-valid-token", mode: "form" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
    expect(db.cycle.findUnique).not.toHaveBeenCalled();
    expect(db.cycle.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a payload with an unexpected mode value, with no DB call", async () => {
    const result = await chooseMode({ token: VALID_TOKEN, mode: "chat" });

    expect(result.ok).toBe(false);
    expect(db.cycle.findUnique).not.toHaveBeenCalled();
    expect(db.cycle.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a payload missing the mode field, with no DB call", async () => {
    const result = await chooseMode({ token: VALID_TOKEN });

    expect(result.ok).toBe(false);
    expect(db.cycle.findUnique).not.toHaveBeenCalled();
    expect(db.cycle.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a payload missing the token field, with no DB call", async () => {
    const result = await chooseMode({ mode: "form" });

    expect(result.ok).toBe(false);
    expect(db.cycle.findUnique).not.toHaveBeenCalled();
    expect(db.cycle.updateMany).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Token not found
  // -------------------------------------------------------------------------

  it("returns ok:false when the token does not resolve to a cycle", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(null);

    const result = await chooseMode({ token: VALID_TOKEN, mode: "form" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
    expect(db.cycle.updateMany).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Cycle status not "collecting"
  // -------------------------------------------------------------------------

  it("returns ok:false when the cycle status is 'expired', with no write attempted", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleStub({ status: "expired" }),
    );

    const result = await chooseMode({ token: VALID_TOKEN, mode: "form" });

    expect(result.ok).toBe(false);
    expect(db.cycle.updateMany).not.toHaveBeenCalled();
  });

  it("returns ok:false when the cycle status is 'done', with no write attempted", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleStub({ status: "done" }),
    );

    const result = await chooseMode({ token: VALID_TOKEN, mode: "interview" });

    expect(result.ok).toBe(false);
    expect(db.cycle.updateMany).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Happy path — this request wins the conditional write
  // -------------------------------------------------------------------------

  it("returns ok:true with the submitted mode when updateMany reports count: 1", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(makeCycleStub());
    vi.mocked(db.cycle.updateMany).mockResolvedValue({ count: 1 });

    const result = await chooseMode({ token: VALID_TOKEN, mode: "form" });

    expect(result).toEqual({ ok: true, mode: "form" });
    // Only the first findUnique call (cycle lookup) should happen on a win —
    // no second re-read is needed.
    expect(db.cycle.findUnique).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Race loss — updateMany reports count: 0, re-read returns the WINNER'S
  // mode, not the mode this (losing) request submitted (Decision 1).
  // -------------------------------------------------------------------------

  it("returns ok:true with the ALREADY-WON mode when this request loses the race", async () => {
    vi.mocked(db.cycle.findUnique)
      // First call: cycle lookup before the conditional write.
      .mockResolvedValueOnce(makeCycleStub())
      // Second call: re-read after losing the race — mode is already set by
      // the winner to "interview", even though THIS request submitted "form".
      .mockResolvedValueOnce(makeCycleStub({ mode: "interview" }));
    vi.mocked(db.cycle.updateMany).mockResolvedValue({ count: 0 });

    const result = await chooseMode({ token: VALID_TOKEN, mode: "form" });

    // The result must report the WINNER's mode ("interview"), never the
    // mode this losing request originally submitted ("form").
    expect(result).toEqual({ ok: true, mode: "interview" });
    expect(db.cycle.findUnique).toHaveBeenCalledTimes(2);
  });
});
