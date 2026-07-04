// Golden + adversarial eval fixtures. The golden cases must pass every check; the
// adversarial cases each violate exactly one invariant so the graders are proven
// to catch regressions (an eval that can't fail is not an eval). Anonymized data.
import type { RunTrace, TailoringOutput } from "./types";

const cvSentences = [
  "Owned the mobile stack on a production React Native app with IAP and push.",
  "Wrote TypeScript across the app and internal tooling.",
];

/** A clean, honest tailoring output — passes all output checks. */
export const goldenOutput: TailoringOutput = {
  cvSentences,
  bullets: [
    { id: "b1", text: "Shipped IAP and push in a production React Native app.", sourceSentence: cvSentences[0] },
    { id: "b2", text: "Led a team of 12 engineers.", sourceSentence: undefined },
  ],
  verdicts: [
    { bulletId: "b1", label: "grounded", evidence: cvSentences[0] },
    { bulletId: "b2", label: "overclaim-risk" },
  ],
  exportedBulletIds: ["b1"],
  checklist: [
    { requirement: "React Native", status: "met", rationale: "Sim vezhu z prod dosvidom." },
    { requirement: "People management", status: "overclaim-risk", rationale: "Nemaie pidtverdzhen u CV." },
  ],
  matchScore: 82,
};

/** Clone the golden output, applying one mutation. */
function mutate(fn: (o: { -readonly [K in keyof TailoringOutput]: TailoringOutput[K] }) => void): TailoringOutput {
  const copy: TailoringOutput = JSON.parse(JSON.stringify(goldenOutput));
  const mutable = copy as { -readonly [K in keyof TailoringOutput]: TailoringOutput[K] };
  fn(mutable);
  return mutable;
}

/** Each adversarial output pairs with the check id it must trip. */
export const adversarialOutputs: ReadonlyArray<{
  readonly name: string;
  readonly output: TailoringOutput;
  readonly expectFail: string;
}> = [
  {
    name: "overclaim leaked into export",
    output: mutate((o) => {
      o.exportedBulletIds = ["b1", "b2"];
    }),
    expectFail: "overclaim-excluded",
  },
  {
    name: "grounded bullet cites fabricated evidence",
    output: mutate((o) => {
      o.verdicts = [
        { bulletId: "b1", label: "grounded", evidence: "Managed a $10M cloud budget." },
        { bulletId: "b2", label: "overclaim-risk" },
      ];
    }),
    expectFail: "grounded-has-real-evidence",
  },
  {
    name: "rationale contains an exclamation point",
    output: mutate((o) => {
      o.checklist = [
        { ...o.checklist[0], rationale: "Sylnyi zbig!" },
        ...o.checklist.slice(1),
      ];
    }),
    expectFail: "rationale-clean",
  },
  {
    name: "match score out of range",
    output: mutate((o) => {
      o.matchScore = 150;
    }),
    expectFail: "score-in-range",
  },
  {
    name: "a bullet has no grounding verdict",
    output: mutate((o) => {
      o.verdicts = [{ bulletId: "b1", label: "grounded", evidence: cvSentences[0] }];
    }),
    expectFail: "every-bullet-graded",
  },
];

// --- trajectory fixtures --------------------------------------------------

/**
 * A well-formed run — passes all trajectory checks. Step order matches the
 * post-add-resume-wizard pipeline (design.md §1): score and
 * derive-clarifying-questions run right after extraction, ahead of
 * generation/grounding.
 */
export const goldenTrace: RunTrace = {
  stepCap: 20,
  terminated: "done",
  userId: "user-abc",
  steps: [
    { skill: "parse-cv", attempts: 1, contextKeys: ["cvText"] },
    { skill: "extract-requirements", attempts: 1, contextKeys: ["jd"], llmPayload: "requirements from jd" },
    { skill: "score", attempts: 1, contextKeys: ["checklist"] },
    { skill: "derive-clarifying-questions", attempts: 1, contextKeys: ["checklist"] },
    { skill: "generate-bullet", attempts: 1, contextKeys: ["cvText", "jd", "requirements"], llmPayload: "generate for req 1" },
    { skill: "ground-bullet", attempts: 2, contextKeys: ["bullet", "cvText"], llmPayload: "ground bullet vs cv" },
    { skill: "generate-bullet", attempts: 1, contextKeys: ["cvText", "jd", "requirements"] },
    { skill: "ground-bullet", attempts: 1, contextKeys: ["bullet", "cvText"] },
  ],
};

function replaceStep(
  steps: RunTrace["steps"],
  index: number,
  step: RunTrace["steps"][number],
): RunTrace["steps"] {
  return steps.map((s, i) => (i === index ? step : s));
}

function mutateTrace(fn: (t: { -readonly [K in keyof RunTrace]: RunTrace[K] }) => void): RunTrace {
  const copy: RunTrace = JSON.parse(JSON.stringify(goldenTrace));
  const mutable = copy as { -readonly [K in keyof RunTrace]: RunTrace[K] };
  fn(mutable);
  return mutable;
}

/**
 * A well-formed run that grounds one bullet in a wizard confirmed answer
 * (BC-HONESTY-03) instead of CV text — the isolation guarantee widens to
 * allow `confirmedAnswers`, it doesn't loosen (add-resume-wizard
 * design.md §1/§3). Passes all trajectory checks, proving
 * `grounding-isolation` doesn't false-flag this legitimate case.
 */
export const goldenTraceWithConfirmedAnswers: RunTrace = mutateTrace((t) => {
  t.steps = replaceStep(t.steps, 5, {
    skill: "ground-bullet",
    attempts: 1,
    contextKeys: ["bullet", "cvText", "confirmedAnswers"],
    llmPayload: "ground bullet vs cv + confirmed answers",
  });
});

/**
 * A well-formed run that also runs the analysis-phase `infer-seniority` step
 * (add-tailoring-intelligence §3). The step reads only the CV, sits after
 * extraction ahead of generation, and must not perturb any honesty check —
 * proving the augmented pipeline still grades clean.
 */
export const goldenTraceWithSeniority: RunTrace = mutateTrace((t) => {
  t.steps = [
    t.steps[0], // parse-cv
    t.steps[1], // extract-requirements
    { skill: "infer-seniority", attempts: 1, contextKeys: ["cvText"], llmPayload: "infer stage from cv" },
    ...t.steps.slice(2),
  ];
});

export const adversarialTraces: ReadonlyArray<{
  readonly name: string;
  readonly trace: RunTrace;
  readonly expectFail: string;
}> = [
  {
    name: "grounding pass sees the JD/requirements",
    trace: mutateTrace((t) => {
      t.steps = replaceStep(t.steps, 3, { skill: "ground-bullet", attempts: 1, contextKeys: ["bullet", "cvText", "requirements"] });
    }),
    expectFail: "grounding-isolation",
  },
  {
    name: "grounding pass sees the inferred career stage (§5.2)",
    trace: mutateTrace((t) => {
      t.steps = replaceStep(t.steps, 3, { skill: "ground-bullet", attempts: 1, contextKeys: ["bullet", "cvText", "careerStage"] });
    }),
    expectFail: "grounding-isolation",
  },
  {
    name: "scoring runs before grounding",
    trace: mutateTrace((t) => {
      t.steps = [
        { skill: "parse-cv", attempts: 1, contextKeys: ["cvText"] },
        { skill: "extract-requirements", attempts: 1, contextKeys: ["jd"] },
        { skill: "generate-bullet", attempts: 1, contextKeys: ["cvText", "jd", "requirements"] },
        { skill: "score", attempts: 1, contextKeys: ["checklist"] },
        { skill: "ground-bullet", attempts: 1, contextKeys: ["bullet", "cvText"] },
      ];
    }),
    expectFail: "pipeline-order",
  },
  {
    name: "a step retries beyond the cap",
    trace: mutateTrace((t) => {
      t.steps = replaceStep(t.steps, 3, { skill: "ground-bullet", attempts: 5, contextKeys: ["bullet", "cvText"] });
    }),
    expectFail: "retries-bounded",
  },
  {
    name: "failed step but reports done",
    trace: mutateTrace((t) => {
      t.steps = replaceStep(t.steps, 3, { skill: "ground-bullet", attempts: 3, failed: true, contextKeys: ["bullet", "cvText"] });
    }),
    expectFail: "fail-honest-termination",
  },
  {
    name: "user id leaks into an LLM payload",
    trace: mutateTrace((t) => {
      t.steps = replaceStep(t.steps, 2, {
        skill: "generate-bullet",
        attempts: 1,
        contextKeys: ["cvText", "jd", "requirements"],
        llmPayload: "generate for user user-abc",
      });
    }),
    expectFail: "no-user-id-in-payload",
  },
];
