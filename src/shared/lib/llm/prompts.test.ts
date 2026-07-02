import { describe, expect, it } from "vitest";

import {
  GENERATION_SYSTEM_PROMPT,
  GROUNDING_SYSTEM_PROMPT,
  buildGenerationPrompt,
  buildGroundingPrompt,
} from "./index";
import type {
  GeneratedBullet,
  GenerationInput,
  GroundingInput,
} from "./types";
import type { CvProfile, Requirement } from "@/shared/lib/scoring";

const cv: CvProfile = {
  skills: ["react", "typescript"],
  sentences: [
    "Побудував інтерфейс на React у попередній компанії",
    "Керував командою з трьох інженерів",
  ],
};

const requirements: readonly Requirement[] = [
  {
    id: "r1",
    text: "React experience",
    importance: "must-have",
    keywords: ["react"],
  },
  {
    id: "r2",
    text: "Team leadership",
    importance: "nice-to-have",
    keywords: ["leadership"],
  },
];

const genInput: GenerationInput = {
  cvProfile: cv,
  requirements,
  jobDescription: "UNIQUE_JD_MARKER: Senior React engineer wanted",
};

function textOf(messages: readonly { content: string }[]): string {
  return messages.map((m) => m.content).join("\n");
}

// Cyrillic presence = Ukrainian-first (NFR-I18N-01).
const CYRILLIC = /[Ѐ-ӿ]/;

describe("buildGenerationPrompt (FR-TAILOR-02, NFR-I18N-01, BC-HONESTY-01)", () => {
  const prompt = buildGenerationPrompt(genInput);
  const all = textOf(prompt.messages);

  it("has a system message then a user message", () => {
    expect(prompt.messages.map((m) => m.role)).toEqual(["system", "user"]);
  });

  it("includes the JD text", () => {
    expect(all).toContain("UNIQUE_JD_MARKER");
  });

  it("includes every ranked requirement's text", () => {
    for (const r of requirements) {
      expect(all).toContain(r.text);
    }
  });

  it("includes the candidate's CV sentences and skills", () => {
    for (const s of cv.sentences) expect(all).toContain(s);
    expect(all).toContain("react");
  });

  it("instructs Ukrainian output (NFR-I18N-01)", () => {
    expect(GENERATION_SYSTEM_PROMPT).toMatch(CYRILLIC);
    expect(GENERATION_SYSTEM_PROMPT.toLowerCase()).toContain("українськ");
  });

  it("forbids inventing experience (BC-HONESTY-01)", () => {
    expect(GENERATION_SYSTEM_PROMPT).toContain("BC-HONESTY-01");
    expect(GENERATION_SYSTEM_PROMPT.toLowerCase()).toContain("заборонено");
  });

  it("is pure — same input yields identical output (TC-PURE-01)", () => {
    expect(buildGenerationPrompt(genInput)).toEqual(
      buildGenerationPrompt(genInput),
    );
  });

  it("handles empty requirements and empty JD without throwing", () => {
    const p = buildGenerationPrompt({
      cvProfile: cv,
      requirements: [],
      jobDescription: "   ",
    });
    expect(textOf(p.messages)).toContain("(вимоги відсутні)");
    expect(textOf(p.messages)).toContain("(опис відсутній)");
  });
});

describe("buildGroundingPrompt (FR-BULLETS-03, BC-HONESTY-01)", () => {
  const bullets: readonly GeneratedBullet[] = [
    { id: "b1", text: "Розробив масштабований React-застосунок" },
    { id: "b2", text: "Наставляв п'ятьох джуніор-розробників" },
  ];
  const grInput: GroundingInput = {
    bullets,
    cvSentences: cv.sentences,
  };
  const prompt = buildGroundingPrompt(grInput);
  const all = textOf(prompt.messages);

  it("has a system message then a user message", () => {
    expect(prompt.messages.map((m) => m.role)).toEqual(["system", "user"]);
  });

  it("includes ONLY the CV sentences and the bullets", () => {
    for (const s of cv.sentences) expect(all).toContain(s);
    for (const b of bullets) expect(all).toContain(b.text);
  });

  it("does NOT share generation context: no JD or requirement text (FR-BULLETS-03)", () => {
    expect(all).not.toContain("UNIQUE_JD_MARKER");
    for (const r of requirements) {
      expect(all).not.toContain(r.text);
    }
    // Nor any of the generation prompt's instructions.
    expect(all).not.toContain(GENERATION_SYSTEM_PROMPT);
  });

  it("is a stricter second-pass verifier in Ukrainian", () => {
    expect(GROUNDING_SYSTEM_PROMPT).toMatch(CYRILLIC);
    expect(GROUNDING_SYSTEM_PROMPT.toLowerCase()).toContain("overclaim-risk");
  });

  it("is pure — same input yields identical output (TC-PURE-01)", () => {
    expect(buildGroundingPrompt(grInput)).toEqual(buildGroundingPrompt(grInput));
  });

  it("handles empty bullets and sentences without throwing", () => {
    const p = buildGroundingPrompt({ bullets: [], cvSentences: [] });
    const t = textOf(p.messages);
    expect(t).toContain("(пунктів немає)");
    expect(t).toContain("(речень немає)");
  });
});
