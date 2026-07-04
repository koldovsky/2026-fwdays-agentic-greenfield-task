import { describe, expect, it } from "vitest";

import {
  COVER_LETTER_SYSTEM_PROMPT,
  GENERATION_SYSTEM_PROMPT,
  GROUNDING_SYSTEM_PROMPT,
  SENIORITY_SYSTEM_PROMPT,
  buildCoverLetterPrompt,
  buildGenerationPrompt,
  buildGroundingPrompt,
  buildSeniorityPrompt,
} from "./index";
import type {
  ConfirmedAnswerEvidence,
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

describe("buildSeniorityPrompt (§3, BC-HONESTY-01, NFR-I18N-01)", () => {
  const prompt = buildSeniorityPrompt({ cvText: "UNIQUE_CV_MARKER: 6 років на React" });
  const all = textOf(prompt.messages);

  it("has a system message then a user message", () => {
    expect(prompt.messages.map((m) => m.role)).toEqual(["system", "user"]);
  });

  it("carries ONLY the CV text — no JD or requirements channel", () => {
    expect(all).toContain("UNIQUE_CV_MARKER");
    expect(all).not.toContain("UNIQUE_JD_MARKER");
    for (const r of requirements) expect(all).not.toContain(r.text);
  });

  it("forbids inventing signal and stays conservative (BC-HONESTY-01)", () => {
    expect(SENIORITY_SYSTEM_PROMPT).toContain("BC-HONESTY-01");
    expect(SENIORITY_SYSTEM_PROMPT.toLowerCase()).toContain("заборонено");
    expect(SENIORITY_SYSTEM_PROMPT.toLowerCase()).toContain("консерватив");
  });

  it("instructs Ukrainian rationale (NFR-I18N-01)", () => {
    expect(SENIORITY_SYSTEM_PROMPT).toMatch(CYRILLIC);
    expect(SENIORITY_SYSTEM_PROMPT.toLowerCase()).toContain("українськ");
  });

  it("is pure — same input yields identical output (TC-PURE-01)", () => {
    expect(buildSeniorityPrompt({ cvText: "x" })).toEqual(buildSeniorityPrompt({ cvText: "x" }));
  });
});

describe("careerStage tone calibration in generation (§3.5, BC-HONESTY-01)", () => {
  it("renders a tone-only block that pins the stage but adds no facts", () => {
    const withStage = buildGenerationPrompt({ ...genInput, careerStage: "senior" });
    const text = textOf(withStage.messages);
    expect(text).toContain("## Рівень кандидата (лише для тону)");
    expect(text).toContain("сеньйор");
    // The block is an instruction not to add facts, not a new fact itself.
    expect(text).toContain("НЕ додавай");
  });

  it("absent careerStage is byte-identical to no careerStage field (§5.1 baseline)", () => {
    const noField = buildGenerationPrompt(genInput);
    const explicitUndefined = buildGenerationPrompt({ ...genInput, careerStage: undefined });
    expect(explicitUndefined).toEqual(noField);
    expect(textOf(noField.messages)).not.toContain("Рівень кандидата");
  });
});

describe("buildCoverLetterPrompt (§4, BC-HONESTY-01/02, NFR-I18N-01)", () => {
  const clInput = {
    requirements,
    cvSentences: cv.sentences,
  };

  it("has a system message then a user message", () => {
    const prompt = buildCoverLetterPrompt(clInput);
    expect(prompt.messages.map((m) => m.role)).toEqual(["system", "user"]);
  });

  it("grounds only in CV sentences + confirmed answers; requirements steer emphasis", () => {
    const all = textOf(buildCoverLetterPrompt(clInput).messages);
    for (const s of cv.sentences) expect(all).toContain(s);
    expect(all).toContain("єдине джерело фактів");
  });

  it("forbids fabrication and pins Ukrainian output", () => {
    expect(COVER_LETTER_SYSTEM_PROMPT).toContain("BC-HONESTY-01");
    expect(COVER_LETTER_SYSTEM_PROMPT).toContain("BC-HONESTY-02");
    expect(COVER_LETTER_SYSTEM_PROMPT).toMatch(CYRILLIC);
    expect(COVER_LETTER_SYSTEM_PROMPT.toLowerCase()).toContain("українськ");
  });

  it("absent confirmedAnswers/careerStage is byte-identical to the bare input", () => {
    const bare = buildCoverLetterPrompt(clInput);
    const explicit = buildCoverLetterPrompt({
      ...clInput,
      confirmedAnswers: undefined,
      careerStage: undefined,
    });
    expect(explicit).toEqual(bare);
    const text = textOf(bare.messages);
    expect(text).not.toContain("Підтверджені відповіді");
    expect(text).not.toContain("Рівень кандидата");
  });

  it("is pure — same input yields identical output (TC-PURE-01)", () => {
    expect(buildCoverLetterPrompt(clInput)).toEqual(buildCoverLetterPrompt(clInput));
  });
});

describe("grounding isolation from seniority + cover letter (§5.1, BC-HONESTY-03)", () => {
  const base: GroundingInput = {
    bullets: [{ id: "b1", text: "Пункт" }],
    cvSentences: cv.sentences,
  };

  it("buildGroundingPrompt has no careerStage/coverLetter channel — output cannot vary with either upstream", () => {
    // The grounding builder's input type (GroundingInput) carries neither a
    // careerStage nor a cover-letter field; a seniority verdict or a generated
    // cover letter existing upstream can never reach the grounding payload.
    // Proven structurally: the serialized grounding prompt is byte-stable, and
    // none of the stage/cover-letter labels can appear in it.
    const text = textOf(buildGroundingPrompt(base).messages);
    for (const label of ["джуніор", "мідл", "сеньйор", "Рівень кандидата", "супровідний лист"]) {
      expect(text.toLowerCase()).not.toContain(label.toLowerCase());
    }
    expect(buildGroundingPrompt(base)).toEqual(buildGroundingPrompt(base));
  });
});

describe("confirmedAnswers evidence lane (BC-HONESTY-03)", () => {
  const confirmedAnswers: readonly ConfirmedAnswerEvidence[] = [
    {
      question: "UNIQUE_QUESTION_MARKER: Чи є досвід з Kubernetes",
      answer: "UNIQUE_ANSWER_MARKER: керував кластером у попередній команді",
    },
  ];

  it("buildGenerationPrompt: renders a distinct labeled block, separate from CV sentences", () => {
    const withAnswers = buildGenerationPrompt({ ...genInput, confirmedAnswers });
    const text = textOf(withAnswers.messages);

    expect(text).toContain("## Підтверджені відповіді кандидата");
    expect(text).toContain("UNIQUE_QUESTION_MARKER");
    expect(text).toContain("UNIQUE_ANSWER_MARKER");

    const cvHeaderIndex = text.indexOf("## Речення з резюме кандидата");
    const answersHeaderIndex = text.indexOf("## Підтверджені відповіді кандидата");
    expect(cvHeaderIndex).toBeGreaterThanOrEqual(0);
    expect(answersHeaderIndex).toBeGreaterThan(cvHeaderIndex);

    const cvSection = text.slice(cvHeaderIndex, answersHeaderIndex);
    expect(cvSection).not.toContain("UNIQUE_QUESTION_MARKER");
    expect(cvSection).not.toContain("UNIQUE_ANSWER_MARKER");
  });

  it("buildGroundingPrompt: renders a distinct labeled block, separate from CV sentences", () => {
    const grInput: GroundingInput = {
      bullets: [{ id: "b1", text: "Пункт" }],
      cvSentences: cv.sentences,
      confirmedAnswers,
    };
    const withAnswers = buildGroundingPrompt(grInput);
    const text = textOf(withAnswers.messages);

    expect(text).toContain("## Підтверджені відповіді кандидата");
    expect(text).toContain("UNIQUE_QUESTION_MARKER");
    expect(text).toContain("UNIQUE_ANSWER_MARKER");

    const cvHeaderIndex = text.indexOf("## Речення з резюме кандидата");
    const answersHeaderIndex = text.indexOf("## Підтверджені відповіді кандидата");
    const bulletsHeaderIndex = text.indexOf("## Пункти для перевірки");
    expect(answersHeaderIndex).toBeGreaterThan(cvHeaderIndex);
    expect(bulletsHeaderIndex).toBeGreaterThan(answersHeaderIndex);
  });

  it("buildGenerationPrompt: absent/empty confirmedAnswers is byte-identical to no confirmedAnswers field", () => {
    const noField = buildGenerationPrompt(genInput);
    const explicitUndefined = buildGenerationPrompt({
      ...genInput,
      confirmedAnswers: undefined,
    });
    const explicitEmpty = buildGenerationPrompt({
      ...genInput,
      confirmedAnswers: [],
    });

    expect(explicitUndefined).toEqual(noField);
    expect(explicitEmpty).toEqual(noField);
    expect(textOf(noField.messages)).not.toContain("Підтверджені відповіді");
  });

  it("buildGroundingPrompt: absent/empty confirmedAnswers is byte-identical to no confirmedAnswers field", () => {
    const base: GroundingInput = {
      bullets: [{ id: "b1", text: "Пункт" }],
      cvSentences: cv.sentences,
    };
    const noField = buildGroundingPrompt(base);
    const explicitUndefined = buildGroundingPrompt({
      ...base,
      confirmedAnswers: undefined,
    });
    const explicitEmpty = buildGroundingPrompt({ ...base, confirmedAnswers: [] });

    expect(explicitUndefined).toEqual(noField);
    expect(explicitEmpty).toEqual(noField);
    expect(textOf(noField.messages)).not.toContain("Підтверджені відповіді");
  });
});
