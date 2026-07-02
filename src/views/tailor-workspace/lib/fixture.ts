// Stub Tailoring fixture for the tailor-workspace view — realistic Ukrainian
// sample data standing in for the two-pass pipeline until P3b wires the real
// LLM (FR-TAILOR-*). Pure data: no IO, no LLM, no DOM. Mixes must-have /
// nice-to-have requirements across met / partial / gap / overclaim-risk statuses
// (FR-CHECKLIST-*) and grounded / overclaim-risk bullets (FR-BULLETS-01).
import type { Tailoring } from "@/entities/tailoring";

export const tailoringFixture: Tailoring = {
  id: "tlr-fixture-001",
  cvProfileId: "cv-fixture-001",
  jobDescriptionId: "jd-fixture-001",
  matchScore: 68,
  checklist: [
    {
      requirement: {
        id: "req-react",
        text: "5+ років комерційного досвіду з React",
        importance: "must-have",
        keywords: ["react", "frontend"],
      },
      item: {
        status: "met",
        rationale: "Резюме підтверджує шість років роботи з React у продакшені.",
      },
    },
    {
      requirement: {
        id: "req-ts",
        text: "TypeScript у продакшені",
        importance: "must-have",
        keywords: ["typescript"],
      },
      item: {
        status: "partial",
        rationale: "Є згадка про TypeScript, але без деталей масштабу застосування.",
      },
    },
    {
      requirement: {
        id: "req-graphql",
        text: "Знання GraphQL",
        importance: "nice-to-have",
        keywords: ["graphql"],
      },
      item: {
        status: "gap",
        rationale: "У резюме немає згадок про GraphQL.",
      },
    },
    {
      requirement: {
        id: "req-lead",
        text: "Досвід керівництва командою інженерів",
        importance: "must-have",
        keywords: ["lead", "management"],
      },
      item: {
        status: "overclaim-risk",
        rationale: "Немає підтвердження ролі керівника команди в тексті резюме.",
      },
    },
  ],
  bullets: [
    {
      id: "blt-platform",
      text: "Керував розробкою платформи на React, що обслуговувала 200 тисяч користувачів щомісяця.",
      grounding: "grounded",
      includedInExport: true,
    },
    {
      id: "blt-ts",
      text: "Впровадив TypeScript у ключові модулі та скоротив кількість регресій.",
      grounding: "grounded",
      includedInExport: true,
    },
    {
      id: "blt-team",
      text: "Очолював команду з десяти інженерів у трьох країнах.",
      grounding: "overclaim-risk",
      includedInExport: false,
    },
    {
      id: "blt-revenue",
      text: "Збільшив дохід компанії на 40 відсотків завдяки новим функціям.",
      grounding: "overclaim-risk",
      includedInExport: false,
    },
  ],
};
