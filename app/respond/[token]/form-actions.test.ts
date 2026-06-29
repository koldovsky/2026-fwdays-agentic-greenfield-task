// @trace FR-FORM-03 FR-FORM-04 TC-VALID-01 NFR-SEC-01
//
// RED tests for the saveAnswer server action — written BEFORE the
// implementation exists. Every test in this file must fail (module not
// found) until app/respond/[token]/form-actions.ts is created.
//
// Design authority: openspec/changes/add-form/design.md
//   - Decision 2: saveAnswer lives in form-actions.ts, not actions.ts
//   - "Prisma upsert pattern for Answer (lazy Response creation)"
//   - "How Cycle.status transitions to done"
//   - "Error handling strategy" table
// Requirement: openspec/specs/form/spec.md FR-FORM-03, FR-FORM-04

import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";

// Mock the Prisma client so no real DB connection is needed — same
// convention as app/respond/[token]/actions.test.ts and queries.test.ts.
vi.mock("@/lib/db", () => ({
  db: {
    cycle: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    response: {
      upsert: vi.fn(),
    },
    answer: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock server-only so the import guard does not block test execution.
vi.mock("server-only", () => ({}));

// Import the function under test AFTER the mocks are registered.
// This import will fail (ERR_MODULE_NOT_FOUND) until form-actions.ts is
// created — that is the expected RED state.
import { saveAnswer } from "./form-actions";

const VALID_TOKEN = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

/**
 * A realistic templateSnapshot with two questions:
 *   - q-scale: required scale question, anchors [1, 2]
 *   - q-open: required open question
 * A third question (q-scale-2) exists with DIFFERENT anchors [10, 20] to
 * test the "valid for a different question, not this one" defense.
 */
const snapshot = {
  name: "Test Template",
  methodology: "peer-360",
  questions: [
    {
      id: "q-scale",
      order: 1,
      text: "Rate the collaboration",
      type: "scale",
      required: true,
      anchors: [
        { value: 1, label: "Low" },
        { value: 2, label: "High" },
      ],
    },
    {
      id: "q-open",
      order: 2,
      text: "Describe an example",
      type: "open",
      required: true,
    },
    {
      id: "q-scale-2",
      order: 3,
      text: "A different scale question",
      type: "scale",
      required: false,
      anchors: [
        { value: 10, label: "Low" },
        { value: 20, label: "High" },
      ],
    },
  ],
};

/** A full cycle row shape, matching the Prisma Cycle model. */
function makeCycleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "cycle-id-1",
    token: VALID_TOKEN,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "collecting" as const,
    mode: "form" as const,
    deadline: new Date(Date.now() + 10 * 86_400_000),
    subjectId: "subject-id-1",
    templateId: "template-id-1",
    templateSnapshot: snapshot,
    ...overrides,
  } as const;
}

/** A full Response row shape, matching the Prisma Response model. */
function makeResponseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "response-id-1",
    cycleId: "cycle-id-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** A full Answer row shape, matching the Prisma Answer model. */
function makeAnswerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "answer-id-1",
    responseId: "response-id-1",
    questionId: "q-open",
    scaleValue: null,
    text: null,
    insufficient: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("saveAnswer", () => {
  beforeEach(() => {
    vi.mocked(db.cycle.findUnique).mockReset();
    vi.mocked(db.cycle.update).mockReset();
    vi.mocked(db.cycle.updateMany).mockReset();
    vi.mocked(db.response.upsert).mockReset();
    vi.mocked(db.answer.upsert).mockReset();
    vi.mocked(db.answer.findMany).mockReset();
  });

  // -------------------------------------------------------------------------
  // Malformed input — rejected at the Zod boundary, no DB call at all
  // -------------------------------------------------------------------------

  it("rejects a payload with a malformed token, with no DB call", async () => {
    const result = await saveAnswer({
      token: "not-a-valid-token",
      answer: { type: "open", questionId: "q-open", text: "hello" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
    expect(db.cycle.findUnique).not.toHaveBeenCalled();
    expect(db.response.upsert).not.toHaveBeenCalled();
    expect(db.answer.upsert).not.toHaveBeenCalled();
  });

  it("rejects a payload with a missing questionId, with no DB call", async () => {
    const result = await saveAnswer({
      token: VALID_TOKEN,
      answer: { type: "open", text: "hello" },
    });

    expect(result.ok).toBe(false);
    expect(db.cycle.findUnique).not.toHaveBeenCalled();
    expect(db.response.upsert).not.toHaveBeenCalled();
    expect(db.answer.upsert).not.toHaveBeenCalled();
  });

  it("rejects a malformed answerInputSchema shape (scale type with a string value), with no DB call", async () => {
    const result = await saveAnswer({
      token: VALID_TOKEN,
      answer: { type: "scale", questionId: "q-scale", value: "3" },
    });

    expect(result.ok).toBe(false);
    expect(db.cycle.findUnique).not.toHaveBeenCalled();
    expect(db.response.upsert).not.toHaveBeenCalled();
    expect(db.answer.upsert).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Token not found
  // -------------------------------------------------------------------------

  it("returns ok:false when the token does not resolve to a cycle, with no further DB calls", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(null);

    const result = await saveAnswer({
      token: VALID_TOKEN,
      answer: { type: "open", questionId: "q-open", text: "hello" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
    expect(db.response.upsert).not.toHaveBeenCalled();
    expect(db.answer.upsert).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Cycle status not "collecting"
  // -------------------------------------------------------------------------

  it("accepts an answer for a trailing OPTIONAL question on a 'done' cycle (form is forward-only)", async () => {
    // A cycle auto-completes when its required questions are answered; the
    // optional q-scale-2 comes after them, so the form still shows it and the
    // answer must save even though status is already "done".
    vi.mocked(db.cycle.findUnique).mockResolvedValue(makeCycleRow({ status: "done" }));
    vi.mocked(db.response.upsert).mockResolvedValue(makeResponseRow());
    vi.mocked(db.answer.upsert).mockResolvedValue(
      makeAnswerRow({ questionId: "q-scale-2", scaleValue: 10, text: null }),
    );
    vi.mocked(db.answer.findMany).mockResolvedValue([
      makeAnswerRow({ questionId: "q-scale", scaleValue: 1, text: null }),
      makeAnswerRow({ questionId: "q-open", text: "done" }),
      makeAnswerRow({ questionId: "q-scale-2", scaleValue: 10, text: null }),
    ]);

    const result = await saveAnswer({
      token: VALID_TOKEN,
      answer: { type: "scale", questionId: "q-scale-2", value: 10 },
    });

    expect(result.ok).toBe(true);
    expect(db.answer.upsert).toHaveBeenCalledTimes(1);
  });

  it("returns ok:false when the cycle status is 'expired', with no write", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(
      makeCycleRow({ status: "expired" }),
    );

    const result = await saveAnswer({
      token: VALID_TOKEN,
      answer: { type: "open", questionId: "q-open", text: "hello" },
    });

    expect(result.ok).toBe(false);
    expect(db.response.upsert).not.toHaveBeenCalled();
    expect(db.answer.upsert).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Cross-cycle / wrong-question-id defense
  // -------------------------------------------------------------------------

  it("returns ok:false when questionId is not present in the cycle's templateSnapshot, with no write", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(makeCycleRow());

    const result = await saveAnswer({
      token: VALID_TOKEN,
      answer: { type: "open", questionId: "q-from-another-cycle", text: "hello" },
    });

    expect(result.ok).toBe(false);
    expect(db.response.upsert).not.toHaveBeenCalled();
    expect(db.answer.upsert).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Answer type mismatch against the snapshot's own question type
  // -------------------------------------------------------------------------

  it("returns ok:false when the answer's type does not match the snapshot question's own type, with no write", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(makeCycleRow());

    // q-open is type "open" in the snapshot; sending "scale" for it must be
    // rejected even though the payload itself is a well-formed scale answer.
    const result = await saveAnswer({
      token: VALID_TOKEN,
      answer: { type: "scale", questionId: "q-open", value: 1 },
    });

    expect(result.ok).toBe(false);
    expect(db.response.upsert).not.toHaveBeenCalled();
    expect(db.answer.upsert).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Scale value not matching THIS question's own anchors
  // -------------------------------------------------------------------------

  it("returns ok:false when a scale value does not match ANY of this question's own anchors, with no write", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(makeCycleRow());

    const result = await saveAnswer({
      token: VALID_TOKEN,
      answer: { type: "scale", questionId: "q-scale", value: 5 },
    });

    expect(result.ok).toBe(false);
    expect(db.response.upsert).not.toHaveBeenCalled();
    expect(db.answer.upsert).not.toHaveBeenCalled();
  });

  it("returns ok:false when a scale value is valid for a DIFFERENT question in the same template but not this one", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(makeCycleRow());

    // 10 is a valid anchor for q-scale-2, but NOT for q-scale (anchors [1, 2]).
    const result = await saveAnswer({
      token: VALID_TOKEN,
      answer: { type: "scale", questionId: "q-scale", value: 10 },
    });

    expect(result.ok).toBe(false);
    expect(db.response.upsert).not.toHaveBeenCalled();
    expect(db.answer.upsert).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Happy path — open answer, NOT yet completing the cycle
  // -------------------------------------------------------------------------

  it("upserts Response and Answer, and returns done:false when the template is still incomplete after this save", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(makeCycleRow());
    vi.mocked(db.response.upsert).mockResolvedValue(makeResponseRow());
    vi.mocked(db.answer.upsert).mockResolvedValue(
      makeAnswerRow({ questionId: "q-open", text: "a thoughtful example" }),
    );
    // Only q-open is now saved; q-scale (required) is still missing — the
    // template is NOT complete.
    vi.mocked(db.answer.findMany).mockResolvedValue([
      makeAnswerRow({ questionId: "q-open", text: "a thoughtful example" }),
    ]);

    const result = await saveAnswer({
      token: VALID_TOKEN,
      answer: { type: "open", questionId: "q-open", text: "a thoughtful example" },
    });

    expect(db.response.upsert).toHaveBeenCalledTimes(1);
    expect(db.answer.upsert).toHaveBeenCalledTimes(1);
    const upsertCall = vi.mocked(db.answer.upsert).mock.calls[0][0];
    expect(upsertCall.where).toEqual({
      responseId_questionId: { responseId: "response-id-1", questionId: "q-open" },
    });

    expect(db.cycle.update).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, done: false });
  });

  // -------------------------------------------------------------------------
  // Happy path — scale answer, COMPLETING the cycle
  // -------------------------------------------------------------------------

  it("marks the cycle done and calls db.cycle.updateMany when this save completes every required question", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(makeCycleRow());
    vi.mocked(db.response.upsert).mockResolvedValue(makeResponseRow());
    vi.mocked(db.answer.upsert).mockResolvedValue(
      makeAnswerRow({ id: "answer-id-2", questionId: "q-scale", scaleValue: 2, text: null }),
    );
    // Both required questions (q-scale, q-open) are now answered — complete.
    vi.mocked(db.answer.findMany).mockResolvedValue([
      makeAnswerRow({ questionId: "q-scale", scaleValue: 2, text: null }),
      makeAnswerRow({ questionId: "q-open", text: "already answered earlier" }),
    ]);

    const result = await saveAnswer({
      token: VALID_TOKEN,
      answer: { type: "scale", questionId: "q-scale", value: 2 },
    });

    // updateMany with status guard mirrors the first-write-wins pattern
    // (TOCTOU fix: if a concurrent expiry already changed status, the
    // update is a no-op rather than silently overwriting the later status).
    expect(db.cycle.updateMany).toHaveBeenCalledTimes(1);
    expect(db.cycle.updateMany).toHaveBeenCalledWith({
      where: { id: "cycle-id-1", status: "collecting" },
      data: { status: "done" },
    });
    expect(db.cycle.update).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, done: true });
  });

  // -------------------------------------------------------------------------
  // Resave path — upsert update branch nulls the other type's column
  // -------------------------------------------------------------------------

  it("nulls the other type's column when resaving an already-answered question as a different shape (scale resave nulls text)", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(makeCycleRow());
    vi.mocked(db.response.upsert).mockResolvedValue(makeResponseRow());
    vi.mocked(db.answer.upsert).mockResolvedValue(
      makeAnswerRow({ questionId: "q-scale", scaleValue: 1, text: null }),
    );
    vi.mocked(db.answer.findMany).mockResolvedValue([
      makeAnswerRow({ questionId: "q-scale", scaleValue: 1, text: null }),
    ]);

    await saveAnswer({
      token: VALID_TOKEN,
      answer: { type: "scale", questionId: "q-scale", value: 1 },
    });

    const upsertCall = vi.mocked(db.answer.upsert).mock.calls[0][0];
    expect(upsertCall.update).toMatchObject({ scaleValue: 1, text: null });
  });

  it("nulls the other type's column when resaving an already-answered question as open (resave nulls scaleValue)", async () => {
    vi.mocked(db.cycle.findUnique).mockResolvedValue(makeCycleRow());
    vi.mocked(db.response.upsert).mockResolvedValue(makeResponseRow());
    vi.mocked(db.answer.upsert).mockResolvedValue(
      makeAnswerRow({ questionId: "q-open", text: "updated answer" }),
    );
    vi.mocked(db.answer.findMany).mockResolvedValue([
      makeAnswerRow({ questionId: "q-open", text: "updated answer" }),
    ]);

    await saveAnswer({
      token: VALID_TOKEN,
      answer: { type: "open", questionId: "q-open", text: "updated answer" },
    });

    const upsertCall = vi.mocked(db.answer.upsert).mock.calls[0][0];
    expect(upsertCall.update).toMatchObject({ text: "updated answer", scaleValue: null });
  });
});
