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
  FakePersistencePort,
} from "./testing/fake-loop-ports.ts";
import { initialIntakeState, type IntakeState } from "@kamerton/lib/src/intake/state-machine.ts";
import { CALENDAR_UNAVAILABLE_APOLOGY } from "@kamerton/lib/src/slots/propose.ts";

function makePorts(model: FakeModelPort, overrides: Partial<LoopPorts> = {}): LoopPorts {
  return {
    model,
    persistence: new FakePersistencePort(),
    bookingStore: new FakeBookingStorePort(),
    releaseHold: createFakeReleaseHold(),
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
  // Regression coverage: `explain_scope`/`explain_format`/`propose_slots`/
  // `request_hold` never reach `transition()` at all (`toIntakeEvent`
  // returns `null` for them by design — they are deterministic/
  // stateless explanations or not-yet-wired tools, see this file's own
  // header comment) — yet the tool-call log used to mark them
  // `outcome: "applied"`, exactly the same label a genuine `save_name`
  // mutation gets. That is a mislabel, not intended behaviour: "applied"
  // must mean "the reducer accepted a state/field mutation", so a tool the
  // reducer never even saw gets its own distinct outcome instead.
  // @trace FR-INTAKE-02 (defense-in-depth logging integrity, ADR-0001 §5 analog)
  it('a scripted explain_scope tool-use response (never dispatched to transition()) is logged with outcome "pass_through", not "applied"', async () => {
    const state = initialIntakeState();
    const model = new FakeModelPort([toolUseResponse("explain_scope", {})]);
    const persistence = new FakePersistencePort();
    const ports = makePorts(model, { persistence });

    const result = await runIntakeTurn({ state, message: "А на гітарі вчите?", ports });

    expect(result.state).toBe(state); // no mutation happened at all
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]).toMatchObject({ tool: "explain_scope", outcome: "pass_through" });
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
});
