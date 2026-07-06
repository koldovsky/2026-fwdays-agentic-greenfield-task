// Test-first per tasks.md 4.5.
//
// Two different things are pinned here, deliberately kept in one file
// because they are two halves of the SAME `@trace NFR-REL-01` requirement:
//
//   1. `ANTHROPIC_UNAVAILABLE_APOLOGY`'s CONTENT shape — a plain string
//      literal with no behaviour to fake (S1 `propose.ts`'s
//      `CALENDAR_UNAVAILABLE_APOLOGY` / S2 `copy.ts`'s guardrail-copy
//      precedent, tasks.md 2.4). These assertions are expected to be GREEN
//      already, immediately, against `apology.ts`'s real content — called
//      out explicitly as green-by-nature, not a red-discipline violation.
//   2. The LOOP-LEVEL BEHAVIOUR tasks.md 4.5 actually asks for: "a test
//      confirming the loop returns this constant (no crash, state
//      preserved) when ModelPort.send() rejects". This half IS genuinely
//      red right now: `loop.ts`'s `runIntakeTurn` is still a Not-implemented
//      throwing stub (tasks.md 4.4's red half), so calling it with a
//      rejecting `FakeModelPort` fails with an UNCAUGHT throw today, not
//      with the graceful apology-and-preserve-state behaviour the spec
//      requires. That failure IS the meaningful red signal for this test —
//      once `loop.ts` is implemented to catch the rejection and return the
//      apology, this same assertion turns green.
import { describe, expect, it } from "vitest";
import { ANTHROPIC_UNAVAILABLE_APOLOGY } from "./apology.ts";
import { runIntakeTurn, type LoopPorts } from "./loop.ts";
import { FakeModelPort } from "./testing/fake-model-port.ts";
import {
  createFakeReleaseHold,
  FakeBookingStorePort,
  FakeHoldStorePort,
  FakePersistencePort,
  FakeSlotsPort,
} from "./testing/fake-loop-ports.ts";
import { initialIntakeState } from "@kamerton/lib/src/intake/state-machine.ts";

const TECH_JARGON = ["api", "сервер", "помилка з'єднання"];
const PRESSURE_VOCABULARY = ["останнє місце", "тільки сьогодні", "поспішайте"];

describe("ANTHROPIC_UNAVAILABLE_APOLOGY content (BC-BRAND-01, BC-LANG-01)", () => {
  // @trace NFR-REL-01
  // @trace BC-BRAND-01
  it("contains no exclamation marks and no pressure vocabulary", () => {
    expect(ANTHROPIC_UNAVAILABLE_APOLOGY).not.toContain("!");
    const lowered = ANTHROPIC_UNAVAILABLE_APOLOGY.toLowerCase();
    for (const phrase of PRESSURE_VOCABULARY) {
      expect(lowered).not.toContain(phrase);
    }
  });

  // @trace NFR-REL-01
  it("never names the failure in technical terms (no 'API'/'сервер'/\"помилка з'єднання\")", () => {
    const lowered = ANTHROPIC_UNAVAILABLE_APOLOGY.toLowerCase();
    for (const term of TECH_JARGON) {
      expect(lowered).not.toContain(term);
    }
  });

  // @trace NFR-REL-01
  it("is a non-empty Ukrainian string, distinct from the calendar-unavailable apology's exact wording", () => {
    expect(ANTHROPIC_UNAVAILABLE_APOLOGY.length).toBeGreaterThan(0);
    // Same failure-class shape as S1's CALENDAR_UNAVAILABLE_APOLOGY (kind,
    // invites retrying, preserves data) but this slice's OWN constant, not
    // a re-export or copy-paste of the slots one.
    expect(ANTHROPIC_UNAVAILABLE_APOLOGY).not.toBe(
      "Вибачте, зараз не вдається перевірити розклад занять. Спробуйте, будь ласка, написати ще раз за кілька хвилин — ваші дані нікуди не зникли, ми продовжимо з того самого місця.",
    );
  });
});

describe("runIntakeTurn on an Anthropic call failure", () => {
  // @trace NFR-REL-01
  it("returns ANTHROPIC_UNAVAILABLE_APOLOGY, with state preserved and no crash, when ModelPort.send() rejects", async () => {
    const state = initialIntakeState();
    const model = new FakeModelPort([{ reject: new Error("simulated Anthropic API outage") }]);
    const ports: LoopPorts = {
      model,
      persistence: new FakePersistencePort(),
      bookingStore: new FakeBookingStorePort(),
      releaseHold: createFakeReleaseHold(),
      // booking-hitl tasks.md C.2 widened LoopPorts with two new ports; this
      // scenario (a ModelPort.send() rejection) never reaches propose_slots/
      // request_hold dispatch, so these are unscripted throwing-by-default
      // fakes (`FakeSlotsPort`/`FakeHoldStorePort`'s own "unavailable"
      // default) — present only so this fixture keeps compiling.
      slots: new FakeSlotsPort(),
      holdStore: new FakeHoldStorePort(),
    };

    const result = await runIntakeTurn({ state, message: "Привіт", ports });

    expect(result.reply).toBe(ANTHROPIC_UNAVAILABLE_APOLOGY);
    // The conversation state must survive intact — the lead's turn is not
    // lost, resumable on the very next message (NFR-REL-01).
    expect(result.state).toEqual(state);
    expect(result.toolCalls).toEqual([]);
  });
});
