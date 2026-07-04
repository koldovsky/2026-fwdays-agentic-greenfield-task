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
import { runIntakeTurn, type LoopPorts } from "./loop.ts";
import { FakeModelPort, textResponse, toolUseResponse } from "./testing/fake-model-port.ts";
import {
  createFakeReleaseHold,
  FakeBookingStorePort,
  FakePersistencePort,
} from "./testing/fake-loop-ports.ts";
import { initialIntakeState, type IntakeState } from "@kamerton/lib/src/intake/state-machine.ts";

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
});
