import { db } from "@/lib/db";
import { questionRowSchema, type Question } from "@/lib/schemas/template";
import { orderedQuestions } from "@/lib/templates/orderedQuestions";

/**
 * Template reads for the read-only cabinet routes (FR-TPL-01, FR-TPL-03).
 *
 * Templates are seeded and never mutated through the product, so these are
 * pure reads. A fetch failure throws and is caught by the cabinet `error.tsx`
 * boundary — never a raw 500. Each DB question row is parsed through the
 * canonical `questionRowSchema` (TC-ARCH-01) — the SAME rules as the seed
 * boundary, including the unique-value anchor invariant — never cast; a row
 * that fails validation degrades to a calm not-found rather than rendering a
 * malformed question or throwing.
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
    const parsed = questionRowSchema.safeParse(row);
    if (!parsed.success) return null;
    questions.push(parsed.data);
  }

  return {
    id: template.id,
    name: template.name,
    methodology: template.methodology,
    questions: orderedQuestions(questions),
  };
}
