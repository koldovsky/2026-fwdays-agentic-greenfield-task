// Unit tests for generateGroundedCoverLetter (T5 §3.1–3.3).
// All tests use an in-memory LlmProvider double — no live LLM, no
// ANTHROPIC_API_KEY required. The real parsers run unchanged; only the
// network call is replaced (TC-PURE-01, honesty-eval pattern).
//
// Behaviors covered (FR-COVERLETTER-01/02, BC-HONESTY-01/02, NFR-OBS-01):
//  - grounded path: supported verdict + no unsupported claims → returns output
//  - returns null on generation parse failure (malformed JSON)
//  - returns null on verdict parse failure (malformed JSON)
//  - returns null when supported=false
//  - returns null when unsupportedClaims is non-empty (even if supported=true)
//  - returns null when provider throws on generation call
//  - returns null when provider throws on verification call
//  - verification prompt receives ONLY paragraphs+cvSentences+confirmedAnswers
//    (NOT requirements/careerStage) — isolation assertion (BC-HONESTY-01/03)
import { describe, expect, it } from "vitest";

import type { LlmProvider, Prompt } from "@/shared/lib/llm";

import { generateGroundedCoverLetter } from "./generate-grounded-letter";

// --- Fixtures ---------------------------------------------------------------

const CV_SENTENCES = [
  "Побудував платіжну систему на React протягом двох кварталів.",
  "Керував командою з трьох бекенд-розробників.",
];

const REQUIREMENTS = [
  { id: "r1", text: "React experience", importance: "must-have" as const, keywords: ["react"] },
  { id: "r2", text: "Team leadership", importance: "nice-to-have" as const, keywords: ["leadership"] },
];

/**
 * The approved quality fixture: a grounded cover-letter paragraph
 * backed by the CV sentences above. This is the "user's approved example
 * letter as the quality fixture" referenced in task 3.4.
 */
const GROUNDED_PARAGRAPHS = [
  "Протягом двох кварталів я збудував платіжну систему на React, що забезпечило надійний досвід для команди.",
  "У тій же ролі я координував роботу трьох бекенд-розробників, забезпечуючи узгодженість між сервісами.",
];

/** Valid generation response — `{"paragraphs":[...]}`. */
function coverLetterResponse(paragraphs: string[]): string {
  return JSON.stringify({ paragraphs });
}

/** Valid verification verdict response. */
function verdictResponse(supported: boolean, unsupportedClaims: string[] = []): string {
  return JSON.stringify({ supported, unsupportedClaims });
}

// --- Minimal LlmProvider double ---------------------------------------------
// Uses a call counter so the two complete() calls can return different values
// without a full classification layer.

function makeProvider(
  genResponse: string | (() => never),
  verificationResponse: string | (() => never),
): LlmProvider & { calls: Prompt[] } {
  const calls: Prompt[] = [];
  let callIndex = 0;
  return {
    calls,
    async complete(prompt: Prompt): Promise<string> {
      calls.push(prompt);
      const idx = callIndex++;
      if (idx === 0) {
        if (typeof genResponse === "function") genResponse();
        return genResponse as string;
      }
      if (typeof verificationResponse === "function") verificationResponse();
      return verificationResponse as string;
    },
    async *stream(): AsyncIterable<string> {
      yield "";
    },
  };
}

function throwingProvider(throwOnCall: "generation" | "verification"): LlmProvider {
  let callIndex = 0;
  return {
    async complete(): Promise<string> {
      const idx = callIndex++;
      if (throwOnCall === "generation" && idx === 0) {
        throw new Error("fake_throw:generation");
      }
      if (throwOnCall === "verification" && idx === 1) {
        throw new Error("fake_throw:verification");
      }
      return JSON.stringify({ paragraphs: ["ok"] });
    },
    async *stream(): AsyncIterable<string> {
      yield "";
    },
  };
}

// --- Tests ------------------------------------------------------------------

const BASE_INPUT = {
  requirements: REQUIREMENTS,
  cvSentences: CV_SENTENCES,
} as const;

describe("generateGroundedCoverLetter — grounded path (FR-COVERLETTER-01/02, BC-HONESTY-01)", () => {
  it("returns the parsed CoverLetterOutput when generation succeeds and verdict is fully supported", async () => {
    const provider = makeProvider(
      coverLetterResponse(GROUNDED_PARAGRAPHS),
      verdictResponse(true, []),
    );

    const result = await generateGroundedCoverLetter(BASE_INPUT, { llm: provider });

    expect(result).not.toBeNull();
    expect(result?.paragraphs).toEqual(GROUNDED_PARAGRAPHS);
  });

  it("makes exactly two provider.complete calls (generation + verification)", async () => {
    const provider = makeProvider(
      coverLetterResponse(GROUNDED_PARAGRAPHS),
      verdictResponse(true, []),
    );

    await generateGroundedCoverLetter(BASE_INPUT, { llm: provider });

    expect(provider.calls).toHaveLength(2);
  });

  it("verification call receives only paragraphs+cvSentences — NOT requirements or careerStage (BC-HONESTY-01/03)", async () => {
    const provider = makeProvider(
      coverLetterResponse(GROUNDED_PARAGRAPHS),
      verdictResponse(true, []),
    );
    const inputWithStage = { ...BASE_INPUT, careerStage: "senior" as const };

    await generateGroundedCoverLetter(inputWithStage, { llm: provider });

    // The second call is the verification prompt.
    const verificationPrompt = provider.calls[1];
    const verificationText = verificationPrompt.messages.map((m) => m.content).join("\n");

    // Must contain the CV sentences (evidence) and the generated paragraphs.
    for (const s of CV_SENTENCES) {
      expect(verificationText).toContain(s);
    }
    for (const p of GROUNDED_PARAGRAPHS) {
      expect(verificationText).toContain(p);
    }

    // Must NOT contain requirements text or careerStage labels.
    for (const r of REQUIREMENTS) {
      expect(verificationText).not.toContain(r.text);
    }
    // Career stage tone label must not appear in the verification prompt.
    expect(verificationText).not.toContain("сеньйор");
    expect(verificationText).not.toContain("Рівень кандидата");
    // JD marker — not present in this input but an extra safety assertion.
    expect(verificationText).not.toContain("extract-requirements");
  });

  it("includes confirmedAnswers in verification prompt when present (BC-HONESTY-03)", async () => {
    const confirmedAnswers = [
      { question: "Чи є досвід з Kubernetes", answer: "UNIQUE_ANSWER_IN_VERIFICATION" },
    ];
    const provider = makeProvider(
      coverLetterResponse(GROUNDED_PARAGRAPHS),
      verdictResponse(true, []),
    );

    await generateGroundedCoverLetter({ ...BASE_INPUT, confirmedAnswers }, { llm: provider });

    const verificationText = provider.calls[1].messages.map((m) => m.content).join("\n");
    expect(verificationText).toContain("UNIQUE_ANSWER_IN_VERIFICATION");
  });
});

describe("generateGroundedCoverLetter — quality fixture (honesty-eval §3.4)", () => {
  it("approved grounded letter: supported with no unsupported claims → returned (quality fixture)", async () => {
    const provider = makeProvider(
      coverLetterResponse(GROUNDED_PARAGRAPHS),
      verdictResponse(true, []),
    );

    const result = await generateGroundedCoverLetter(BASE_INPUT, { llm: provider });

    expect(result).not.toBeNull();
    // Both paragraphs sourced from CV — the grounded quality fixture.
    expect(result?.paragraphs).toHaveLength(2);
    expect(result?.paragraphs[0]).toContain("платіжну систему");
    expect(result?.paragraphs[1]).toContain("трьох бекенд-розробників");
  });

  it("overclaiming letter is rejected — unsupported claims return null (quality fixture)", async () => {
    // Paragraph invents experience not in the CV (50-person team).
    const overclaimingParagraph = "Я керував командою з 50 інженерів і збудував платформу для 10 млн користувачів.";
    const provider = makeProvider(
      coverLetterResponse([overclaimingParagraph]),
      verdictResponse(false, ["керував командою з 50 інженерів"]),
    );

    const result = await generateGroundedCoverLetter(BASE_INPUT, { llm: provider });

    expect(result).toBeNull();
  });
});

describe("generateGroundedCoverLetter — null on generation failure (NFR-OBS-01)", () => {
  it("returns null when generation response is malformed JSON", async () => {
    const provider = makeProvider("not valid json at all", verdictResponse(true, []));

    const result = await generateGroundedCoverLetter(BASE_INPUT, { llm: provider });

    expect(result).toBeNull();
    // Verification must NOT have been called — no paragraphs to verify.
    expect(provider.calls).toHaveLength(1);
  });

  it("returns null when generation returns empty paragraphs array", async () => {
    const provider = makeProvider(JSON.stringify({ paragraphs: [] }), verdictResponse(true, []));

    const result = await generateGroundedCoverLetter(BASE_INPUT, { llm: provider });

    expect(result).toBeNull();
  });

  it("returns null when generation returns a non-object (array root)", async () => {
    const provider = makeProvider(JSON.stringify([1, 2, 3]), verdictResponse(true, []));

    const result = await generateGroundedCoverLetter(BASE_INPUT, { llm: provider });

    expect(result).toBeNull();
  });
});

describe("generateGroundedCoverLetter — null on verdict failure (BC-HONESTY-01, NFR-OBS-01)", () => {
  it("returns null when verification response is malformed JSON", async () => {
    const provider = makeProvider(coverLetterResponse(GROUNDED_PARAGRAPHS), "not valid json");

    const result = await generateGroundedCoverLetter(BASE_INPUT, { llm: provider });

    expect(result).toBeNull();
  });

  it("returns null when supported=false with no claims listed", async () => {
    const provider = makeProvider(
      coverLetterResponse(GROUNDED_PARAGRAPHS),
      verdictResponse(false, []),
    );

    const result = await generateGroundedCoverLetter(BASE_INPUT, { llm: provider });

    expect(result).toBeNull();
  });

  it("returns null when supported=true but unsupportedClaims is non-empty (contradiction must not pass, BC-HONESTY-01)", async () => {
    // Model returns supported:true but lists a claim — the contradiction must
    // be treated as unsupported. This is the fail-honest invariant: a
    // contradiction cannot launder an overclaim through.
    const provider = makeProvider(
      coverLetterResponse(GROUNDED_PARAGRAPHS),
      verdictResponse(true, ["вигаданий факт"]),
    );

    const result = await generateGroundedCoverLetter(BASE_INPUT, { llm: provider });

    expect(result).toBeNull();
  });

  it("returns null when verdict is missing the supported field", async () => {
    const provider = makeProvider(
      coverLetterResponse(GROUNDED_PARAGRAPHS),
      JSON.stringify({ unsupportedClaims: [] }),
    );

    const result = await generateGroundedCoverLetter(BASE_INPUT, { llm: provider });

    expect(result).toBeNull();
  });
});

describe("generateGroundedCoverLetter — null on provider throw (NFR-OBS-01)", () => {
  it("returns null when the provider throws on the generation call — never propagates", async () => {
    const llm = throwingProvider("generation");

    const result = await generateGroundedCoverLetter(BASE_INPUT, { llm });

    expect(result).toBeNull();
  });

  it("returns null when the provider throws on the verification call — never propagates", async () => {
    const llm = throwingProvider("verification");

    const result = await generateGroundedCoverLetter(BASE_INPUT, { llm });

    expect(result).toBeNull();
  });

  it("never throws — always resolves to CoverLetterOutput or null", async () => {
    const alwaysThrows: LlmProvider = {
      async complete(): Promise<string> {
        throw new Error("catastrophic failure");
      },
      async *stream(): AsyncIterable<string> {
        yield "";
      },
    };

    await expect(
      generateGroundedCoverLetter(BASE_INPUT, { llm: alwaysThrows }),
    ).resolves.toBeNull();
  });
});
