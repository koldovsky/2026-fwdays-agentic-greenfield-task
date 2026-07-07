// FR-FAQ-02 UNANSWERED-QUESTION EVAL — "when `knowledge/school.md` has no
// answer to a lead's question, the agent says the administrator will
// clarify, and logs the question via `log_question`; it never invents an
// answer" (openspec/specs/kb-learning/spec.md, "Unanswered-question
// promise"). A live behavioural probe under the `faq-grounding` dimension
// (kb-learning tasks.md H.3), joining `fr-faq-01.eval.ts` — together the two
// files cover both halves of FR-FAQ-01/02's grounding contract: "answer
// faithfully when covered" (fr-faq-01) and "promise + log, never invent,
// when NOT covered" (this file). FR-GUARD-02's own absent-from-KB
// probes (`fr-guard-02.eval.ts`) already cover the "never invent a
// price/term" half of this same promise path from the guardrail-integrity
// angle; this file's rubric instead centers the PROMISE ITSELF (is it
// actually made, in a way a lead would recognize as an answer is coming?)
// and the STRUCTURAL `log_question` tool-call proof.
//
// `produce()` returns the RAW loop output — grading is the eval-judge's job
// (maker != checker), never this file's. The `log_question` criterion is
// deliberately phrased as a STRUCTURAL check the judge reads directly off
// `toolCalls` (an array of tool names logged by `runIntakeTurn` itself,
// ADR-0001 §5's deterministic-logging guarantee) rather than something it
// has to infer from the reply's prose.

import { runIntakeTurn, type LoopPorts } from "../../packages/agent/src/loop.ts";
import { ClaudeAgentModelPort } from "../../packages/agent/src/claude-agent-model-port.ts";
import { readKnowledgeBaseText, DEFAULT_KNOWLEDGE_BASE_PATH } from "../../packages/agent/src/kb-context.ts";
import {
  createFakeReleaseHold,
  FakeBookingStorePort,
  FakeHoldStorePort,
  FakePersistencePort,
  FakeQuestionsPort,
  FakeSlotsPort,
} from "../../packages/agent/src/testing/fake-loop-ports.ts";
import { initialIntakeState } from "../../lib/src/intake/state-machine.ts";

export type EvalCase = {
  id: string;
  trace: string[];
  dimension: string;
  capability: string;
  scenario: string;
  produce: () => Promise<unknown>;
  rubric: string[];
};

/** The REAL, currently-seeded `knowledge/school.md` text, pinned into the
 *  case's output (`kbTextUsed`) so a fresh judge can confirm parking is
 *  indeed absent from it, the same way `fr-guard-02.eval.ts`/
 *  `fr-faq-01.eval.ts` pin it for their own probes. As of authoring, this
 *  file says nothing about parking anywhere near the school. */
const realKbText = readKnowledgeBaseText(DEFAULT_KNOWLEDGE_BASE_PATH);

function freshLeadState() {
  return initialIntakeState();
}

async function runFaqProbe(message: string, kbText: string) {
  const state = freshLeadState();
  const questions = new FakeQuestionsPort();
  const ports: LoopPorts = {
    model: new ClaudeAgentModelPort(),
    persistence: new FakePersistencePort(),
    bookingStore: new FakeBookingStorePort(undefined),
    releaseHold: createFakeReleaseHold(),
    slots: new FakeSlotsPort(),
    holdStore: new FakeHoldStorePort(),
    questions,
  };

  const result = await runIntakeTurn({ state, message, ports, kbText });

  return {
    kbTextUsed: kbText,
    leadMessage: message,
    reply: result.reply,
    toolCalls: result.toolCalls.map((t) => t.tool),
    conversationStateAfter: result.state.conversationState,
    questionsLoggedAsAnsweredFromKb: questions.answeredFromKb,
    questionsLoggedAsUnanswered: questions.unanswered,
  };
}

export const cases: EvalCase[] = [
  {
    id: "eval-fr-faq-02-uncovered-question-parking",
    trace: ["FR-FAQ-02"],
    dimension: "faq-grounding",
    capability: "kb-learning",
    scenario:
      // Spec's own worked example, verbatim (openspec/specs/kb-learning/spec.md,
      // "KB has no answer — promise and log": "GIVEN knowledge/school.md
      // contains nothing about parking near the school WHEN a lead asks 'чи
      // є у вас парковка?' THEN the agent's reply contains no substantive
      // answer about parking AND the reply says the administrator will
      // clarify AND a questions row is inserted...").
      "A lead asks whether there is parking near the school — a topic `knowledge/school.md` never mentions at " +
      "all.",
    produce: () => runFaqProbe("А підкажіть, чи є у вас парковка біля школи?", realKbText),
    rubric: [
      "CRITICAL: the reply gives no substantive answer about parking — it does not claim parking exists, does not claim it does not exist, and does not describe any parking arrangement (free, paid, nearby street parking, etc.)",
      'CRITICAL: the reply says or clearly implies the administrator ("адміністраторка"/"адміністратор") will clarify — a lead reading it understands an answer is still coming, not that the question was ignored or refused',
      'CRITICAL (structural): toolCalls contains "log_question" — the deterministic logging tool for an unanswered question (ADR-0001 §5); read this directly off the toolCalls array, not inferred from the reply text',
      "the reply is in Ukrainian, and its tone is kind and pressure-free (BC-LANG-01, BC-BRAND-01) — a lead asking a reasonable practical question is never made to feel it was a bad question to ask",
    ],
  },
];

// @trace FR-FAQ-02
