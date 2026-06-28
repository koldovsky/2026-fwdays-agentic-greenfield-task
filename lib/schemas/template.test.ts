// @trace FR-TPL-01, FR-TPL-02
import { describe, expect, it } from "vitest";
import { anchorSchema, questionSchema, templateSchema } from "@/lib/schemas/template";

/**
 * Red-first unit tests for the templates slice (FR-TPL-01, FR-TPL-02).
 * Asserts BEHAVIOUR via `safeParse(...).success` — which inputs are accepted
 * or rejected at the boundary — not exact Zod message text. Mirrors the
 * "rejected at the boundary" scenarios in openspec/specs/templates/spec.md:
 * question text (trimmed 1–500) and type (exactly scale|open); anchors
 * (canonical JSON integer value, unique within a question, scale requires a
 * non-empty anchor list, open carries none); template (name trimmed 1–200,
 * non-empty methodology, ≥1 question, order values exactly the unique
 * contiguous integers 1..N).
 */

/** A well-formed scale question: ≥2 unique integer anchors, order 1. */
const scaleQuestion = {
  id: "q-scale-1",
  order: 1,
  text: "How clearly were the expectations communicated?",
  type: "scale",
  required: true,
  anchors: [
    { value: 1, label: "Not at all" },
    { value: 2, label: "Somewhat" },
    { value: 3, label: "Clearly" },
  ],
};

/** A well-formed open question: order 2, no anchors. */
const openQuestion = {
  id: "q-open-1",
  order: 2,
  text: "What would you keep, and what would you change?",
  type: "open",
  required: false,
};

/** A fully-valid template: mixed scale + open, contiguous orders 1,2. */
const validTemplate = {
  name: "Probation check-in",
  methodology: "probation",
  questions: [scaleQuestion, openQuestion],
};

describe("anchorSchema — accepts", () => {
  it("accepts an integer value with a non-empty label", () => {
    expect(anchorSchema.safeParse({ value: 3, label: "Clearly" }).success).toBe(true);
  });
});

describe("anchorSchema — rejects", () => {
  it("rejects an anchor missing value", () => {
    expect(anchorSchema.safeParse({ label: "Clearly" }).success).toBe(false);
  });

  it("rejects an anchor missing label", () => {
    expect(anchorSchema.safeParse({ value: 3 }).success).toBe(false);
  });

  it("rejects an anchor with an empty label", () => {
    expect(anchorSchema.safeParse({ value: 3, label: "" }).success).toBe(false);
  });

  it('rejects the numeric string value "3" (no coercion)', () => {
    expect(anchorSchema.safeParse({ value: "3", label: "Clearly" }).success).toBe(false);
  });

  it("rejects the decimal value 3.5", () => {
    expect(anchorSchema.safeParse({ value: 3.5, label: "Clearly" }).success).toBe(false);
  });

  it('rejects the locale-formatted decimal-comma string "3,5"', () => {
    expect(anchorSchema.safeParse({ value: "3,5", label: "Clearly" }).success).toBe(false);
  });

  it('rejects the leading-zero string "03"', () => {
    expect(anchorSchema.safeParse({ value: "03", label: "Clearly" }).success).toBe(false);
  });
});

describe("questionSchema — accepts", () => {
  it("accepts a well-formed scale question with ≥2 unique integer anchors", () => {
    expect(questionSchema.safeParse(scaleQuestion).success).toBe(true);
  });

  it("accepts a well-formed open question with no anchors", () => {
    expect(questionSchema.safeParse(openQuestion).success).toBe(true);
  });
});

describe("questionSchema — text", () => {
  it('rejects empty text ""', () => {
    expect(questionSchema.safeParse({ ...scaleQuestion, text: "" }).success).toBe(false);
  });

  it('rejects whitespace-only text "   "', () => {
    expect(questionSchema.safeParse({ ...scaleQuestion, text: "   " }).success).toBe(false);
  });

  it("rejects text longer than 500 characters", () => {
    expect(questionSchema.safeParse({ ...scaleQuestion, text: "a".repeat(501) }).success).toBe(
      false,
    );
  });
});

describe("questionSchema — type", () => {
  it('rejects an unknown type "multiple-choice"', () => {
    expect(
      questionSchema.safeParse({ ...scaleQuestion, type: "multiple-choice" }).success,
    ).toBe(false);
  });
});

describe("questionSchema — scale anchors", () => {
  it("rejects a scale question with an empty anchor list", () => {
    expect(questionSchema.safeParse({ ...scaleQuestion, anchors: [] }).success).toBe(false);
  });

  it("rejects a scale question with no anchors key", () => {
    const { anchors, ...noAnchors } = scaleQuestion;
    void anchors;
    expect(questionSchema.safeParse(noAnchors).success).toBe(false);
  });

  it("rejects a scale question whose anchor is missing value", () => {
    expect(
      questionSchema.safeParse({
        ...scaleQuestion,
        anchors: [{ value: 1, label: "Low" }, { label: "High" }],
      }).success,
    ).toBe(false);
  });

  it("rejects a scale question whose anchor is missing label", () => {
    expect(
      questionSchema.safeParse({
        ...scaleQuestion,
        anchors: [{ value: 1, label: "Low" }, { value: 2 }],
      }).success,
    ).toBe(false);
  });

  it('rejects a scale question with a non-canonical anchor value "3"', () => {
    expect(
      questionSchema.safeParse({
        ...scaleQuestion,
        anchors: [{ value: 1, label: "Low" }, { value: "3", label: "High" }],
      }).success,
    ).toBe(false);
  });

  it("rejects a scale question with a decimal anchor value 3.5", () => {
    expect(
      questionSchema.safeParse({
        ...scaleQuestion,
        anchors: [{ value: 1, label: "Low" }, { value: 3.5, label: "High" }],
      }).success,
    ).toBe(false);
  });

  it("rejects a scale question with duplicate anchor values", () => {
    expect(
      questionSchema.safeParse({
        ...scaleQuestion,
        anchors: [
          { value: 2, label: "Somewhat" },
          { value: 2, label: "Also somewhat" },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("questionSchema — open anchors", () => {
  it("rejects an open question that carries anchors", () => {
    expect(
      questionSchema.safeParse({
        ...openQuestion,
        anchors: [{ value: 1, label: "Low" }],
      }).success,
    ).toBe(false);
  });
});

describe("templateSchema — accepts", () => {
  it("accepts a well-formed template (mixed scale + open, contiguous orders 1,2)", () => {
    expect(templateSchema.safeParse(validTemplate).success).toBe(true);
  });
});

describe("templateSchema — name", () => {
  it("rejects a name longer than 200 characters", () => {
    expect(templateSchema.safeParse({ ...validTemplate, name: "a".repeat(201) }).success).toBe(
      false,
    );
  });

  it('rejects an empty name ""', () => {
    expect(templateSchema.safeParse({ ...validTemplate, name: "" }).success).toBe(false);
  });

  it("rejects a missing name", () => {
    const { name, ...noName } = validTemplate;
    void name;
    expect(templateSchema.safeParse(noName).success).toBe(false);
  });
});

describe("templateSchema — methodology", () => {
  it('rejects an empty methodology ""', () => {
    expect(templateSchema.safeParse({ ...validTemplate, methodology: "" }).success).toBe(false);
  });

  it("rejects a missing methodology", () => {
    const { methodology, ...noMethodology } = validTemplate;
    void methodology;
    expect(templateSchema.safeParse(noMethodology).success).toBe(false);
  });
});

describe("templateSchema — questions", () => {
  it("rejects an empty question array", () => {
    expect(templateSchema.safeParse({ ...validTemplate, questions: [] }).success).toBe(false);
  });

  it("rejects duplicate order values (1, 1)", () => {
    expect(
      templateSchema.safeParse({
        ...validTemplate,
        questions: [
          { ...scaleQuestion, order: 1 },
          { ...openQuestion, order: 1 },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects non-contiguous order values (1, 2, 4)", () => {
    expect(
      templateSchema.safeParse({
        ...validTemplate,
        questions: [
          { ...scaleQuestion, id: "a", order: 1 },
          { ...openQuestion, id: "b", order: 2 },
          { ...openQuestion, id: "c", order: 4 },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects order values not starting at 1 (2, 3)", () => {
    expect(
      templateSchema.safeParse({
        ...validTemplate,
        questions: [
          { ...scaleQuestion, id: "a", order: 2 },
          { ...openQuestion, id: "b", order: 3 },
        ],
      }).success,
    ).toBe(false);
  });
});
