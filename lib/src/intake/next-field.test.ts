// Colocated unit tests for `next-field.ts`'s `nextNeededField` — the single
// source of truth extracted from `packages/agent/src/system-prompt.ts`'s
// former private helper of the same name (conversational-flow bugfix: this
// module now also drives `questions.ts`'s deterministic lead-facing
// question, so it must stay correct and colocated-tested on its own,
// independent of `system-prompt.test.ts`'s existing indirect coverage).
import { describe, expect, it } from "vitest";
import { nextNeededField } from "./next-field.ts";
import { initialIntakeState, type IntakeState } from "./state-machine.ts";

describe("nextNeededField", () => {
  // @trace FR-INTAKE-01
  it("names studentName first, for a fresh (greeting) state", () => {
    expect(nextNeededField(initialIntakeState())?.field).toBe("studentName");
  });

  // @trace FR-INTAKE-02
  it("names studentAge once name is collected", () => {
    const state: IntakeState = { conversationState: "qualifying", fields: { studentName: "Богдан" } };
    expect(nextNeededField(state)?.field).toBe("studentAge");
  });

  // @trace FR-INTAKE-02
  it("names format once name and age are collected", () => {
    const state: IntakeState = {
      conversationState: "qualifying",
      fields: { studentName: "Богдан", studentAge: 9 },
    };
    expect(nextNeededField(state)?.field).toBe("format");
  });

  // The former "profiling" stage (goalTag/tastes/experienceComfort) is DROPPED
  // from the MVP flow (2026-07-09, mandatory-only 5-step intake) — a
  // hand-constructed `profiling` state now has nothing to actively collect.
  it("returns null for a (dropped) profiling state — goal/tastes/experience are no longer asked", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Богдан", studentAge: 9, format: "individual" },
    };
    expect(nextNeededField(state)).toBeNull();
  });

  // @trace FR-INTAKE-06
  it("names preferredWeekdays first in collecting", () => {
    const state: IntakeState = {
      conversationState: "collecting",
      fields: { studentName: "Богдан", studentAge: 9, format: "individual" },
    };
    expect(nextNeededField(state)?.field).toBe("preferredWeekdays");
  });

  // @trace FR-INTAKE-06
  it("names preferredTimeRange once weekdays are collected", () => {
    const state: IntakeState = {
      conversationState: "collecting",
      fields: {
        studentName: "Богдан",
        studentAge: 9,
        format: "individual",
        preferredWeekdays: "вт, чт",
      },
    };
    expect(nextNeededField(state)?.field).toBe("preferredTimeRange");
  });

  it("returns null for terminal states (done, soft_decline) and awaiting_admin", () => {
    for (const conversationState of ["done", "soft_decline", "awaiting_admin"] as const) {
      expect(nextNeededField({ conversationState, fields: {} })).toBeNull();
    }
  });

  it("names slots in proposing", () => {
    const state: IntakeState = {
      conversationState: "proposing",
      fields: {
        studentName: "Богдан",
        studentAge: 9,
        format: "individual",
        preferredWeekdays: "вт, чт",
        preferredTimeRange: "після 16:00",
      },
    };
    expect(nextNeededField(state)?.field).toBe("slots");
  });
});
