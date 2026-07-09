// Pure tests for toConfirmedAnswers (FR-WIZARD-04, BC-HONESTY-03): only
// `answered` questions with non-blank text become evidence; skipped/declined/
// blank/unknown-id entries contribute nothing; the question TEXT (not id) is
// carried, since that is what the grounding pass matches against.
import { describe, expect, it } from "vitest";

import type { ClarifyingAnswer, ClarifyingQuestion } from "@/entities/clarifying-question";

import { toConfirmedAnswers } from "./confirmed-answers";

const QUESTIONS: readonly ClarifyingQuestion[] = [
  { id: "q1", requirementText: "GraphQL", text: "Do you have GraphQL experience?" },
  { id: "q2", requirementText: "Kubernetes", text: "Have you run production Kubernetes?" },
  { id: "q3", requirementText: "Rust", text: "Any Rust experience?" },
];

describe("toConfirmedAnswers", () => {
  it("keeps only answered questions and maps id → question text", () => {
    const answers: readonly ClarifyingAnswer[] = [
      { questionId: "q1", status: "answered", answerText: "Two years on a public API" },
      { questionId: "q2", status: "skipped" },
      { questionId: "q3", status: "declined" },
    ];
    expect(toConfirmedAnswers(QUESTIONS, answers)).toEqual([
      { question: "Do you have GraphQL experience?", answer: "Two years on a public API" },
    ]);
  });

  it("drops blank/whitespace answers and trims kept ones", () => {
    const answers: readonly ClarifyingAnswer[] = [
      { questionId: "q1", status: "answered", answerText: "   " },
      { questionId: "q2", status: "answered", answerText: "  ran EKS in prod  " },
    ];
    expect(toConfirmedAnswers(QUESTIONS, answers)).toEqual([
      { question: "Have you run production Kubernetes?", answer: "ran EKS in prod" },
    ]);
  });

  it("ignores answers whose question id is unknown", () => {
    const answers: readonly ClarifyingAnswer[] = [
      { questionId: "ghost", status: "answered", answerText: "should be dropped" },
    ];
    expect(toConfirmedAnswers(QUESTIONS, answers)).toEqual([]);
  });

  it("returns an empty pool when everything is skipped (no blocking, CV-only grounding)", () => {
    const answers: readonly ClarifyingAnswer[] = QUESTIONS.map((q) => ({
      questionId: q.id,
      status: "skipped" as const,
    }));
    expect(toConfirmedAnswers(QUESTIONS, answers)).toEqual([]);
  });
});
