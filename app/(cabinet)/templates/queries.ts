import { db } from "@/lib/db";
import { anchorSchema, type Question } from "@/lib/schemas/template";
import { orderedQuestions } from "@/lib/templates/orderedQuestions";

/** The `anchors Json?` column for a scale question: a non-empty anchor list. */
const scaleAnchorsSchema = anchorSchema.array().min(1);

/**
 * Template reads for the read-only cabinet routes (FR-TPL-01, FR-TPL-03).
 *
 * Templates are seeded and never mutated through the product, so these are
 * pure reads. A fetch failure throws and is caught by the cabinet `error.tsx`
 * boundary — never a raw 500. The `anchors Json?` column is parsed through
 * `anchorSchema` (never cast); a `scale` row missing valid anchors fails the
 * parse, surfacing as a calm error rather than malformed data downstream.
 */

/** A list row for the templates index: just what the list renders. */
export type TemplateListItem = {
  id: string;
  name: string;
  methodology: string;
};

/** A fully-loaded template for the respondent preview. */
export type TemplatePreview = {
  id: string;
  name: string;
  methodology: string;
  questions: Question[];
};

/** Seeded templates, alphabetised by name (FR-TPL-01). */
export async function listTemplates(): Promise<TemplateListItem[]> {
  const templates = await db.template.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, methodology: true },
  });
  return templates;
}

/**
 * Parse a single DB question row into a validated `Question`. The `anchors`
 * Json value is parsed through `anchorSchema` for `scale`, and `open` rows
 * carry none. Returns null if the row's type is unrecognised or a `scale`
 * row's anchors do not parse, so the caller degrades to a calm error.
 */
function parseQuestionRow(row: {
  id: string;
  order: number;
  text: string;
  type: string;
  required: boolean;
  anchors: unknown;
}): Question | null {
  if (row.type === "open") {
    return {
      id: row.id,
      order: row.order,
      text: row.text,
      type: "open",
      required: row.required,
    };
  }
  if (row.type === "scale") {
    const parsed = scaleAnchorsSchema.safeParse(row.anchors);
    if (!parsed.success) return null;
    return {
      id: row.id,
      order: row.order,
      text: row.text,
      type: "scale",
      required: row.required,
      anchors: parsed.data,
    };
  }
  return null;
}

/**
 * Load a template by id with its questions in defined order (FR-TPL-03).
 * Returns null when the id is unknown or any question row is malformed, so the
 * preview route can render a calm not-found / error state instead of a 500.
 */
export async function getTemplatePreview(id: string): Promise<TemplatePreview | null> {
  const template = await db.template.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      methodology: true,
      questions: {
        select: {
          id: true,
          order: true,
          text: true,
          type: true,
          required: true,
          anchors: true,
        },
      },
    },
  });
  if (template === null) return null;

  const questions: Question[] = [];
  for (const row of template.questions) {
    const question = parseQuestionRow(row);
    if (question === null) return null;
    questions.push(question);
  }

  return {
    id: template.id,
    name: template.name,
    methodology: template.methodology,
    questions: orderedQuestions(questions),
  };
}
