// Test-first (red): `loop.ts`'s `runIntakeTurn` body is a Not-implemented
// throwing stub (tasks.md 4.4's red half) — every test below is expected to
// FAIL against the stub, for the right reason (the stub's throw propagating
// out of `await runIntakeTurn(...)`), until 4.4's green half implements the
// real tool-dispatch logic. Same convention as section 2's red round
// (age.test.ts/format.test.ts/state-machine.test.ts before their own green
// passes): assertions are written against the SPECIFIED behaviour, not
// wrapped in a try/catch — a bare uncaught rejection is exactly what "red
// for the right reason" looks like here.
//
// Uses `FakeModelPort` (testing/fake-model-port.ts, real test infra) and the
// loop-port fakes (testing/fake-loop-ports.ts, real test infra) — never a
// live Anthropic call, never SQLite, never a live Google Calendar.
import { describe, expect, it } from "vitest";
import { MODEL_CONFIG } from "./model-port.ts";
import { runIntakeTurn, type BookingStorePort, type LoopPorts } from "./loop.ts";
import { FakeModelPort, textResponse, toolUseResponse } from "./testing/fake-model-port.ts";
import {
  createFakeReleaseHold,
  FakeBookingStorePort,
  FakeHoldStorePort,
  FakePersistencePort,
  FakeQuestionsPort,
  FakeSlotsPort,
} from "./testing/fake-loop-ports.ts";
import {
  initialIntakeState,
  type IntakeState,
  type OfferedSlot,
} from "@kamerton/lib/src/intake/state-machine.ts";
import { CALENDAR_UNAVAILABLE_APOLOGY } from "@kamerton/lib/src/slots/propose.ts";
import { QUESTION_LOGGING_UNAVAILABLE_APOLOGY } from "./apology.ts";
import {
  CANCELLED_CLOSING_COPY,
  DEFAULT_ACK_COPY,
  PROFILE_COMPLETE_CLOSING_COPY,
} from "@kamerton/lib/src/intake/questions.ts";

function makePorts(model: FakeModelPort, overrides: Partial<LoopPorts> = {}): LoopPorts {
  return {
    model,
    persistence: new FakePersistencePort(),
    bookingStore: new FakeBookingStorePort(),
    releaseHold: createFakeReleaseHold(),
    slots: new FakeSlotsPort(),
    holdStore: new FakeHoldStorePort(),
    ...overrides,
  };
}

describe("runIntakeTurn", () => {
  // @trace FR-INTAKE-01
  it("a scripted save_name tool-use response advances state and is deterministically logged regardless of the model's accompanying text", async () => {
    const state = initialIntakeState();
    const model = new FakeModelPort([
      toolUseResponse(
        "save_name",
        { name: "Оксана" },
        // The accompanying text deliberately contradicts the tool call —
        // the loop must trust the deterministic tool-result log, never the
        // model's own narration (ADR-0001 §5 analog).
        { text: "На жаль, зараз не можу це записати." },
      ),
    ]);
    const persistence = new FakePersistencePort();
    const ports = makePorts(model, { persistence });

    const result = await runIntakeTurn({ state, message: "Мене звати Оксана", ports });

    expect(result.state.fields.studentName).toBe("Оксана");
    expect(result.state.conversationState).toBe("qualifying");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]).toMatchObject({
      tool: "save_name",
      input: { name: "Оксана" },
      outcome: "applied",
    });
    expect(persistence.fieldSaves).toContainEqual({ studentName: "Оксана" });
  });

  // @trace FR-INTAKE-02
  // @trace BC-SCOPE-01
  // @trace BC-SCOPE-02
  it('a scripted save_format tool-use response carrying "instrument" is rejected by validateFormat before any state mutation (defense in depth)', async () => {
    const state: IntakeState = {
      conversationState: "qualifying",
      fields: { studentName: "Богдан", studentAge: 9 },
    };
    const model = new FakeModelPort([toolUseResponse("save_format", { format: "instrument" })]);
    const persistence = new FakePersistencePort();
    const ports = makePorts(model, { persistence });

    const result = await runIntakeTurn({ state, message: "А на піаніно вчите?", ports });

    expect(result.state.conversationState).toBe("qualifying");
    expect(result.state.fields.format).toBeUndefined();
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]).toMatchObject({
      tool: "save_format",
      outcome: "detour",
      detour: "scope_violation",
    });
    expect(persistence.fieldSaves).toEqual([]);
  });

  // @trace FR-GUARD-05
  it("a scripted plain-text (no tool-use) off-topic-shaped response is passed straight through to the reply, transition() is never invoked", async () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Богдан", studentAge: 9, format: "individual" },
    };
    const model = new FakeModelPort([
      textResponse(
        "Розуміємо ваш інтерес до цієї теми, але наша школа спеціалізується на вокалі. Повернімось до питання про мету занять — чого хотілося б досягти?",
      ),
    ]);
    const ports = makePorts(model);

    const result = await runIntakeTurn({
      state,
      message: "Що ви думаєте про останні вибори?",
      ports,
    });

    // Reference equality, not just deep equality — proves structurally that
    // no `transition()` call (and no new object graph) happened at all,
    // per design.md Decision 1's off-topic handling.
    expect(result.state).toBe(state);
    expect(result.toolCalls).toEqual([]);
    expect(result.reply).toContain("вокал");
  });

  // @trace FR-INTAKE-07
  it("a scripted cancel_request tool-use response drives both the cancel event AND the booking-release orchestration", async () => {
    const state: IntakeState = {
      conversationState: "awaiting_admin",
      fields: { studentName: "Богдан", studentAge: 9, format: "individual" },
    };
    const model = new FakeModelPort([toolUseResponse("cancel_request", {})]);
    const bookingStore = new FakeBookingStorePort({ id: 42, calendarEventId: "evt-42" });
    const releaseHold = createFakeReleaseHold();
    const ports = makePorts(model, { bookingStore, releaseHold });

    const result = await runIntakeTurn({
      state,
      message: "Скасуйте, будь ласка, заявку",
      ports,
    });

    expect(result.state.conversationState).toBe("done");
    expect(releaseHold.releasedEventIds).toEqual(["evt-42"]);
    expect(bookingStore.cancelledBookingIds).toEqual([42]);
    expect(result.toolCalls[0]).toMatchObject({ tool: "cancel_request", outcome: "applied" });
  });

  // @trace FR-INTAKE-07
  it("a scripted amend_field (age 6 -> 7) tool-use response re-validates and updates the persisted request row", async () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Богдан", studentAge: 6, format: "individual" },
    };
    const model = new FakeModelPort([toolUseResponse("amend_field", { field: "studentAge", value: 7 })]);
    const persistence = new FakePersistencePort();
    const ports = makePorts(model, { persistence });

    const result = await runIntakeTurn({
      state,
      message: "Насправді їй 7, а не 6",
      ports,
    });

    expect(result.state.fields.studentAge).toBe(7);
    expect(result.state.conversationState).toBe("profiling");
    expect(persistence.fieldSaves).toContainEqual({ studentAge: 7 });
  });

  // --- Live-Telegram bug A (docs/qa/intake-manual-smoke.md scenario 4, ------
  // --- CRITICAL): `amend_field.value` has no type constraint in tools.ts, --
  // --- so the model reliably sends a numeric-string age correction -------
  // Regression coverage: `value: "7"` (a JSON string, not a number) used to
  // flow straight through `toIntakeEvent`'s `amend_field` case into
  // `validateAge`, whose defensive `typeof age !== "number"` guard (a
  // deliberate, KEPT review-gate fix) then read the string as
  // "not a number" -> AGE_BELOW_MIN -> the lead was driven into terminal
  // `soft_decline` with fields wiped, even though 7 is a perfectly compliant
  // age. The fix coerces a numeric string to a number at the tool -> event
  // boundary (`toIntakeEvent`), ONLY for the `studentAge` amend path, BEFORE
  // it ever reaches `validateAge` — `validateAge`'s own type guard is left
  // untouched.
  // @trace FR-INTAKE-07
  // @trace FR-GUARD-04
  // @trace BC-AGE-01
  it('a scripted amend_field studentAge tool-use response carrying a numeric-STRING value ("7") is coerced to a number before validateAge — applied, not soft-declined', async () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Богдан", studentAge: 6, format: "individual" },
    };
    const model = new FakeModelPort([toolUseResponse("amend_field", { field: "studentAge", value: "7" })]);
    const persistence = new FakePersistencePort();
    const ports = makePorts(model, { persistence });

    const result = await runIntakeTurn({
      state,
      message: "Насправді їй 7, а не 6",
      ports,
    });

    expect(result.toolCalls[0]).toMatchObject({ tool: "amend_field", outcome: "applied" });
    expect(result.state.fields.studentAge).toBe(7);
    expect(result.state.conversationState).toBe("profiling");
    expect(result.state.conversationState).not.toBe("soft_decline");
    expect(persistence.fieldSaves).toContainEqual({ studentAge: 7 });
  });

  // Guardrail-preservation sibling of the test above: a genuinely
  // non-numeric amended age (e.g. a lead who "doesn't remember") must NOT be
  // coerced into something bogus by the fix — it must still be rejected by
  // the existing AGE_BELOW_MIN guardrail, exactly as before.
  // @trace FR-GUARD-04
  // @trace BC-AGE-01
  it("a scripted amend_field studentAge tool-use response carrying a non-numeric string is NOT coerced and still triggers AGE_BELOW_MIN", async () => {
    const state: IntakeState = {
      conversationState: "profiling",
      fields: { studentName: "Богдан", studentAge: 6, format: "individual" },
    };
    const model = new FakeModelPort([
      toolUseResponse("amend_field", { field: "studentAge", value: "не пам'ятаю" }),
    ]);
    const ports = makePorts(model);

    const result = await runIntakeTurn({ state, message: "Не пам'ятаю скільки їй", ports });

    expect(result.state.conversationState).toBe("soft_decline");
    expect(result.toolCalls[0]).toMatchObject({ tool: "amend_field", error: "AGE_BELOW_MIN" });
  });

  // --- review-gate finding #4 (CRITICAL/MAJOR): booking-release must not --
  // --- let an uncaught exception (Calendar/DB failure) crash the turn -----
  // Regression coverage: the `cancel_request` orchestration
  // (`ports.bookingStore.findPendingBookingForCurrentRequest()` /
  // `ports.releaseHold()` / `ports.bookingStore.markBookingCancelled()`) was
  // awaited with no try/catch around it — a Calendar failure (or a DB write
  // throwing) during the cancel path propagated straight out of
  // `runIntakeTurn()` as an unhandled rejection, which the bot's own
  // `handleUpdate()` had no boundary for either (finding #4's `packages/
  // bot/src/index.ts` half, covered separately since that file is pure
  // wiring, per its own header comment, and not unit-tested). The fix wraps
  // each tool-use block's dispatch in `runIntakeTurn`'s own loop: a thrown
  // error is logged server-side and this function falls back to
  // `CALENDAR_UNAVAILABLE_APOLOGY` (`@kamerton/lib/src/slots/propose.ts`,
  // already the deterministic Ukrainian copy for "the calendar couldn't be
  // reached") rather than letting the rejection escape — mirroring the
  // existing `ports.model.send()` failure handling above (`@trace
  // NFR-REL-01`).
  it("bookingStore.findPendingBookingForCurrentRequest() throwing during cancel does not propagate — returns CALENDAR_UNAVAILABLE_APOLOGY, prior state preserved by reference", async () => {
    const state: IntakeState = {
      conversationState: "awaiting_admin",
      fields: { studentName: "Богдан", studentAge: 9, format: "individual" },
    };
    const model = new FakeModelPort([toolUseResponse("cancel_request", {})]);
    const throwingBookingStore: BookingStorePort = {
      async findPendingBookingForCurrentRequest() {
        throw new Error("DB unavailable (simulated)");
      },
      async markBookingCancelled() {
        // never reached in this scenario
      },
    };
    const ports = makePorts(model, { bookingStore: throwingBookingStore });

    const result = await runIntakeTurn({ state, message: "Скасуйте, будь ласка", ports });

    expect(result.reply).toBe(CALENDAR_UNAVAILABLE_APOLOGY);
    // Reference equality — proves the turn bailed out BEFORE this block's
    // (already-persisted) state change was folded into the returned result,
    // the same "prove it structurally" discipline as the off-topic
    // pass-through test above.
    expect(result.state).toBe(state);
  });

  // @trace NFR-REL-01
  it("releaseHold() throwing during cancel (a Calendar failure) does not propagate — returns CALENDAR_UNAVAILABLE_APOLOGY", async () => {
    const state: IntakeState = {
      conversationState: "awaiting_admin",
      fields: { studentName: "Богдан", studentAge: 9, format: "individual" },
    };
    const model = new FakeModelPort([toolUseResponse("cancel_request", {})]);
    const bookingStore = new FakeBookingStorePort({ id: 42, calendarEventId: "evt-42" });
    const throwingReleaseHold = async (): Promise<void> => {
      throw new Error("Calendar unavailable (simulated)");
    };
    const ports = makePorts(model, { bookingStore, releaseHold: throwingReleaseHold });

    const result = await runIntakeTurn({ state, message: "Скасуйте, будь ласка", ports });

    expect(result.reply).toBe(CALENDAR_UNAVAILABLE_APOLOGY);
    expect(result.state).toBe(state);
    expect(bookingStore.cancelledBookingIds).toEqual([]); // never reached markBookingCancelled
  });

  // --- review-gate finding #5 (MINOR): "applied" must mean a genuine ------
  // --- reducer-approved mutation, never a pass-through tool -------------
  // Regression coverage: `propose_slots`/`request_hold` never reach
  // `transition()` at all (`toIntakeEvent` returns `null` for them by
  // design — not-yet-wired tools, see this file's own header comment) — yet
  // the tool-call log used to mark them `outcome: "applied"`, exactly the
  // same label a genuine `save_name` mutation gets. That is a mislabel, not
  // intended behaviour: "applied" must mean "the reducer accepted a
  // state/field mutation", so a tool the reducer never even saw gets its own
  // distinct outcome instead ("pass_through").
  // @trace FR-INTAKE-02 (defense-in-depth logging integrity, ADR-0001 §5 analog)

  // --- Live-Telegram bug B (docs/qa/intake-manual-smoke.md scenario 3, ----
  // --- MAJOR): the piano/instrument scope question never got the scope ----
  // --- explanation ---------------------------------------------------------
  // Regression coverage: for a scope question ("чи вчите на піаніно?") the
  // model reliably calls the DEDICATED `explain_scope` tool rather than
  // `save_format({format:"instrument"})`. `explain_scope`/`explain_format`
  // are stateless/deterministic explanations that never reach
  // `transition()` (`toIntakeEvent` returns `null` for them) — they used to
  // be logged as a bare `outcome: "pass_through"` with NO `detour`, so
  // `packages/bot/src/pipeline.ts`'s `guardrailOverrideFor` never saw a
  // `scope_violation`/`format_unsure` detour and fell back to the generic
  // "Дякую, я це записала." copy — telling the lead something was recorded
  // when nothing was, and never surfacing `SCOPE_EXPLANATION_COPY`/
  // `FORMAT_UNSURE_COPY`. The fix makes `applyToolUse` dispatch
  // `explain_scope`/`explain_format` with `outcome: "detour"` and the
  // MATCHING existing `Detour` value directly (reusing the existing detour
  // vocabulary and the existing pipeline override — no reducer mutation, no
  // new copy string) rather than leaving them a bare pass-through.
  // @trace BC-SCOPE-01
  // @trace BC-SCOPE-02
  // @trace FR-INTAKE-02
  it('a scripted explain_scope tool-use response never reaches transition() but is logged as a "detour" (scope_violation), state unchanged', async () => {
    const state = initialIntakeState();
    const model = new FakeModelPort([toolUseResponse("explain_scope", {})]);
    const persistence = new FakePersistencePort();
    const ports = makePorts(model, { persistence });

    const result = await runIntakeTurn({ state, message: "А на гітарі вчите?", ports });

    expect(result.state).toBe(state); // stateless explanation — no mutation happened at all
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]).toMatchObject({
      tool: "explain_scope",
      outcome: "detour",
      detour: "scope_violation",
    });
    expect(result.toolCalls[0]!.outcome).not.toBe("applied");
    expect(persistence.fieldSaves).toEqual([]);
  });

  // Symmetric sibling: `explain_format` is the exact same bug class for the
  // format-unsure detour.
  // @trace FR-INTAKE-02
  it('a scripted explain_format tool-use response never reaches transition() but is logged as a "detour" (format_unsure), state unchanged', async () => {
    const state = initialIntakeState();
    const model = new FakeModelPort([toolUseResponse("explain_format", {})]);
    const persistence = new FakePersistencePort();
    const ports = makePorts(model, { persistence });

    const result = await runIntakeTurn({ state, message: "Не знаю, який формат обрати", ports });

    expect(result.state).toBe(state); // stateless explanation — no mutation happened at all
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]).toMatchObject({
      tool: "explain_format",
      outcome: "detour",
      detour: "format_unsure",
    });
    expect(result.toolCalls[0]!.outcome).not.toBe("applied");
    expect(persistence.fieldSaves).toEqual([]);
  });

  // @trace TC-STACK-02
  // @trace NFR-UX-01
  it("the ModelPort.send() call the loop makes always carries MODEL_CONFIG (thinking disabled, claude-sonnet-5)", async () => {
    const state = initialIntakeState();
    const model = new FakeModelPort([
      textResponse("Вітаємо! Як звати учня чи ученицю, яку записуємо на пробне заняття?"),
    ]);
    const ports = makePorts(model);

    await runIntakeTurn({ state, message: "Привіт", ports });

    expect(model.lastCall?.config).toEqual(MODEL_CONFIG);
  });

  // --- Remediation: review-gate finding cluster "the model never receives a
  // --- system prompt or any conversation context — each turn is
  // --- context-free" (CRITICAL) + "addressesParent is a dead pure function,
  // --- never wired into the model's context" (MAJOR).
  // Regression coverage: `runIntakeTurn` used to call `ports.model.send()`
  // with only `messages`/`TOOLS`/`MODEL_CONFIG` — no `system` argument at
  // all, so every turn reached the model with zero voice/guardrail/state
  // context. The fix threads `buildSystemPrompt(state)` (system-prompt.ts)
  // through as `send()`'s 4th argument, unconditionally, every turn.
  describe("system prompt wiring (buildSystemPrompt, @trace BC-BRAND-01, @trace BC-AGE-02)", () => {
    // @trace BC-BRAND-01
    it("every send() call carries a non-empty system string with a DESIGN.md voice marker, in Ukrainian", async () => {
      const state = initialIntakeState();
      const model = new FakeModelPort([
        textResponse("Вітаємо! Як звати учня чи ученицю, яку записуємо на пробне заняття?"),
      ]);
      const ports = makePorts(model);

      await runIntakeTurn({ state, message: "Привіт", ports });

      const system = model.lastCall?.system;
      expect(system).toBeTruthy();
      expect(system).toContain("Kind refusals: say no warmly, then offer the nearest yes.");
      expect(system).toContain("завжди відповідайте українською");
    });

    // @trace FR-INTAKE-02
    it("the system reflects the CURRENT conversationState and names the single next needed field", async () => {
      const state: IntakeState = {
        conversationState: "qualifying",
        fields: { studentName: "Богдан" },
      };
      const model = new FakeModelPort([toolUseResponse("save_age", { age: 9 })]);
      const ports = makePorts(model);

      await runIntakeTurn({ state, message: "Йому дев'ять", ports });

      const system = model.lastCall?.system;
      expect(system).toContain('"qualifying"');
      expect(system).toContain("studentAge");
    });

    // @trace BC-AGE-02
    it("addressesParent is wired live: studentAge < 10 instructs parent-addressing", async () => {
      const state: IntakeState = {
        conversationState: "profiling",
        fields: { studentName: "Богдан", studentAge: 7, format: "individual" },
      };
      const model = new FakeModelPort([toolUseResponse("skip_goal", {})]);
      const ports = makePorts(model);

      await runIntakeTurn({ state, message: "Пропустимо мету", ports });

      expect(model.lastCall?.system).toContain("БАТЬКІВ");
    });

    // @trace BC-AGE-02
    it("addressesParent is wired live: studentAge >= 10 instructs direct student-addressing", async () => {
      const state: IntakeState = {
        conversationState: "profiling",
        fields: { studentName: "Оксана", studentAge: 14, format: "individual" },
      };
      const model = new FakeModelPort([toolUseResponse("skip_goal", {})]);
      const ports = makePorts(model);

      await runIntakeTurn({ state, message: "Пропустимо мету", ports });

      expect(model.lastCall?.system).toContain("БЕЗПОСЕРЕДНЬО");
    });

    // @trace TC-STACK-02
    it("MODEL_CONFIG (config, the 3rd argument) is still passed unconditionally alongside the new system argument", async () => {
      const state = initialIntakeState();
      const model = new FakeModelPort([toolUseResponse("save_name", { name: "Оксана" })]);
      const ports = makePorts(model);

      await runIntakeTurn({ state, message: "Мене звати Оксана", ports });

      expect(model.lastCall?.config).toEqual(MODEL_CONFIG);
      expect(model.lastCall?.system).toBeTruthy();
    });
  });

  // --- Conversational-flow bugfix (live Telegram testing, S2 intake): -----
  // --- the CODE, not the model, must own asking the next question ---------
  // BUG: a bare `save_*` tool-use response with NO accompanying text used to
  // leave `reply` as the empty string, and `packages/bot/src/pipeline.ts`'s
  // own `EMPTY_NARRATION_FALLBACK_COPY` ("Дякую, я це записала.") was the
  // lead's ENTIRE reply — no next question, the conversation stalled. The
  // fix: `runIntakeTurn` now assembles a deterministic ack+question (or
  // closing note) reply itself whenever a turn's tool dispatch actually
  // recorded a field or advanced/ended the conversation, so the bot can
  // never leave the lead with nothing to answer.
  describe("reply assembly owns asking the next question deterministically (conversational-flow bugfix)", () => {
    // @trace FR-INTAKE-02
    it("a save_name tool-use with NO accompanying text advances state AND the reply asks the deterministic age question next", async () => {
      const state = initialIntakeState();
      const model = new FakeModelPort([toolUseResponse("save_name", { name: "Оксана" })]);
      const ports = makePorts(model);

      const result = await runIntakeTurn({ state, message: "Мене звати Оксана", ports });

      expect(result.state.conversationState).toBe("qualifying");
      expect(result.reply).toContain(DEFAULT_ACK_COPY);
      expect(result.reply).toContain("Скільки років");
      // Never a dangling bare ack with nothing else to answer.
      expect(result.reply).not.toBe(DEFAULT_ACK_COPY);
    });

    // @trace FR-INTAKE-02
    it("a save_age tool-use with NO accompanying text asks the deterministic format question next", async () => {
      const state: IntakeState = {
        conversationState: "qualifying",
        fields: { studentName: "Богдан" },
      };
      const model = new FakeModelPort([toolUseResponse("save_age", { age: 9 })]);
      const ports = makePorts(model);

      const result = await runIntakeTurn({ state, message: "Йому дев'ять", ports });

      expect(result.state.fields.studentAge).toBe(9);
      expect(result.reply).toContain("формат");
    });

    // @trace FR-INTAKE-03
    it("a save_format tool-use that completes qualifying asks the merged days+time question (collecting) next", async () => {
      const state: IntakeState = {
        conversationState: "qualifying",
        fields: { studentName: "Богдан", studentAge: 9 },
      };
      const model = new FakeModelPort([toolUseResponse("save_format", { format: "individual" })]);
      const ports = makePorts(model);

      const result = await runIntakeTurn({ state, message: "Індивідуальні, будь ласка", ports });

      // Profiling is dropped (2026-07-09) — qualifying completion advances
      // straight to collecting, whose merged step asks days AND time together.
      expect(result.state.conversationState).toBe("collecting");
      expect(result.reply).toContain("дні тижня");
    });

    // @trace FR-GUARD-05
    it("an off-topic text-only turn (no tool-use) replies with ONLY the model's text — no deterministic question is appended", async () => {
      const state: IntakeState = {
        conversationState: "profiling",
        fields: { studentName: "Богдан", studentAge: 9, format: "individual" },
      };
      const offTopicReply =
        "Розуміємо ваш інтерес до цієї теми, але наша школа спеціалізується на вокалі. Повернімось до питання про мету занять — чого хотілося б досягти?";
      const model = new FakeModelPort([textResponse(offTopicReply)]);
      const ports = makePorts(model);

      const result = await runIntakeTurn({
        state,
        message: "Що ви думаєте про останні вибори?",
        ports,
      });

      expect(result.reply).toBe(offTopicReply);
    });

    // @trace FR-INTAKE-07
    it("a cancel_request tool-use reaching the terminal done state replies with the deterministic closing note, never a dangling ack", async () => {
      const state: IntakeState = {
        conversationState: "awaiting_admin",
        fields: { studentName: "Богдан", studentAge: 9, format: "individual" },
      };
      const model = new FakeModelPort([toolUseResponse("cancel_request", {})]);
      const ports = makePorts(model);

      const result = await runIntakeTurn({ state, message: "Скасуйте, будь ласка", ports });

      expect(result.state.conversationState).toBe("done");
      expect(result.reply).toBe(CANCELLED_CLOSING_COPY);
      expect(result.reply.length).toBeGreaterThan(0);
    });

    // @trace FR-INTAKE-06
    it("a save_time_range tool-use that completes collecting (reaches proposing) replies with the profile-complete closing note", async () => {
      const state: IntakeState = {
        conversationState: "collecting",
        fields: {
          studentName: "Оксана",
          studentAge: 9,
          format: "individual",
          preferredWeekdays: "вівторок, четвер",
        },
      };
      const model = new FakeModelPort([toolUseResponse("save_time_range", { timeRange: "після 16:00" })]);
      const ports = makePorts(model);

      const result = await runIntakeTurn({ state, message: "Після 16:00", ports });

      expect(result.state.conversationState).toBe("proposing");
      expect(result.reply).toBe(PROFILE_COMPLETE_CLOSING_COPY);
    });

    // @trace FR-INTAKE-01
    it("a pure save_* turn uses the deterministic ack (NOT the model's own narration) + next question — the model's follow-up question is dropped so it is never asked twice in one message", async () => {
      const state = initialIntakeState();
      const model = new FakeModelPort([
        // The model narrates its OWN follow-up question — exactly the live-bot
        // shape that used to double with the deterministic one.
        toolUseResponse("save_name", { name: "Оксана" }, { text: "Записала: Оксана. А скільки Оксані років?" }),
      ]);
      const ports = makePorts(model);

      const result = await runIntakeTurn({ state, message: "Оксана", ports });

      // Deterministic ack, not the model's narration; the age question appears
      // exactly once (from `nextLeadFacingStep`, not the dropped narration).
      expect(result.reply.startsWith(DEFAULT_ACK_COPY)).toBe(true);
      expect(result.reply).not.toContain("А скільки Оксані років?");
      expect(result.reply).toContain("Скільки років");
    });

    // @trace BC-LANG-01
    it("the deterministic reply is Ukrainian-only (no stray Latin-script narration)", async () => {
      const state = initialIntakeState();
      const model = new FakeModelPort([toolUseResponse("save_name", { name: "Оксана" })]);
      const ports = makePorts(model);

      const result = await runIntakeTurn({ state, message: "Мене звати Оксана", ports });

      expect(result.reply).toMatch(/^[^a-zA-Z]*$/);
    });
  });

  // ---------------------------------------------------------------------
  // booking-hitl tasks.md C.3 (design.md Decision 2) — RED round.
  // `applyToolUse`'s `propose_slots`/`request_hold` branches are NOT
  // implemented yet (tasks.md C.2's own instruction: "no behaviour change
  // yet"); `toIntakeEvent` still returns `null` for both tool names, so
  // both fall through to the existing `"pass_through"` no-op path. Every
  // assertion below is therefore expected to FAIL against today's code, for
  // the right reason — it asserts the port was called / the state changed /
  // a specific outcome+error was logged, none of which happens yet.
  // ---------------------------------------------------------------------
  describe("propose_slots / request_hold tool dispatch (booking-hitl design.md Decision 2, tasks.md C.3 — RED)", () => {
    function proposingState(overrides: Partial<IntakeState["fields"]> = {}): IntakeState {
      return {
        conversationState: "proposing",
        fields: {
          studentName: "Оксана",
          studentAge: 9,
          format: "individual",
          preferredWeekdays: "вівторок, четвер",
          preferredTimeRange: "після 17:00",
          ...overrides,
        },
      };
    }

    const SAMPLE_OFFERED_SLOTS: OfferedSlot[] = [
      { start: "2026-07-14T17:00", end: "2026-07-14T18:00" },
      { start: "2026-07-16T17:00", end: "2026-07-16T18:00" },
    ];

    // @trace FR-SLOT-01
    it("a propose_slots tool-use call with a VALID weekdays/timeWindow input calls validatePreferences then ports.slots.proposeSlots, dispatching offer_slots on {status:'ok'}", async () => {
      const state = proposingState();
      const slots = new FakeSlotsPort({ status: "ok", slots: SAMPLE_OFFERED_SLOTS });
      const persistence = new FakePersistencePort();
      const model = new FakeModelPort([
        toolUseResponse("propose_slots", {
          weekdays: ["Tue", "Thu"],
          timeWindow: { start: "17:00", end: "20:00" },
        }),
      ]);
      const ports = makePorts(model, { persistence, slots });

      const result = await runIntakeTurn({ state, message: "Вівторок і четвер після 17:00", ports });

      expect(slots.calls).toEqual([{ weekdays: ["Tue", "Thu"], timeWindow: { start: "17:00", end: "20:00" } }]);
      expect(result.state.fields.offeredSlots).toEqual(SAMPLE_OFFERED_SLOTS);
      expect(result.state.conversationState).toBe("proposing");
      expect(persistence.fieldSaves).toContainEqual({ offeredSlots: SAMPLE_OFFERED_SLOTS });
      expect(result.toolCalls[0]).toMatchObject({ tool: "propose_slots", outcome: "applied" });
    });

    // @trace FR-SLOT-01
    it("a propose_slots tool-use call with an INVALID input (empty weekdays) is rejected by validatePreferences BEFORE ports.slots.proposeSlots is ever called", async () => {
      const state = proposingState();
      const slots = new FakeSlotsPort({ status: "ok", slots: SAMPLE_OFFERED_SLOTS });
      const model = new FakeModelPort([
        toolUseResponse("propose_slots", {
          weekdays: [],
          timeWindow: { start: "10:00", end: "20:00" },
        }),
      ]);
      const ports = makePorts(model, { slots });

      const result = await runIntakeTurn({ state, message: "Коли завгодно", ports });

      expect(slots.calls).toEqual([]); // defense in depth — never reached
      expect(result.state).toBe(state); // no mutation happened at all
      expect(result.toolCalls[0]).toMatchObject({ tool: "propose_slots", outcome: "rejected" });
      expect(result.toolCalls[0]!.outcome).not.toBe("applied");
    });

    // @trace FR-SLOT-02 — a specific-date propose ("завтра" resolved by the
    // model): the concrete `date` is passed through to the slots port, and the
    // weekday validator is SKIPPED (the date is the constraint), so an empty
    // weekdays filler does NOT reject the call.
    it("a propose_slots call carrying a concrete `date` passes it through and is NOT rejected for empty weekdays", async () => {
      const state = proposingState();
      const slots = new FakeSlotsPort({ status: "ok", slots: SAMPLE_OFFERED_SLOTS });
      const model = new FakeModelPort([
        toolUseResponse("propose_slots", {
          weekdays: [],
          timeWindow: { start: "10:00", end: "20:00" },
          date: "2026-07-15",
        }),
      ]);
      const ports = makePorts(model, { slots });

      const result = await runIntakeTurn({ state, message: "Можна завтра?", ports, today: "2026-07-14" });

      expect(slots.calls).toEqual([
        { weekdays: [], timeWindow: { start: "10:00", end: "20:00" }, date: "2026-07-15" },
      ]);
      expect(result.toolCalls[0]).toMatchObject({ tool: "propose_slots", outcome: "applied" });
    });

    it("a propose_slots call with a malformed `date` drops the date and falls back to weekday validation", async () => {
      const state = proposingState();
      const slots = new FakeSlotsPort({ status: "ok", slots: SAMPLE_OFFERED_SLOTS });
      const model = new FakeModelPort([
        toolUseResponse("propose_slots", { weekdays: [], timeWindow: { start: "10:00", end: "20:00" }, date: "завтра" }),
      ]);
      const ports = makePorts(model, { slots });

      const result = await runIntakeTurn({ state, message: "завтра", ports, today: "2026-07-14" });

      // Malformed date ignored -> weekday path -> empty weekdays rejected before the port.
      expect(slots.calls).toEqual([]);
      expect(result.toolCalls[0]).toMatchObject({ tool: "propose_slots", outcome: "rejected" });
    });

    // @trace NFR-REL-01
    it("a propose_slots call whose port resolves {status:'unavailable'} returns the calendar-unavailable apology, state unchanged", async () => {
      const state = proposingState();
      const slots = new FakeSlotsPort({ status: "unavailable", apology: CALENDAR_UNAVAILABLE_APOLOGY });
      const model = new FakeModelPort([
        toolUseResponse("propose_slots", {
          weekdays: ["Tue"],
          timeWindow: { start: "17:00", end: "20:00" },
        }),
      ]);
      const ports = makePorts(model, { slots });

      const result = await runIntakeTurn({ state, message: "Вівторок після 17:00", ports });

      expect(result.reply).toBe(CALENDAR_UNAVAILABLE_APOLOGY);
      expect(result.state).toBe(state);
    });

    // @trace FR-SLOT-02
    it("a request_hold tool-use call with a slotIndex OUT OF BOUNDS for currentState.fields.offeredSlots is rejected INVALID_SLOT_INDEX WITHOUT ever calling ports.holdStore.holdSlot", async () => {
      const state = proposingState({ offeredSlots: SAMPLE_OFFERED_SLOTS });
      const holdStore = new FakeHoldStorePort({ status: "held", bookingId: 1 });
      const model = new FakeModelPort([toolUseResponse("request_hold", { slotIndex: 5 })]);
      const ports = makePorts(model, { holdStore });

      const result = await runIntakeTurn({ state, message: "Другий слот", ports });

      expect(holdStore.calls).toEqual([]);
      expect(result.state).toBe(state);
      expect(result.toolCalls[0]).toMatchObject({
        tool: "request_hold",
        outcome: "rejected",
        error: "INVALID_SLOT_INDEX",
      });
    });

    // @trace FR-SLOT-02
    // @trace FR-HITL-03
    it("a request_hold tool-use call with a valid index whose port resolves {status:'held'} commits pick_slot (proposing -> awaiting_admin), persists state, logs 'applied'", async () => {
      const state = proposingState({ offeredSlots: SAMPLE_OFFERED_SLOTS });
      const holdStore = new FakeHoldStorePort({ status: "held", bookingId: 99 });
      const persistence = new FakePersistencePort();
      const model = new FakeModelPort([toolUseResponse("request_hold", { slotIndex: 0 })]);
      const ports = makePorts(model, { holdStore, persistence });

      const result = await runIntakeTurn({ state, message: "Перший слот, будь ласка", ports });

      expect(holdStore.calls).toEqual([{ slotIndex: 0, offeredSlots: SAMPLE_OFFERED_SLOTS }]);
      expect(result.state.conversationState).toBe("awaiting_admin");
      expect(persistence.stateSaves).toContainEqual("awaiting_admin");
      expect(result.toolCalls[0]).toMatchObject({ tool: "request_hold", outcome: "applied" });
    });

    // Baseline `slots` spec's own hold-race scenario, consumed here (not
    // re-specified): a fresh collision at the moment of the hold attempt.
    it("a request_hold tool-use call whose port resolves {status:'collision'} does NOT change state (same reference), logs 'rejected' with a collision signal the pipeline layer can react to", async () => {
      const state = proposingState({ offeredSlots: SAMPLE_OFFERED_SLOTS });
      const holdStore = new FakeHoldStorePort({ status: "collision" });
      const model = new FakeModelPort([toolUseResponse("request_hold", { slotIndex: 0 })]);
      const ports = makePorts(model, { holdStore });

      const result = await runIntakeTurn({ state, message: "Перший слот, будь ласка", ports });

      expect(holdStore.calls).toEqual([{ slotIndex: 0, offeredSlots: SAMPLE_OFFERED_SLOTS }]);
      expect(result.state).toBe(state); // SAME reference — transition()'s state-changing branch never ran
      expect(result.toolCalls[0]).toMatchObject({ tool: "request_hold", outcome: "rejected" });
      expect(result.toolCalls[0]!.error).toBe("SLOT_COLLISION");
    });
  });

  // ---------------------------------------------------------------------
  // kb-learning tasks.md C.8 (design.md Decision 4) — RED round.
  // `applyToolUse`'s `answer_faq`/`log_question` branches are NOT
  // implemented yet (tasks.md C.7's own instruction: "type contract only,
  // no behaviour change yet") — `toIntakeEvent` still returns `null` for
  // both tool names, so both fall through to the existing generic
  // `"pass_through"` no-op path (the SAME path `propose_slots`/
  // `request_hold` fell through to before booking-hitl's own C.3 wired
  // them). Every assertion below is therefore expected to FAIL against
  // today's code, for the right reason — `ports.questions` is never called,
  // and the logged outcome is `"pass_through"`, never `"logged"`.
  // ---------------------------------------------------------------------
  describe("answer_faq / log_question tool dispatch (kb-learning design.md Decision 4, tasks.md C.8 — RED)", () => {
    // @trace FR-KB-01
    it("an answer_faq tool-use call invokes ports.questions.logAnsweredFromKb with the question text, logs outcome 'logged', and NEVER calls transition() (state is the SAME reference)", async () => {
      const state = initialIntakeState();
      const questions = new FakeQuestionsPort();
      const model = new FakeModelPort([
        toolUseResponse(
          "answer_faq",
          { question: "Скільки триває індивідуальне заняття?" },
          { text: "Індивідуальне заняття триває 45 хвилин." },
        ),
      ]);
      const ports = makePorts(model, { questions });

      const result = await runIntakeTurn({
        state,
        message: "Скільки триває індивідуальне заняття?",
        ports,
      });

      expect(questions.answeredFromKb).toEqual(["Скільки триває індивідуальне заняття?"]);
      expect(result.toolCalls[0]).toMatchObject({ tool: "answer_faq", outcome: "logged" });
      expect(result.state).toBe(state); // no transition() call at all — same reference
    });

    // @trace FR-KB-01
    // @trace FR-FAQ-02
    it("a log_question tool-use call invokes ports.questions.logUnanswered with the question text, logs outcome 'logged', and NEVER calls transition() (state is the SAME reference)", async () => {
      const state = initialIntakeState();
      const questions = new FakeQuestionsPort();
      const model = new FakeModelPort([
        toolUseResponse(
          "log_question",
          { question: "Чи є у вас парковка?" },
          { text: "Уточню це в адміністраторки і повернуся з відповіддю." },
        ),
      ]);
      const ports = makePorts(model, { questions });

      const result = await runIntakeTurn({ state, message: "Чи є у вас парковка?", ports });

      expect(questions.unanswered).toEqual(["Чи є у вас парковка?"]);
      expect(result.toolCalls[0]).toMatchObject({ tool: "log_question", outcome: "logged" });
      expect(result.state).toBe(state);
    });

    // @trace FR-FAQ-01
    // design.md Decision 4's "logged ≠ applied" rule.
    it("a PURE FAQ turn (only answer_faq/log_question called) returns the model's own narrated text VERBATIM as reply — NOT the deterministic ack+next-question composer", async () => {
      const state = initialIntakeState();
      const questions = new FakeQuestionsPort();
      const narration = "Індивідуальне заняття триває 45 хвилин і коштує 600 грн.";
      const model = new FakeModelPort([
        toolUseResponse("answer_faq", { question: "Скільки коштує заняття?" }, { text: narration }),
      ]);
      const ports = makePorts(model, { questions });

      const result = await runIntakeTurn({ state, message: "Скільки коштує заняття?", ports });

      // Pinned together with the outcome assertion: a PURE FAQ turn must be
      // dispatched via the `"logged"` outcome (never `"applied"`,
      // `"pass_through"`) for `hasAppliedToolCall` to stay false and the
      // ack+next-question composer to never run.
      expect(result.toolCalls[0]).toMatchObject({ tool: "answer_faq", outcome: "logged" });
      expect(result.reply).toBe(narration);
      expect(result.reply).not.toContain(DEFAULT_ACK_COPY);
    });

    // Regression pin: a MIXED turn (a genuine field-save PLUS a
    // log_question/answer_faq call in the same response) is UNCHANGED by
    // this new dispatch — the deterministic ack+next-question composer still
    // runs (driven by the field-save's own "applied" outcome), with the
    // model's own FAQ-plus-ack narration as its prefix.
    // @trace FR-FAQ-02
    it("a MIXED turn (save_format applied AND log_question logged in the same response) still produces the deterministic ack+next-question reply, with the model's narration as the ack prefix", async () => {
      // Uses save_format (a LIVE mandatory-flow tool) rather than the dropped
      // save_tastes: completing qualifying advances to collecting, whose merged
      // days+time question is what the deterministic next-question appends.
      const state: IntakeState = {
        conversationState: "qualifying",
        fields: { studentName: "Богдан", studentAge: 9 },
      };
      const questions = new FakeQuestionsPort();
      const narration = "Дякую! До речі, щодо знижок — уточню це в адміністраторки.";
      // A single Anthropic response CAN carry multiple content blocks (one
      // text block plus several tool_use blocks) — built here as a raw
      // `ModelResponse` literal rather than via `toolUseResponse()` (this
      // package's own test-infra builder only ever attaches ONE tool_use
      // block per call), so both `save_format` and `log_question` are
      // dispatched from the SAME model turn, exactly as the bullet names.
      const model = new FakeModelPort([
        {
          content: [
            { type: "text", text: narration },
            { type: "tool_use", id: "tool-1", name: "save_format", input: { format: "individual" } },
            {
              type: "tool_use",
              id: "tool-2",
              name: "log_question",
              input: { question: "яка у вас знижка на двох дітей" },
            },
          ],
        },
      ]);
      const ports = makePorts(model, { questions });

      const result = await runIntakeTurn({ state, message: "Індивідуальні, а ще яка у вас знижка?", ports });

      expect(result.toolCalls).toContainEqual(expect.objectContaining({ tool: "save_format", outcome: "applied" }));
      expect(result.toolCalls).toContainEqual(expect.objectContaining({ tool: "log_question", outcome: "logged" }));
      expect(questions.unanswered).toEqual(["яка у вас знижка на двох дітей"]);
      expect(result.reply.startsWith(narration)).toBe(true);
      expect(result.reply).not.toBe(narration); // the deterministic next-question is appended, not bare narration
    });

    // @trace NFR-REL-01
    it("a QuestionsPort rejection (answer_faq) gets its OWN question-appropriate apology, NOT the calendar one — state preserved by reference", async () => {
      // Deliberately retargeted per review-gate finding d (Fix 4, MAJOR/tone):
      // `applyToolUse`'s shared catch used to return
      // `CALENDAR_UNAVAILABLE_APOLOGY` for ANY dispatch failure, including a
      // `QuestionsPort` (DB-write) failure while logging an FAQ question —
      // wrongly telling a lead who merely asked a question that the SCHEDULE
      // is broken (BC-BRAND-01/BC-LANG-01 kind-tone). This test now pins the
      // dedicated `QUESTION_LOGGING_UNAVAILABLE_APOLOGY` constant instead —
      // a deliberate behaviour change, not a silent edit — while the
      // calendar path's own wording (asserted elsewhere in this file) stays
      // unchanged.
      const state = initialIntakeState();
      const questions = new FakeQuestionsPort(new Error("DB unavailable (simulated)"));
      const model = new FakeModelPort([
        toolUseResponse("answer_faq", { question: "Скільки коштує заняття?" }, { text: "600 грн." }),
      ]);
      const ports = makePorts(model, { questions });

      const result = await runIntakeTurn({ state, message: "Скільки коштує заняття?", ports });

      expect(result.reply).toBe(QUESTION_LOGGING_UNAVAILABLE_APOLOGY);
      expect(result.reply).not.toBe(CALENDAR_UNAVAILABLE_APOLOGY);
      expect(result.state).toBe(state);
    });

    // @trace NFR-REL-01
    it("a QuestionsPort rejection (log_question) also gets the question-appropriate apology, state preserved by reference", async () => {
      const state = initialIntakeState();
      const questions = new FakeQuestionsPort(new Error("DB unavailable (simulated)"));
      const model = new FakeModelPort([
        toolUseResponse(
          "log_question",
          { question: "Чи є знижка для двох дітей?" },
          { text: "Уточню це в адміністраторки і повернуся з відповіддю." },
        ),
      ]);
      const ports = makePorts(model, { questions });

      const result = await runIntakeTurn({ state, message: "Чи є знижка для двох дітей?", ports });

      expect(result.reply).toBe(QUESTION_LOGGING_UNAVAILABLE_APOLOGY);
      expect(result.state).toBe(state);
    });

    // @trace NFR-REL-01
    it("a log_question tool-use call with a null input never throws — logs an empty question string (review-gate Fix 5, defensive guard)", async () => {
      const state = initialIntakeState();
      const questions = new FakeQuestionsPort();
      const model = new FakeModelPort([
        toolUseResponse("log_question", null as unknown as Record<string, unknown>),
      ]);
      const ports = makePorts(model, { questions });

      const result = await runIntakeTurn({ state, message: "???", ports });

      expect(result.toolCalls).toContainEqual(expect.objectContaining({ tool: "log_question", outcome: "logged" }));
      expect(questions.unanswered).toEqual([""]);
    });
  });
});

// CodeRabbit review-batch fixes (PR #2): closed-tool discipline, hold
// preflight, and time-window validation on the date path.
describe("runIntakeTurn — CodeRabbit review-batch fixes", () => {
  const SLOTS: OfferedSlot[] = [
    { start: "2026-07-08T10:00", end: "2026-07-08T11:00" },
    { start: "2026-07-08T11:00", end: "2026-07-08T12:00" },
  ];

  // #8 FR-GUARD-01: a tool name outside the offered set never dispatches.
  it("rejects a dropped tool name (save_goal) as UNKNOWN_TOOL without dispatch or mutation", async () => {
    const state: IntakeState = { conversationState: "qualifying", fields: { studentName: "Оля", studentAge: 9 } };
    const persistence = new FakePersistencePort();
    const model = new FakeModelPort([toolUseResponse("save_goal", { goalTag: "stage", goalText: "сцена" })]);
    const ports = makePorts(model, { persistence });

    const result = await runIntakeTurn({ state, message: "хочу на сцену", ports });

    expect(result.toolCalls[0]).toMatchObject({ tool: "save_goal", outcome: "rejected", error: "UNKNOWN_TOOL" });
    expect(result.state.conversationState).toBe("qualifying");
    expect(persistence.fieldSaves).toHaveLength(0);
  });

  // #11: a valid index but wrong state must reject BEFORE the external hold.
  it("request_hold in a non-proposing state rejects WITHOUT creating a hold (no orphaned calendar event)", async () => {
    const state: IntakeState = {
      conversationState: "awaiting_admin",
      fields: { studentName: "Оля", studentAge: 9, offeredSlots: SLOTS },
    };
    const holdStore = new FakeHoldStorePort({ status: "held", bookingId: 1 });
    const model = new FakeModelPort([toolUseResponse("request_hold", { slotIndex: 0 })]);
    const ports = makePorts(model, { holdStore });

    const result = await runIntakeTurn({ state, message: "беру перший", ports });

    expect(result.toolCalls[0]).toMatchObject({ tool: "request_hold", outcome: "rejected" });
    expect(holdStore.calls).toHaveLength(0); // holdSlot NEVER called -> no orphaned hold
    expect(result.state.conversationState).toBe("awaiting_admin");
  });

  // #10: the date path still validates a PROVIDED time window.
  it("propose_slots with a date and a MALFORMED time window is rejected before the calendar is called", async () => {
    const state: IntakeState = { conversationState: "proposing", fields: { studentName: "Оля", studentAge: 9 } };
    const slots = new FakeSlotsPort({ status: "ok", slots: SLOTS });
    const model = new FakeModelPort([
      toolUseResponse("propose_slots", { weekdays: ["Mon"], timeWindow: { start: "18:00", end: "10:00" }, date: "2026-07-08" }),
    ]);
    const ports = makePorts(model, { slots });

    const result = await runIntakeTurn({ state, message: "у вівторок після 18", ports });

    expect(result.toolCalls[0]).toMatchObject({ tool: "propose_slots", outcome: "rejected", error: "INVALID_TIME_RANGE" });
    expect(slots.calls).toHaveLength(0);
  });

  // #10: an EMPTY window on the date path is the "any time that day" signal.
  it("propose_slots with a date and an EMPTY time window still proposes (lead named only a day)", async () => {
    const state: IntakeState = { conversationState: "proposing", fields: { studentName: "Оля", studentAge: 9 } };
    const slots = new FakeSlotsPort({ status: "ok", slots: SLOTS });
    const model = new FakeModelPort([
      toolUseResponse("propose_slots", { weekdays: ["Mon"], timeWindow: { start: "", end: "" }, date: "2026-07-08" }),
    ]);
    const ports = makePorts(model, { slots });

    const result = await runIntakeTurn({ state, message: "можна завтра?", ports });

    expect(slots.calls).toHaveLength(1);
    expect(slots.calls[0]).toMatchObject({ date: "2026-07-08" });
    expect(result.toolCalls[0]).toMatchObject({ tool: "propose_slots", outcome: "applied" });
  });
});
