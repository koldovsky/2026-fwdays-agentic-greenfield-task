// FR-FAQ-01 GROUNDING EVAL — "the agent answers lead questions about the
// school exclusively from `knowledge/school.md`, in Ukrainian, regardless of
// the question's language" (openspec/specs/kb-learning/spec.md, "KB-grounded
// FAQ answers"). A live behavioural probe, mirroring `fr-guard-01.eval.ts`/
// `fr-guard-02.eval.ts`'s shape but under the NEW `faq-grounding` dimension
// (kb-learning tasks.md H.2) rather than joining `guardrail-integrity`: this
// is not "does the agent refuse to invent" (that is FR-GUARD-02's job,
// `fr-guard-02.eval.ts`) but "when the KB DOES cover the question, is the
// reply actually faithful to it, and does it stay Ukrainian even when asked
// in another language (BC-LANG-01)?" — a distinct quality concern, so its
// own ratchet dimension per `evals/README.md`'s "pick dimensions
// deliberately" guidance.
//
// WHY A LIVE PROBE: whether every factual claim in a free Ukrainian-prose
// reply is "traceable to the knowledge base" is a reading-comprehension
// judgment over real model output, not something a unit test's
// `assertEquals` can check — the same reasoning `fr-guard-01.eval.ts`'s own
// header already lays out for its guardrail. This case drives real turns
// through `runIntakeTurn` with the REAL `ClaudeAgentModelPort`.
//
// `produce()` returns the RAW loop output (reply, tool names, resulting
// state, and the exact KB text used) — grading is the eval-judge's job
// (maker != checker), never this file's.

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

/** The REAL, currently-seeded `knowledge/school.md` text — same read path
 *  (`readKnowledgeBaseText`/`DEFAULT_KNOWLEDGE_BASE_PATH`) the production
 *  `packages/bot/src/pipeline.ts` caller uses, pinned into each case's
 *  output (`kbTextUsed`) so a fresh judge can compare the reply against
 *  exactly what the model saw. As of authoring: an entry describing the
 *  individual-lesson format (one-on-one, warmup, breath/technique work,
 *  repertoire suited to the student's voice and goal, ages 4+) and an entry
 *  stating lesson duration (individual 45 min, group 60 min). */
const realKbText = readKnowledgeBaseText(DEFAULT_KNOWLEDGE_BASE_PATH);

function freshLeadState() {
  return initialIntakeState();
}

/** Drives one real turn through `runIntakeTurn`/`ClaudeAgentModelPort` (live
 *  `claude` CLI round trip over the developer's subscription auth). See
 *  `fr-guard-02.eval.ts`'s own `runFaqProbe` for the full rationale of the
 *  wiring below — duplicated here (not imported) so each `.eval.ts` case
 *  file stays independently readable/runnable, matching this repo's
 *  existing one-case-file-per-requirement convention. */
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
    id: "eval-fr-faq-01-covered-question-in-ukrainian",
    trace: ["FR-FAQ-01"],
    dimension: "faq-grounding",
    capability: "kb-learning",
    scenario:
      // Spec's own worked example, verbatim (openspec/specs/kb-learning/spec.md,
      // "Question covered by the knowledge base": "як проходять індивідуальні
      // заняття?").
      "A lead asks, in Ukrainian, how individual lessons are conducted — a question " +
      "`knowledge/school.md`'s individual-lesson-format entry answers directly.",
    produce: () => runFaqProbe("Розкажіть, як проходять індивідуальні заняття?", realKbText),
    rubric: [
      "CRITICAL: every factual claim in the reply is traceable to kbTextUsed (one-on-one lesson with the teacher; vocal warmup; breath/technique work; repertoire chosen for the student's voice and goal; suitable for adults and children from age 4) — no invented detail about the format that kbTextUsed does not contain",
      "CRITICAL: the reply is in Ukrainian",
      'toolCalls contains "answer_faq" (the KB-covered logging tool)',
      "the reply reads as a natural, warm answer to the lead's actual question, not a verbatim copy-paste of the KB entry",
    ],
  },
  {
    id: "eval-fr-faq-01-covered-question-in-english",
    trace: ["FR-FAQ-01", "BC-LANG-01"],
    dimension: "faq-grounding",
    capability: "kb-learning",
    scenario:
      // Spec's own worked example, verbatim (openspec/specs/kb-learning/spec.md,
      // "Question asked in another language": "GIVEN knowledge/school.md
      // contains the answer to 'how long is a lesson?' WHEN a lead asks the
      // question in English THEN the agent answers from the knowledge base
      // AND the reply is in Ukrainian").
      "A lead asks, in ENGLISH, how long a lesson is — a question `knowledge/school.md`'s duration entry answers " +
      "directly (individual 45 min / group 60 min) — THEN the agent answers from the KB AND the reply is in " +
      "Ukrainian regardless of the question's language (BC-LANG-01).",
    produce: () => runFaqProbe("How long is a lesson?", realKbText),
    rubric: [
      "CRITICAL: the reply is in Ukrainian, even though the lead's question was in English",
      "CRITICAL: every duration figure stated is traceable to kbTextUsed (individual 45 хвилин, group 60 хвилин, or one of these if the reply narrows to one format) — no invented duration",
      'toolCalls contains "answer_faq", not "log_question" — the question IS covered by the KB, the language it was asked in does not change that',
    ],
  },
];

// @trace FR-FAQ-01, BC-LANG-01
