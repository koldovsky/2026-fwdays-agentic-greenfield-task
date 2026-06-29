import { describe, it, expect } from "vitest";
import {
  buildSummariserSystemPrompt,
  buildSummariserUserPrompt,
  SUMMARISER_RULES,
  MAX_ANSWER_CHARS_IN_PROMPT,
} from "./prompts";
import type { TemplateSnapshot } from "@/lib/cycles/snapshot";

const questions: TemplateSnapshot["questions"] = [
  { id: "q1", order: 1, text: "Сильні сторони?", type: "open", required: true },
  { id: "q2", order: 2, text: "Оцінка надійності", type: "scale", required: true, anchors: [{ value: 5, label: "Високо" }] },
];

describe("summariser system prompt (grounding guard)", () => {
  const prompt = buildSummariserSystemPrompt().toLowerCase();

  it("embeds every grounding rule", () => {
    for (const rule of SUMMARISER_RULES) {
      expect(buildSummariserSystemPrompt()).toContain(rule);
    }
  });

  it("forbids inventing facts/scores and emitting PII", () => {
    expect(prompt).toContain("never invent facts");
    expect(prompt).toContain("surname, email, phone number, or telegram");
  });

  it("requires verbatim, per-answer attributed quotes", () => {
    expect(prompt).toContain("verbatim");
    expect(prompt).toContain("questionid");
  });
});

describe("summariser user prompt", () => {
  it("keys answers by questionId and omits unanswered questions' text", () => {
    const p = buildSummariserUserPrompt({
      questions,
      answersById: { q1: "Дуже добре наставляє", q2: "5 — Високо" },
      subjectFirstName: "Олена",
    });
    expect(p).toContain("questionId: q1");
    expect(p).toContain("Дуже добре наставляє");
    expect(p).toContain("Олена");
  });

  it("truncates an over-long answer deterministically", () => {
    const long = "а".repeat(MAX_ANSWER_CHARS_IN_PROMPT + 500);
    const p = buildSummariserUserPrompt({ questions, answersById: { q1: long }, subjectFirstName: null });
    expect(p).toContain("а".repeat(MAX_ANSWER_CHARS_IN_PROMPT));
    expect(p).not.toContain("а".repeat(MAX_ANSWER_CHARS_IN_PROMPT + 1));
  });
});
