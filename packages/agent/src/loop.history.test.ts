// loop.ts conversation-history threading (root fix for the "no conversation
// history" deferred TODO). Written FIRST (red): `runIntakeTurn` must accept an
// OPTIONAL `history` (prior turns) and send it to the model BEFORE the current
// turn's user message, so the model can accumulate facts a lead gives across
// several terse turns (the experienceComfort loop) — while a caller that
// passes no `history` keeps behaving byte-for-byte as before (a single
// current-turn user message).

import { describe, it, expect } from "vitest";
import { runIntakeTurn, type LoopPorts } from "./loop.ts";
import { FakeModelPort, toolUseResponse } from "./testing/fake-model-port.ts";
import {
  createFakeReleaseHold,
  FakeBookingStorePort,
  FakeHoldStorePort,
  FakePersistencePort,
  FakeQuestionsPort,
  FakeSlotsPort,
} from "./testing/fake-loop-ports.ts";
import type { IntakeState } from "@kamerton/lib/src/intake/state-machine.ts";

function portsWith(model: FakeModelPort): LoopPorts {
  return {
    model,
    persistence: new FakePersistencePort(),
    bookingStore: new FakeBookingStorePort(undefined),
    releaseHold: createFakeReleaseHold(),
    slots: new FakeSlotsPort(),
    holdStore: new FakeHoldStorePort(),
    questions: new FakeQuestionsPort(),
  };
}

const PROFILING: IntakeState = {
  conversationState: "profiling",
  fields: { studentName: "Саша", studentAge: 9, format: "individual", goalTag: "hobby", goalText: "", tastes: "поп" },
};

describe("runIntakeTurn conversation history", () => {
  it("sends prior turns BEFORE the current message when history is supplied", async () => {
    const model = new FakeModelPort([
      toolUseResponse("save_experience_comfort", { experience: "Немає", comfort: "Соромиться" }),
    ]);
    const history = [
      { role: "assistant" as const, content: "Чи є досвід співу і наскільки комфортно?" },
      { role: "user" as const, content: "Немає" },
      { role: "assistant" as const, content: "А наскільки комфортно співати?" },
    ];

    await runIntakeTurn({ state: PROFILING, message: "Соромиться", ports: portsWith(model), history });

    expect(model.lastCall?.messages).toEqual([
      ...history,
      { role: "user", content: "Соромиться" },
    ]);
  });

  it("sends only the current message when no history is supplied (backward-compatible)", async () => {
    const model = new FakeModelPort([
      toolUseResponse("save_experience_comfort", { experience: "Немає", comfort: "Соромиться" }),
    ]);

    await runIntakeTurn({ state: PROFILING, message: "Соромиться", ports: portsWith(model) });

    expect(model.lastCall?.messages).toEqual([{ role: "user", content: "Соромиться" }]);
  });
});
