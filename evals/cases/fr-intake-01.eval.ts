// FR-INTAKE-01 TERSE-ANSWER EVAL — "a short reply IS the answer; the agent
// saves it and advances, never re-greeting or re-asking the same field."
//
// WHY THIS IS A LIVE PROBE, NOT A UNIT TEST: the state machine already proves
// STRUCTURALLY that `save_name` is accepted straight from `greeting` and
// advances to `qualifying` (`lib/src/intake/state-machine.test.ts`,
// `next-field.test.ts`). What a static assertion CANNOT prove is whether the
// MODEL, handed a terse lead message like «Саша» while the conversation is
// still in `greeting`, actually EMITS `save_name` — or whether it re-greets
// and re-asks the name instead (the real defect observed on the live bot:
// request stuck in `greeting`, `student_name` null, the intro repeated).
// The agent is given only the current `IntakeState` plus this single message
// (no transcript replay — a documented deferred follow-up in `loop.ts`), so
// the ONLY signal telling the model that a bare «Саша» answers the pending
// name question is the dynamic-block instruction from
// `lib/src/intake/next-field.ts`. This eval grades that behaviour under the
// real model, mirroring `fr-guard-01/02`'s live-probe shape.
//
// `produce()` deliberately returns the RAW loop output (reply text + tool
// names + field saves + resulting conversationState) — grading is the
// eval-judge's job (maker != checker), never this file's.

import { runIntakeTurn, type LoopPorts } from "../../packages/agent/src/loop.ts";
import { ClaudeAgentModelPort } from "../../packages/agent/src/claude-agent-model-port.ts";
import {
  createFakeReleaseHold,
  FakeBookingStorePort,
  FakeHoldStorePort,
  FakePersistencePort,
  FakeQuestionsPort,
  FakeSlotsPort,
} from "../../packages/agent/src/testing/fake-loop-ports.ts";
import { initialIntakeState, type IntakeState } from "../../lib/src/intake/state-machine.ts";
import type { ModelMessage } from "../../packages/agent/src/model-port.ts";

export type EvalCase = {
  id: string;
  trace: string[];
  dimension: string;
  capability: string;
  scenario: string;
  produce: () => Promise<unknown>;
  rubric: string[];
};

/** Drives one real turn through `runIntakeTurn`/`ClaudeAgentModelPort` (a live
 *  `claude` CLI round trip over the developer's subscription auth, never
 *  `FakeModelPort`) from the given `state` with the given `message`, and
 *  returns exactly what a fresh eval-judge needs: the reply, the deterministic
 *  tool-call log (names only), the field patches actually persisted this turn,
 *  and the resulting conversation state. Every port is a scripted double —
 *  the probed turns collect a single field, so none of the calendar/booking
 *  ports should be reached, but they are wired anyway so a surprising tool
 *  call resolves deterministically instead of crashing the probe. No `kbText`
 *  is supplied (these are intake turns, not FAQ turns) — `runIntakeTurn`
 *  defaults it to an explicitly-empty knowledge base. */
async function runIntakeProbe(state: IntakeState, message: string, history: ModelMessage[] = []) {
  const persistence = new FakePersistencePort();
  const ports: LoopPorts = {
    model: new ClaudeAgentModelPort(),
    persistence,
    bookingStore: new FakeBookingStorePort(undefined),
    releaseHold: createFakeReleaseHold(),
    slots: new FakeSlotsPort(),
    holdStore: new FakeHoldStorePort(),
    questions: new FakeQuestionsPort(),
  };

  const result = await runIntakeTurn({ state, message, ports, history });

  return {
    leadMessage: message,
    priorTurns: history,
    conversationStateBefore: state.conversationState,
    reply: result.reply,
    toolCalls: result.toolCalls.map((t) => t.tool),
    fieldSaves: persistence.fieldSaves,
    conversationStateAfter: result.state.conversationState,
  };
}

export const cases: EvalCase[] = [
  {
    id: "eval-fr-intake-01-terse-name-in-greeting",
    trace: ["FR-INTAKE-01", "FR-INTAKE-08", "BC-BRAND-01"],
    dimension: "intake-flow",
    capability: "intake",
    scenario:
      "The conversation is in the opening `greeting` state (the bot has just greeted and asked for the student's " +
      "name). The lead answers with a bare first name — «Саша» — exactly as a real person answers a 'what's the " +
      "name?' question. This bare name IS the answer to the pending name field.",
    produce: () => runIntakeProbe(initialIntakeState(), "Саша"),
    rubric: [
      'CRITICAL: toolCalls contains "save_name" — the bare name is saved, not treated as small talk',
      'CRITICAL: fieldSaves records a studentName patch whose value is the lead\'s name ("Саша" / "Саша" normalized) — the exact name the lead gave',
      'CRITICAL: conversationStateAfter is "qualifying" — the turn advanced out of "greeting"; it did NOT stay in "greeting"',
      "CRITICAL: the reply does NOT re-ask for the student's name and does NOT repeat the opening greeting — it accepts the name and moves the conversation forward (e.g. asks the next field, the age)",
      "the reply is in Ukrainian, kind and pressure-free (BC-LANG-01, BC-BRAND-01)",
    ],
  },
  {
    id: "eval-fr-intake-01-terse-format-in-qualifying",
    trace: ["FR-INTAKE-01", "FR-INTAKE-02"],
    dimension: "intake-flow",
    capability: "intake",
    scenario:
      "Name and age are already collected; the conversation is in `qualifying` and the pending field is the lesson " +
      "format. The lead answers tersely — «груповий» — a bare one-word choice that IS the answer to the format " +
      "question (BC-SCOPE: individual vs group).",
    produce: () =>
      runIntakeProbe(
        { conversationState: "qualifying", fields: { studentName: "Саша", studentAge: 9 } },
        "груповий",
      ),
    rubric: [
      'CRITICAL: toolCalls contains "save_format" — the bare choice is saved, not re-asked',
      'CRITICAL: fieldSaves records a format patch with value "group" — the one-word answer «груповий» is mapped to the group format',
      'CRITICAL: conversationStateAfter is "collecting" — saving the last qualifying field advances STRAIGHT to collecting (the MVP is mandatory-only, the former "profiling" stage is dropped); it did NOT stay in "qualifying"',
      "CRITICAL: the reply does NOT re-ask which format the lead wants — it accepts «груповий» and moves forward",
      "the reply is in Ukrainian, kind and pressure-free (BC-LANG-01, BC-BRAND-01)",
    ],
  },
  {
    id: "eval-fr-intake-01-merged-name-and-age-in-one-turn",
    trace: ["FR-INTAKE-01", "FR-INTAKE-02"],
    dimension: "intake-flow",
    capability: "intake",
    scenario:
      "Step 1 of the mandatory-only 5-step intake asks name AND age together. The lead answers both in one terse " +
      "message — «Саша, 7» — orienting the agent: it should record BOTH facts this turn and move on to the format " +
      "question, never re-asking for a name or age it already has.",
    produce: () => runIntakeProbe(initialIntakeState(), "Саша, 7"),
    rubric: [
      'CRITICAL: toolCalls contains BOTH "save_name" and "save_age" — the agent extracts both facts from the single answer, not just one',
      'CRITICAL: fieldSaves capture studentName "Саша" and studentAge 7 (as an integer)',
      "CRITICAL: the reply does NOT re-ask for the name or the age — it moves forward (e.g. asks the lesson format)",
      "the reply is in Ukrainian, kind and pressure-free (BC-LANG-01, BC-BRAND-01)",
    ],
  },
];

// @trace FR-INTAKE-01, FR-INTAKE-02, FR-INTAKE-08, BC-BRAND-01
