// Test-first (red): lib/src/intake/state-machine.ts's `transition()` does
// not exist as behavior yet (typed throwing stub only) — tasks.md 2.5-2.14.
//
// Contract this file pins down for the implementer (design.md Decision 1,
// ADR-0001 §6, spec.md's intake requirements):
//   - `transition(state, event)` is a PURE, synchronous reducer.
//   - Field ownership per state: "qualifying" owns
//     save_name/save_age/save_format; "profiling" owns
//     save_goal/skip_goal/save_tastes/skip_tastes/save_experience_comfort;
//     "collecting" owns save_weekdays/save_time_range. An out-of-state
//     save_*/skip_* event is rejected with `error: "FIELD_NOT_OWNED_BY_STATE"`,
//     state and fields UNCHANGED (same object reference back).
//   - Once every field owned by the current state is present and valid,
//     the reducer auto-advances: qualifying -> profiling -> collecting ->
//     proposing.
//   - The minimum-age guardrail (FR-GUARD-04, BC-AGE-01) is enforced in
//     the reducer itself: any `studentAge` value below 4 — whether from a
//     first `save_age` or a later `amend` — drives `conversationState` to
//     the terminal "soft_decline", discarding fields, from ANY state.
//   - Scope/format detours (BC-SCOPE-01/02, BC-FORMAT-01) are a
//     side-channel `detour` field on `TransitionResult` — `conversationState`
//     and `fields` are byte-identical before/after a detour (design.md
//     Decision 1's chosen option: "resuming" is a no-op by construction).
//   - `amend` (FR-INTAKE-07) is accepted in any NON-terminal state,
//     re-validates the field, and re-derives anything computed live off it
//     (e.g. `addressesParent`, BC-AGE-02) — never stored separately.
//   - `cancel` (FR-INTAKE-07) drives `awaiting_admin -> done`.
//   - Any save_*/amend event against a TERMINAL state ("done" or
//     "soft_decline") is rejected with `error: "TERMINAL_STATE"`
//     (FR-INTAKE-08), state/fields unchanged.
//   - `initialIntakeState()` returns a fresh, independent instance every
//     call — two `requests` rows for the same lead (FR-INTAKE-08) never
//     alias each other's `fields`.
import { describe, expect, it } from "vitest";
import { addressesParent } from "./audience";
import {
  initialIntakeState,
  transition,
  type IntakeEvent,
  type IntakeState,
  type OfferedSlot,
  type TransitionResult,
} from "./state-machine";

/** A bare "qualifying" fixture — the state a lead is in once the greeting's
 *  processing-notice message has been sent and the bot is ready to ask for
 *  the student's name (bot-pipeline concern, out of this reducer's scope). */
function qualifying(fields: IntakeState["fields"] = {}): IntakeState {
  return { conversationState: "qualifying", fields };
}

const PROPOSING_OR_LATER = ["proposing", "awaiting_admin", "done"] as const;

describe("transition() — happy path: qualifying -> collecting -> proposing (profiling dropped 2026-07-09)", () => {
  // @trace FR-INTAKE-01
  // @trace FR-INTAKE-02
  it("advances qualifying -> collecting (NOT profiling) only once name, age, and format are all saved", () => {
    let result = transition(qualifying(), { type: "save_name", name: "Оксана" });
    expect(result.state.fields.studentName).toBe("Оксана");
    expect(result.state.conversationState).toBe("qualifying");
    expect(result.error).toBeUndefined();
    expect(result.detour).toBeNull();

    result = transition(result.state, { type: "save_age", age: 9 });
    expect(result.state.fields.studentAge).toBe(9);
    expect(result.state.conversationState).toBe("qualifying");
    expect(result.error).toBeUndefined();

    result = transition(result.state, { type: "save_format", format: "individual" });
    expect(result.state.fields.format).toBe("individual");
    // The MVP intake is mandatory-only (5 steps) — qualifying now advances
    // STRAIGHT to collecting, skipping the dropped "profiling" stage.
    expect(result.state.conversationState).toBe("collecting");
    expect(result.error).toBeUndefined();
    expect(result.detour).toBeNull();
  });

  // @trace FR-INTAKE-06
  it("advances collecting -> proposing once weekdays and time range are both saved", () => {
    const base = {
      conversationState: "collecting",
      fields: { studentName: "Оксана", studentAge: 9, format: "individual" },
    } as IntakeState;

    let result = transition(base, { type: "save_weekdays", weekdays: "вівторок, четвер" });
    expect(result.state.fields.preferredWeekdays).toBe("вівторок, четвер");
    expect(result.state.conversationState).toBe("collecting");

    result = transition(result.state, { type: "save_time_range", timeRange: "після 17:00" });
    expect(result.state.fields.preferredTimeRange).toBe("після 17:00");
    expect(result.state.conversationState).toBe("proposing");
  });
});

describe("transition() — field-ownership gate (ADR-0001 §6)", () => {
  // @trace FR-INTAKE-02
  it("rejects save_age while conversationState is profiling, state and fields unchanged", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Оксана", studentAge: 9, format: "individual" },
    };

    const result = transition(state, { type: "save_age", age: 10 });

    expect(result.error).toBe("FIELD_NOT_OWNED_BY_STATE");
    expect(result.state).toBe(state); // same reference — no mutation, no copy
    expect(result.state.conversationState).toBe("profiling");
    expect(result.state.fields.studentAge).toBe(9);
  });
});

describe("transition() — minimum-age guardrail (FR-GUARD-04, BC-AGE-01)", () => {
  // @trace FR-GUARD-04
  it("drives save_age(3) to the terminal soft_decline state with no fields retained", () => {
    const state = qualifying({ studentName: "Оксана" });

    const result = transition(state, { type: "save_age", age: 3 });

    expect(result.state.conversationState).toBe("soft_decline");
    expect(result.error).toBe("AGE_BELOW_MIN");
    expect(result.state.fields).toEqual({});
  });

  // @trace FR-GUARD-04
  it("rejects any further save_age/save_name event once soft_decline is reached (persuasion scenario)", () => {
    const declined: IntakeState = { conversationState: "soft_decline", fields: {} };

    const persistedAge = transition(declined, { type: "save_age", age: 5 });
    expect(persistedAge.error).toBe("TERMINAL_STATE");
    expect(persistedAge.state).toBe(declined);
    expect(persistedAge.state.conversationState).toBe("soft_decline");

    const persistedName = transition(declined, { type: "save_name", name: "Ліда" });
    expect(persistedName.error).toBe("TERMINAL_STATE");
    expect(persistedName.state).toBe(declined);
    expect(persistedName.state.fields).toEqual({});
  });
});

describe("transition() — proposing is unreachable with studentAge < 4 (property-style)", () => {
  // @trace FR-INTAKE-02
  it("never lets conversationState reach proposing/awaiting_admin/done while age has ever been recorded below 4, across representative event-order permutations", () => {
    function driveSequence(events: IntakeEvent[]): TransitionResult[] {
      const history: TransitionResult[] = [];
      let state = qualifying();
      for (const event of events) {
        const result = transition(state, event);
        history.push(result);
        state = result.state;
      }
      return history;
    }

    const sequences: IntakeEvent[][] = [
      // Age gate hit first, before any other qualifying field.
      [{ type: "save_age", age: 2 }, { type: "save_name", name: "Тіна" }, { type: "save_format", format: "individual" }],
      // Age gate hit last, after name/format are already recorded.
      [{ type: "save_name", name: "Тіна" }, { type: "save_format", format: "individual" }, { type: "save_age", age: 2 }],
      // Valid age initially, then an amend drops it below 4 mid-collecting.
      [
        { type: "save_name", name: "Тіна" },
        { type: "save_age", age: 9 },
        { type: "save_format", format: "individual" },
        { type: "skip_goal" },
        { type: "skip_tastes" },
        { type: "save_experience_comfort", experience: "ніякого", comfort: "акапела" },
        { type: "save_weekdays", weekdays: "понеділок" },
        { type: "amend", field: "studentAge", value: 3 },
        { type: "save_time_range", timeRange: "зранку" },
      ],
      // Valid age all the way to proposing, THEN an amend drops it below 4.
      [
        { type: "save_name", name: "Тіна" },
        { type: "save_age", age: 9 },
        { type: "save_format", format: "individual" },
        { type: "skip_goal" },
        { type: "skip_tastes" },
        { type: "save_experience_comfort", experience: "ніякого", comfort: "акапела" },
        { type: "save_weekdays", weekdays: "понеділок" },
        { type: "save_time_range", timeRange: "зранку" },
        { type: "amend", field: "studentAge", value: 3 },
      ],
    ];

    for (const sequence of sequences) {
      const history = driveSequence(sequence);
      for (const step of history) {
        if (
          step.state.fields.studentAge !== undefined &&
          step.state.fields.studentAge < 4 &&
          step.state.conversationState !== "soft_decline"
        ) {
          // The ONLY acceptable conversationState while an age < 4 is on
          // record is "soft_decline" itself (the guardrail transition
          // in-flight) — it must never be one of PROPOSING_OR_LATER.
          expect(PROPOSING_OR_LATER).not.toContain(step.state.conversationState);
        }
      }
      const finalState = history[history.length - 1]?.state;
      const anyAgeBelowFour = sequence.some(
        (event) =>
          (event.type === "save_age" && event.age < 4) ||
          (event.type === "amend" && event.field === "studentAge" && (event.value as number) < 4),
      );
      if (anyAgeBelowFour) {
        expect(finalState?.conversationState).toBe("soft_decline");
      }
    }
  });
});

describe("transition() — scope/format detours are side-channel, never mutate conversationState", () => {
  // @trace FR-INTAKE-02
  // @trace BC-SCOPE-01
  // @trace BC-SCOPE-02
  it("save_format('instrument') returns detour 'scope_violation' with state byte-identical before/after", () => {
    const state = qualifying({ studentName: "Оксана", studentAge: 9 });

    const result = transition(state, { type: "save_format", format: "instrument" });

    expect(result.detour).toBe("scope_violation");
    expect(result.state).toBe(state);
    expect(result.state.conversationState).toBe("qualifying");
    expect(result.state.fields.format).toBeUndefined();
  });

  // @trace FR-INTAKE-02
  // @trace BC-FORMAT-01
  it("save_format('unsure') returns detour 'format_unsure' with state byte-identical before/after", () => {
    const state = qualifying({ studentName: "Оксана", studentAge: 9 });

    const result = transition(state, { type: "save_format", format: "unsure" });

    expect(result.detour).toBe("format_unsure");
    expect(result.state).toBe(state);
    expect(result.state.conversationState).toBe("qualifying");
    expect(result.state.fields.format).toBeUndefined();
  });
});

describe("transition() — amend mid-flow (FR-INTAKE-07)", () => {
  // @trace FR-INTAKE-07
  it("amend on studentAge (6 -> 7) from profiling re-validates and updates the field, conversationState unchanged", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Іван", studentAge: 6, format: "individual" },
    };

    const result = transition(state, { type: "amend", field: "studentAge", value: 7 });

    expect(result.error).toBeUndefined();
    expect(result.state.fields.studentAge).toBe(7);
    expect(result.state.conversationState).toBe("profiling");
  });

  // @trace FR-INTAKE-07
  it("an amend that drops age below 4 mid-profiling drives the same soft_decline transition a first-time violation would", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Іван", studentAge: 6, format: "individual" },
    };

    const result = transition(state, { type: "amend", field: "studentAge", value: 3 });

    expect(result.state.conversationState).toBe("soft_decline");
    expect(result.error).toBe("AGE_BELOW_MIN");
    expect(result.state.fields).toEqual({});
  });
});

describe("transition() — amend changes addressing (FR-INTAKE-07, BC-AGE-02)", () => {
  // @trace FR-INTAKE-07
  // @trace BC-AGE-02
  it("addressesParent flips when age is amended 9 -> 12, computed live off fields.studentAge, never stored separately", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Юля", studentAge: 9, format: "individual" },
    };

    expect(addressesParent(state.fields.studentAge as number)).toBe(true);

    const result = transition(state, { type: "amend", field: "studentAge", value: 12 });

    expect(result.state.fields.studentAge).toBe(12);
    // No `addressesParent`-shaped property is ever persisted on IntakeFields
    // — it is derived on demand, off whatever studentAge currently holds.
    expect(result.state.fields).not.toHaveProperty("addressesParent");
    expect(addressesParent(result.state.fields.studentAge as number)).toBe(false);
  });
});

// Regression coverage (review-gate finding #1, CRITICAL): the amend branch
// used to re-validate ONLY `studentAge` — every other amendable field,
// including `format` and `goalTag`, was written to `fields` VERBATIM, with
// no validator in the loop at all. That meant `amend_field({ field:
// "format", value: "instrument" })` — a model call bypassing its own tool
// schema, or a compromised call — wrote an out-of-scope instrument lesson
// straight into `fields.format`, skipping the exact
// scope_violation/format_unsure detour `save_format` enforces
// (BC-SCOPE-01/02, BC-FORMAT-01). The fix dispatches `amend`'s validator by
// `event.field`, exactly like a first-time `save_*` would, for every field
// that HAS an owning validator (`studentAge` -> `validateAge`, `format` ->
// `validateFormat`, `goalTag` -> the closed GoalTag enum). Free-text fields
// (studentName/goalText/tastes/dreamSong/experience/comfort/
// preferredWeekdays/preferredTimeRange) have no owning validator in this
// slice — verbatim write remains correct for those (design.md Decision 1's
// amend contract), so no test below covers a rejection path for them.
describe("transition() — amend re-validates format/goalTag, not just studentAge (review-gate finding #1)", () => {
  // @trace FR-INTAKE-07
  // @trace BC-SCOPE-01
  // @trace BC-SCOPE-02
  it("amend field:'format' value:'instrument' yields the scope_violation detour, state byte-identical, fields NEVER mutated", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Іван", studentAge: 9, format: "individual" },
    };
    // `AmendEvent`'s declared type narrows `field: "format"`'s `value` to
    // the already-valid `ValidFormat` ("individual" | "group") — exactly
    // the type-level assumption that let this bug hide. A real attempt to
    // smuggle "instrument" through only reaches the reducer with its static
    // type already cast away (mirrors `packages/agent/src/loop.ts`'s own
    // `amend_field` mapping, which casts through `unknown` for the same
    // reason: the model's raw tool-call input is never statically typed).
    const event = { type: "amend", field: "format", value: "instrument" } as unknown as IntakeEvent;

    const result = transition(state, event);

    expect(result.detour).toBe("scope_violation");
    expect(result.error).toBeUndefined();
    expect(result.state).toBe(state);
    expect(result.state.conversationState).toBe("profiling");
    expect(result.state.fields.format).toBe("individual"); // UNCHANGED — never overwritten with "instrument"
  });

  // @trace FR-INTAKE-07
  // @trace BC-FORMAT-01
  it("amend field:'format' value:'unsure' yields the format_unsure detour, fields NEVER mutated", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Іван", studentAge: 9, format: "individual" },
    };
    const event = { type: "amend", field: "format", value: "unsure" } as unknown as IntakeEvent;

    const result = transition(state, event);

    expect(result.detour).toBe("format_unsure");
    expect(result.state).toBe(state);
    expect(result.state.fields.format).toBe("individual");
  });

  // @trace FR-INTAKE-07
  it("amend field:'format' value:'group' (a genuinely valid amendment) succeeds and updates the field", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Іван", studentAge: 9, format: "individual" },
    };

    const result = transition(state, { type: "amend", field: "format", value: "group" });

    expect(result.detour).toBeNull();
    expect(result.error).toBeUndefined();
    expect(result.state.fields.format).toBe("group");
    expect(result.state.conversationState).toBe("profiling");
  });

  // @trace FR-INTAKE-07
  it("amend field:'goalTag' with a value outside the closed GoalTag enum is rejected, fields NEVER mutated", () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: {
        studentName: "Іван",
        studentAge: 9,
        format: "individual",
        goalTag: "hobby",
        goalText: "для задоволення",
      },
    };
    // Same "cast through unknown" shape as the format case above — a real
    // out-of-enum goalTag only ever reaches the reducer with its static
    // type already discarded (the model's raw tool input, or a bogus
    // button-callback payload upstream in packages/bot/src/pipeline.ts).
    const event = { type: "amend", field: "goalTag", value: "instrument_lessons" } as unknown as IntakeEvent;

    const result = transition(state, event);

    expect(result.error).toBeDefined();
    expect(result.state).toBe(state);
    expect(result.state.fields.goalTag).toBe("hobby"); // UNCHANGED
  });
});

describe("transition() — cancel (FR-INTAKE-07)", () => {
  // @trace FR-INTAKE-07
  it("cancel from awaiting_admin transitions conversationState to done", () => {
    const state: IntakeState = {
      conversationState: "awaiting_admin",
      fields: { studentName: "Марта", studentAge: 11, format: "group" },
    };

    const result = transition(state, { type: "cancel" });

    expect(result.state.conversationState).toBe("done");
    expect(result.error).toBeUndefined();
  });
});

describe("transition() — terminal-state rejection (FR-INTAKE-08)", () => {
  // @trace FR-INTAKE-08
  it("rejects any save_*/amend event on a done instance with TERMINAL_STATE, fields unchanged", () => {
    const done: IntakeState = {
      conversationState: "done",
      fields: { studentName: "Марта", studentAge: 11, format: "group" },
    };

    const saveAttempt = transition(done, { type: "save_name", name: "Інша дитина" });
    expect(saveAttempt.error).toBe("TERMINAL_STATE");
    expect(saveAttempt.state).toBe(done);

    const amendAttempt = transition(done, { type: "amend", field: "studentAge", value: 12 });
    expect(amendAttempt.error).toBe("TERMINAL_STATE");
    expect(amendAttempt.state).toBe(done);
    expect(amendAttempt.state.fields.studentAge).toBe(11);
  });
});

// Test-first (red): `offer_slots`/`pick_slot` are typed throwing stubs in
// transition()'s switch (booking-hitl tasks.md A.11's red half) — every
// case below is expected to FAIL (throw) against the stub until A.12
// implements the real field-ownership/index-bounds logic.
describe("transition() — offer_slots / pick_slot (booking-hitl design.md Decision 2)", () => {
  function proposing(fields: IntakeState["fields"] = {}): IntakeState {
    return { conversationState: "proposing", fields };
  }

  const SAMPLE_SLOTS: OfferedSlot[] = [
    { start: "2026-07-07T15:00", end: "2026-07-07T16:00" },
    { start: "2026-07-08T17:00", end: "2026-07-08T18:00" },
  ];

  // @trace FR-SLOT-01
  it("offer_slots from proposing records fields.offeredSlots, conversationState stays proposing", () => {
    const state = proposing();

    const result = transition(state, { type: "offer_slots", slots: SAMPLE_SLOTS });

    expect(result.error).toBeUndefined();
    expect(result.state.conversationState).toBe("proposing");
    expect(result.state.fields.offeredSlots).toEqual(SAMPLE_SLOTS);
  });

  // @trace FR-SLOT-01
  it("offer_slots from any OTHER non-terminal state is rejected FIELD_NOT_OWNED_BY_STATE, state unchanged", () => {
    const state = qualifying();

    const result = transition(state, { type: "offer_slots", slots: SAMPLE_SLOTS });

    expect(result.error).toBe("FIELD_NOT_OWNED_BY_STATE");
    expect(result.state).toBe(state);
  });

  // @trace FR-SLOT-02
  // @trace FR-HITL-03
  it("pick_slot with an index inside fields.offeredSlots's bounds moves proposing -> awaiting_admin (first arrival)", () => {
    const offered = transition(proposing(), { type: "offer_slots", slots: SAMPLE_SLOTS });
    expect(offered.state.conversationState).toBe("proposing");

    const result = transition(offered.state, { type: "pick_slot", slotIndex: 1 });

    expect(result.error).toBeUndefined();
    expect(result.state.conversationState).toBe("awaiting_admin");
  });

  // @trace FR-SLOT-02
  it("pick_slot with an out-of-range index is rejected INVALID_SLOT_INDEX, state/fields byte-identical", () => {
    const offered = transition(proposing(), { type: "offer_slots", slots: SAMPLE_SLOTS });

    const result = transition(offered.state, { type: "pick_slot", slotIndex: 5 });

    expect(result.error).toBe("INVALID_SLOT_INDEX");
    expect(result.state).toBe(offered.state);
  });

  // @trace FR-SLOT-02
  it("pick_slot called before any offer_slots (fields.offeredSlots undefined) is rejected INVALID_SLOT_INDEX", () => {
    const state = proposing();

    const result = transition(state, { type: "pick_slot", slotIndex: 0 });

    expect(result.error).toBe("INVALID_SLOT_INDEX");
    expect(result.state).toBe(state);
  });
});

describe("initialIntakeState() — returning lead / sibling isolation (FR-INTAKE-08)", () => {
  // @trace FR-INTAKE-08
  it("two independently-constructed IntakeState values never share fields", () => {
    const first = initialIntakeState();
    const second = initialIntakeState();

    expect(first).not.toBe(second);
    expect(first.fields).not.toBe(second.fields);
    expect(first.fields).toEqual({});
    expect(second.fields).toEqual({});

    // Advancing `first` through the reducer must never leak into `second` —
    // a fresh call always starts with empty fields regardless of any other
    // instance's history (child A confirmed, child B's request starts
    // clean).
    const advancedFirst = transition(first, { type: "save_name", name: "Дитина А" });
    expect(advancedFirst.state.fields.studentName).toBe("Дитина А");
    expect(second.fields.studentName).toBeUndefined();

    const freshThird = initialIntakeState();
    expect(freshThird.fields).toEqual({});
    expect(freshThird.fields.studentName).toBeUndefined();
  });
});
