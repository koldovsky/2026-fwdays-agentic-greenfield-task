// T5 §3.6 — letter context must never appear in bullet grounding payloads.
//
// The bullet-grounding lane (buildGroundingPrompt) and the cover-letter lane
// (buildCoverLetterPrompt + buildCoverLetterVerificationPrompt) are structurally
// isolated: GroundingInput has no letter/requirements/careerStage fields.
// These tests assert that isolation by inspecting what the grounding prompt
// can structurally see, mirroring the trajectory denylist in
// shared/lib/evals/trajectory.ts (GROUNDING_FORBIDDEN: "coverLetter",
// "coverLetterContext", "careerStage").
//
// FR-BULLETS-03, BC-HONESTY-03, BC-HONESTY-01.
import { describe, expect, it } from "vitest";

import {
  GROUNDING_SYSTEM_PROMPT,
  buildCoverLetterPrompt,
  buildCoverLetterVerificationPrompt,
  buildGroundingPrompt,
} from "@/shared/lib/llm";

const CV_SENTENCES = [
  "Побудував платіжну систему на React за два квартали.",
  "Керував командою з трьох бекенд-розробників.",
];

const REQUIREMENTS = [
  { id: "r1", text: "UNIQUE_REQUIREMENT_TEXT_SENTINEL", importance: "must-have" as const, keywords: ["react"] },
];

const VERIFIED_PARAGRAPHS = [
  "UNIQUE_LLM_LETTER_PARAGRAPH_SENTINEL: побудував систему.",
];

function textOf(messages: readonly { content: string }[]): string {
  return messages.map((m) => m.content).join("\n");
}

describe("Bullet-grounding isolation from letter context (T5 §3.6, FR-BULLETS-03, BC-HONESTY-01/03)", () => {
  it("buildGroundingPrompt payload contains ONLY bullets and cvSentences — no requirements, JD, or letter paragraphs", () => {
    const groundingPrompt = buildGroundingPrompt({
      bullets: [{ id: "b1", text: "Пункт з резюме." }],
      cvSentences: CV_SENTENCES,
    });
    const text = textOf(groundingPrompt.messages);

    // Must contain the CV sentences.
    for (const s of CV_SENTENCES) {
      expect(text).toContain(s);
    }

    // Must NOT contain requirements text (from the generation/cover-letter pass).
    expect(text).not.toContain("UNIQUE_REQUIREMENT_TEXT_SENTINEL");

    // Must NOT contain letter paragraph text.
    expect(text).not.toContain("UNIQUE_LLM_LETTER_PARAGRAPH_SENTINEL");
  });

  it("grounding prompt is byte-stable: adding letter evidence to a parallel cover-letter call does not change it", () => {
    // Build both prompts with the same CV sentences.
    const groundingInput = {
      bullets: [{ id: "b1", text: "Пункт." }],
      cvSentences: CV_SENTENCES,
    };

    // Simulate what happens in a real tailoring run: cover-letter is generated
    // alongside (but after) the grounding pass. The grounding prompt must be
    // identical regardless of whether letter evidence is present.
    const groundingWithoutLetter = buildGroundingPrompt(groundingInput);

    // Now build the cover-letter prompt (a different call, different context).
    const _letterPrompt = buildCoverLetterPrompt({
      requirements: REQUIREMENTS,
      cvSentences: CV_SENTENCES,
    });
    void _letterPrompt; // used to assert the cover-letter call doesn't side-effect grounding.

    const groundingAfterLetter = buildGroundingPrompt(groundingInput);

    // The grounding prompt is byte-identical before and after the letter call.
    expect(groundingAfterLetter).toEqual(groundingWithoutLetter);
  });

  it("grounding prompt does NOT contain any of the GROUNDING_FORBIDDEN key labels (denylist assertion)", () => {
    const groundingPrompt = buildGroundingPrompt({
      bullets: [{ id: "b1", text: "Пункт." }],
      cvSentences: CV_SENTENCES,
    });
    const text = textOf(groundingPrompt.messages);

    // The denylist from trajectory.ts: coverLetter, coverLetterContext, attachment.
    // Note: careerStage is also forbidden, and GroundingInput has no such field.
    for (const forbidden of ["coverLetter", "coverLetterContext", "attachment", "careerStage"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("buildGroundingPrompt uses a different system prompt from buildCoverLetterVerificationPrompt (separate passes)", () => {
    const groundingPrompt = buildGroundingPrompt({
      bullets: [{ id: "b1", text: "Пункт." }],
      cvSentences: CV_SENTENCES,
    });
    const verificationPrompt = buildCoverLetterVerificationPrompt({
      paragraphs: VERIFIED_PARAGRAPHS,
      cvSentences: CV_SENTENCES,
    });

    const groundingSystem = groundingPrompt.messages.find((m) => m.role === "system")?.content;
    const verificationSystem = verificationPrompt.messages.find((m) => m.role === "system")?.content;

    // Different system prompts — two independent passes.
    expect(groundingSystem).toBe(GROUNDING_SYSTEM_PROMPT);
    expect(verificationSystem).not.toBe(GROUNDING_SYSTEM_PROMPT);
    expect(groundingSystem).not.toBe(verificationSystem);
  });

  it("verification prompt payload contains no requirements or careerStage (isolation from generation context)", () => {
    const verificationPrompt = buildCoverLetterVerificationPrompt({
      paragraphs: VERIFIED_PARAGRAPHS,
      cvSentences: CV_SENTENCES,
    });
    const text = textOf(verificationPrompt.messages);

    // Requirements text and career-stage labels must be absent.
    expect(text).not.toContain("UNIQUE_REQUIREMENT_TEXT_SENTINEL");
    expect(text).not.toContain("Рівень кандидата");
    expect(text).not.toContain("джуніор");
    expect(text).not.toContain("мідл");
    expect(text).not.toContain("сеньйор");
  });

  it("letter generation is placement-correct: cover-letter generation context keys stay out of GroundingInput type", () => {
    // The GroundingInput type (shared/lib/llm/types.ts) has only bullets,
    // cvSentences, and confirmedAnswers — no requirements, JD, careerStage,
    // or coverLetter fields. TypeScript prevents the leak structurally.
    // This test asserts the observable contract: the grounding prompt built
    // from a GroundingInput has no cover-letter-context fields in its payload.
    const groundingInput = {
      bullets: [{ id: "b1", text: "Розробив API на Node.js." }],
      cvSentences: ["Wrote Node.js APIs for two years."],
    };
    const prompt = buildGroundingPrompt(groundingInput);
    const payload = textOf(prompt.messages);

    // The cover-letter paragraph sentinel must not appear.
    expect(payload).not.toContain("UNIQUE_LLM_LETTER_PARAGRAPH_SENTINEL");
    // Requirements sentinel must not appear.
    expect(payload).not.toContain("UNIQUE_REQUIREMENT_TEXT_SENTINEL");
  });
});
