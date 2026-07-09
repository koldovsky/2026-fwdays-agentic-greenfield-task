// Colocated unit tests for `questions.ts` — the deterministic, lead-facing
// "what should the bot say next" copy this conversational-flow bugfix
// introduces (see this file's own header comment, and
// `packages/agent/src/loop.ts`'s `assembleReply`, for the full rule this
// module's `nextLeadFacingStep` feeds).
import { describe, expect, it } from "vitest";
import {
  AWAITING_ADMIN_CLOSING_COPY,
  CANCELLED_CLOSING_COPY,
  DEFAULT_ACK_COPY,
  nextLeadFacingStep,
  PROFILE_COMPLETE_CLOSING_COPY,
} from "./questions.ts";
import { AGE_REFUSAL_COPY } from "./copy.ts";
import { initialIntakeState, type IntakeState } from "./state-machine.ts";

const PRESSURE_VOCABULARY = ["останнє місце", "тільки сьогодні", "поспішайте"];
const UKRAINIAN_ONLY = /^[^a-zA-Z]*$/;

describe("nextLeadFacingStep", () => {
  // @trace FR-INTAKE-01
  it("asks for studentName first, for a fresh (greeting) state", () => {
    const step = nextLeadFacingStep(initialIntakeState());
    expect(step.kind).toBe("question");
    expect(step.text).toContain("Як звати");
  });

  // @trace FR-INTAKE-02
  it("asks for studentAge once name is collected", () => {
    const state: IntakeState = { conversationState: "qualifying", fields: { studentName: "Богдан" } };
    const step = nextLeadFacingStep(state);
    expect(step.kind).toBe("question");
    expect(step.text).toContain("Скільки років");
  });

  // @trace FR-INTAKE-02
  it("asks for format once name and age are collected", () => {
    const state: IntakeState = {
      conversationState: "qualifying",
      fields: { studentName: "Богдан", studentAge: 9 },
    };
    const step = nextLeadFacingStep(state);
    expect(step.kind).toBe("question");
    expect(step.text.toLowerCase()).toContain("формат");
  });

  // @trace FR-INTAKE-03
  // @trace BC-AGE-02
  // The goal/tastes/experience ("profiling") questions are DROPPED from the
  // MVP flow (2026-07-09, mandatory-only 5-step intake), so there are no
  // longer any parent-vs-student-addressed get-to-know questions to phrase.
  // The merged name+age question is asked as one neutral fact instead.
  // @trace FR-INTAKE-01
  it("asks name and age together (merged step 1), with no assessment/grading language", () => {
    const step = nextLeadFacingStep(initialIntakeState());
    expect(step.kind).toBe("question");
    expect(step.text).toContain("звати");
    expect(step.text).toContain("років");
    expect(step.text.toLowerCase()).not.toContain("перевір");
    expect(step.text.toLowerCase()).not.toContain("рівень");
  });

  // @trace FR-INTAKE-06
  it("asks weekdays and time together (merged step 3)", () => {
    const step = nextLeadFacingStep({
      conversationState: "collecting",
      fields: { studentName: "Б", studentAge: 9, format: "individual" },
    });
    expect(step.kind).toBe("question");
    expect(step.text).toContain("дні тижня");
    expect(step.text).toContain("час доби");
  });

  // @trace FR-INTAKE-01
  it("asks ONLY the name (not the merged pair) when age is already collected — no re-asking a given fact", () => {
    const step = nextLeadFacingStep({ conversationState: "qualifying", fields: { studentAge: 7 } });
    expect(step.kind).toBe("question");
    expect(step.text).toContain("звати");
    expect(step.text).not.toContain("років"); // must NOT re-ask the age just given
  });

  // @trace FR-INTAKE-06
  it("asks ONLY the weekdays (not the merged pair) when the time is already collected", () => {
    const step = nextLeadFacingStep({
      conversationState: "collecting",
      fields: { studentName: "Б", studentAge: 9, format: "individual", preferredTimeRange: "зранку" },
    });
    expect(step.kind).toBe("question");
    expect(step.text).toContain("дні тижня");
    expect(step.text).not.toContain("час доби"); // must NOT re-ask the time just given
  });

  // @trace FR-INTAKE-06
  it("reaching proposing yields a closing note, not a question", () => {
    const state: IntakeState = {
      conversationState: "proposing",
      fields: {
        studentName: "Оксана",
        studentAge: 9,
        format: "individual",
        preferredWeekdays: "вт, чт",
        preferredTimeRange: "після 16:00",
      },
    };
    const step = nextLeadFacingStep(state);
    expect(step).toEqual({ kind: "closing", text: PROFILE_COMPLETE_CLOSING_COPY });
  });

  // @trace FR-INTAKE-07
  it("the terminal done state yields the cancellation closing note", () => {
    const state: IntakeState = { conversationState: "done", fields: {} };
    expect(nextLeadFacingStep(state)).toEqual({ kind: "closing", text: CANCELLED_CLOSING_COPY });
  });

  // @trace FR-GUARD-04
  it("the terminal soft_decline state reuses the exact AGE_REFUSAL_COPY constant", () => {
    const state: IntakeState = { conversationState: "soft_decline", fields: {} };
    expect(nextLeadFacingStep(state)).toEqual({ kind: "closing", text: AGE_REFUSAL_COPY });
  });

  it("the awaiting_admin state yields a closing note, never a dangling ack", () => {
    const state: IntakeState = { conversationState: "awaiting_admin", fields: {} };
    expect(nextLeadFacingStep(state)).toEqual({ kind: "closing", text: AWAITING_ADMIN_CLOSING_COPY });
  });

  // @trace BC-BRAND-01
  it("every closing/question copy is Ukrainian-only, no exclamation marks, no pressure vocabulary", () => {
    const samples = [
      DEFAULT_ACK_COPY,
      PROFILE_COMPLETE_CLOSING_COPY,
      CANCELLED_CLOSING_COPY,
      AWAITING_ADMIN_CLOSING_COPY,
      nextLeadFacingStep(initialIntakeState()).text,
      nextLeadFacingStep({ conversationState: "qualifying", fields: { studentName: "Б" } }).text,
      nextLeadFacingStep({
        conversationState: "qualifying",
        fields: { studentName: "Б", studentAge: 9 },
      }).text,
      nextLeadFacingStep({
        conversationState: "profiling",
        fields: { studentName: "Б", studentAge: 7, format: "individual" },
      }).text,
      nextLeadFacingStep({
        conversationState: "profiling",
        fields: { studentName: "Б", studentAge: 14, format: "individual", goalTag: "hobby", goalText: "" },
      }).text,
      nextLeadFacingStep({
        conversationState: "collecting",
        fields: { studentName: "Б", studentAge: 9, format: "individual" },
      }).text,
    ];
    for (const sample of samples) {
      expect(sample).toMatch(UKRAINIAN_ONLY);
      expect(sample).not.toContain("!");
      for (const phrase of PRESSURE_VOCABULARY) {
        expect(sample.toLowerCase()).not.toContain(phrase);
      }
    }
  });
});
