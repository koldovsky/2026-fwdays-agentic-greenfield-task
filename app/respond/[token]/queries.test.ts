// @trace FR-LINK-01 FR-LINK-03
//
// RED tests for getRespondentCycleByToken — written BEFORE the implementation
// exists. Every test in this file must fail until queries.ts is created.
//
// Design authority: openspec/changes/add-link/design.md
// Requirement: openspec/specs/link/spec.md FR-LINK-01..03, BC-PRIVACY-02

import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";

// Mock the Prisma client so no real DB connection is needed.
vi.mock("@/lib/db", () => ({
  db: {
    cycle: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock server-only so the import guard does not block test execution.
vi.mock("server-only", () => ({}));

// Import the function under test AFTER the mocks are registered.
// This import will fail (ERR_MODULE_NOT_FOUND) until queries.ts is created —
// that is the expected RED state.
import { getRespondentCycleByToken } from "./queries";

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

/** A valid templateSnapshot that passes snapshotSchema.safeParse. */
const validSnapshot = {
  name: "Test Template",
  methodology: "peer-360",
  questions: [
    {
      id: "q1",
      order: 1,
      text: "Rate your colleague",
      type: "open",
      required: true,
    },
  ],
};

/** A cycle row returned by db.cycle.findUnique for a collecting cycle. */
function makeCycleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "cycle-id-1",
    token: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    status: "collecting" as const,
    deadline: new Date(Date.now() + 10 * 86_400_000), // 10 days future
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    mode: null,
    templateId: null,
    subjectId: "subject-id-1",
    templateSnapshot: validSnapshot,
    subject: {
      id: "subject-id-1",
      fullName: "Іван Петренко",
      email: "ivan@example.com",
      phone: null,
      telegramHandle: null,
    },
    // add-form (FR-FORM-03/04): no Response row yet by default — the
    // queries.ts select shape is `response: { select: { answers: { ... } } }`
    // per design.md Decision 3. `response: null` is the "no answers saved
    // yet" default and keeps every pre-existing test (which never overrides
    // `response`) passing unchanged.
    response: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getRespondentCycleByToken", () => {
  beforeEach(() => {
    vi.mocked(db.cycle.findUnique).mockReset();
  });

  // -------------------------------------------------------------------------
  // 1. Unknown token → null
  // -------------------------------------------------------------------------
  it("returns null when the token does not exist in the DB", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(null);

    const result = await getRespondentCycleByToken(
      "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
    );

    expect(result).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 2. Valid collecting cycle → enriched RespondentCycle object
  // -------------------------------------------------------------------------
  it("returns a RespondentCycle for a collecting cycle", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(makeCycleRow());

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result).not.toBeNull();
    expect(result?.status).toBe("collecting");
    expect(result?.methodology).toBe("peer-360");
    expect(result?.questions).toHaveLength(1);
    expect(result?.questions[0].id).toBe("q1");
    expect(result?.daysRemaining).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 3. subjectFirstName — multi-word fullName → first word only
  // -------------------------------------------------------------------------
  it("extracts only the first word of a multi-word fullName as subjectFirstName", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({ subject: { fullName: "Іван Петренко" } }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result?.subjectFirstName).toBe("Іван");
    // Must NOT be the full name
    expect(result?.subjectFirstName).not.toBe("Іван Петренко");
  });

  // -------------------------------------------------------------------------
  // 4. subjectFirstName — single-word name → the whole name
  // -------------------------------------------------------------------------
  it("returns the single word as subjectFirstName when fullName has no space", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({ subject: { fullName: "Іван" } }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result?.subjectFirstName).toBe("Іван");
  });

  // -------------------------------------------------------------------------
  // 5. Expired cycle → status "expired" read directly from DB row
  // -------------------------------------------------------------------------
  it("returns status 'expired' when the persisted DB status is 'expired'", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({
        status: "expired",
        // Deadline is in the past, but the function must read the persisted
        // status value — not re-derive it from deadline (FR-LINK-03, Decision 1).
        deadline: new Date(Date.now() - 5 * 86_400_000),
      }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result?.status).toBe("expired");
  });

  // -------------------------------------------------------------------------
  // 6. Done cycle → status "done" read directly from DB row
  // -------------------------------------------------------------------------
  it("returns status 'done' when the persisted DB status is 'done'", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({
        status: "done",
        completedAt: new Date(),
      }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result?.status).toBe("done");
  });

  // -------------------------------------------------------------------------
  // 7. Broken templateSnapshot → null (defensive, no 500)
  // -------------------------------------------------------------------------
  it("returns null when templateSnapshot does not pass snapshotSchema validation", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({
        // Missing required `questions` field — snapshotSchema.safeParse will fail.
        templateSnapshot: { name: "", methodology: "" },
      }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 8. Privacy invariant — returned object must not contain PII fields
  // BC-PRIVACY-02: no id, subjectId, token, subject.fullName, email, phone
  // -------------------------------------------------------------------------
  it("does not include PII or internal id fields in the returned object", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(makeCycleRow());

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result).not.toBeNull();

    // Internal identifiers must not be exposed
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("subjectId");
    expect(result).not.toHaveProperty("token");

    // Full subject object or raw fullName must not be present
    expect(result).not.toHaveProperty("subject");
    // The object must not have a fullName key at the top level either
    expect(result).not.toHaveProperty("fullName");
  });

  // -------------------------------------------------------------------------
  // 9. Questions are present and ordered in the returned object
  // -------------------------------------------------------------------------
  it("returns questions from the templateSnapshot in their defined order", async () => {
    const snapshotWithMultipleQuestions = {
      name: "Multi-Q Template",
      methodology: "self-review",
      questions: [
        { id: "q1", order: 1, text: "First question", type: "open", required: true },
        { id: "q2", order: 2, text: "Second question", type: "open", required: false },
      ],
    };

    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({ templateSnapshot: snapshotWithMultipleQuestions }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result?.questions).toHaveLength(2);
    expect(result?.questions[0].order).toBe(1);
    expect(result?.questions[1].order).toBe(2);
  });

  // -------------------------------------------------------------------------
  // 10. daysRemaining is positive for a future deadline
  // -------------------------------------------------------------------------
  it("computes a positive daysRemaining for a future deadline", async () => {
    const futureDeadline = new Date(Date.now() + 7 * 86_400_000);

    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({ deadline: futureDeadline }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result?.daysRemaining).toBeGreaterThan(0);
    // Should be at most 7 days (could be 6 due to floor rounding)
    expect(result?.daysRemaining).toBeLessThanOrEqual(7);
  });

  // -------------------------------------------------------------------------
  // 11. mode — null on the DB row → mode: null on the RespondentCycle
  // (add-respond, FR-RESP-02 — RED until queries.ts returns `mode`)
  // -------------------------------------------------------------------------
  it("returns mode: null when the cycle's mode column is null", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({ mode: null }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result).not.toBeNull();
    expect(result?.mode).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 12. mode — "form" on the DB row → mode: "form" on the RespondentCycle
  // (add-respond, FR-RESP-02 — RED until queries.ts returns `mode`)
  // -------------------------------------------------------------------------
  it("returns mode: 'form' when the cycle's mode column is 'form'", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({ mode: "form" }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result?.mode).toBe("form");
  });

  // -------------------------------------------------------------------------
  // 13. mode — "interview" on the DB row → mode: "interview" on the
  // RespondentCycle (add-respond, FR-RESP-02 — RED until queries.ts returns
  // `mode`)
  // -------------------------------------------------------------------------
  it("returns mode: 'interview' when the cycle's mode column is 'interview'", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({ mode: "interview" }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result?.mode).toBe("interview");
  });

  // -------------------------------------------------------------------------
  // 14. savedAnswers — no Response row yet → {}
  // (add-form, FR-FORM-03/04 — RED until queries.ts returns `savedAnswers`)
  // -------------------------------------------------------------------------
  it("returns savedAnswers: {} when the cycle has no Response row yet", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({ response: null }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result).not.toBeNull();
    expect(result?.savedAnswers).toEqual({});
  });

  // -------------------------------------------------------------------------
  // 15. savedAnswers — a Response row with zero Answer rows → {}
  // -------------------------------------------------------------------------
  it("returns savedAnswers: {} when the Response row exists but has zero answers", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({ response: { answers: [] } }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result).not.toBeNull();
    expect(result?.savedAnswers).toEqual({});
  });

  // -------------------------------------------------------------------------
  // 16. savedAnswers — one scale answer maps questionId -> number
  // -------------------------------------------------------------------------
  it("maps a saved scale answer row to a numeric savedAnswers entry", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({
        response: {
          answers: [{ questionId: "q1", scaleValue: 3, text: null }],
        },
      }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result?.savedAnswers).toEqual({ q1: 3 });
  });

  // -------------------------------------------------------------------------
  // 17. savedAnswers — one open answer maps questionId -> string
  // -------------------------------------------------------------------------
  it("maps a saved open answer row to a string savedAnswers entry", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({
        response: {
          answers: [{ questionId: "q2", scaleValue: null, text: "my answer" }],
        },
      }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result?.savedAnswers).toEqual({ q2: "my answer" });
  });

  // -------------------------------------------------------------------------
  // 18. savedAnswers — mixed types map each by questionId to the right value
  // -------------------------------------------------------------------------
  it("maps multiple mixed-type answer rows by questionId to their respective value types", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({
        response: {
          answers: [
            { questionId: "q1", scaleValue: 3, text: null },
            { questionId: "q2", scaleValue: null, text: "my answer" },
            { questionId: "q3", scaleValue: 1, text: null },
          ],
        },
      }),
    );

    const result = await getRespondentCycleByToken(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(result?.savedAnswers).toEqual({ q1: 3, q2: "my answer", q3: 1 });
  });
});
