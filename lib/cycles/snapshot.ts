// @trace FR-CYCLE-03
import { z } from "zod";
import { questionSchema, questionRowSchema } from "@/lib/schemas/template";
import { orderedQuestions } from "@/lib/templates/orderedQuestions";

/**
 * Matches the shape needed to build a snapshot: name, methodology, and the
 * question rows. `id` is intentionally omitted — it is not included in the
 * snapshot. Framework-free — no Prisma import needed.
 */
export type TemplateWithQuestions = {
  name: string;
  methodology: string;
  questions: Array<{
    id: string;
    order: number;
    text: string;
    type: string;
    required: boolean;
    anchors?: unknown;
  }>;
};

/**
 * Frozen snapshot schema: validates the shape before it is stored in the DB
 * and when it is read back (FR-CYCLE-03). Reuses questionSchema from the
 * templates boundary so anchor/question validation rules live in one place.
 */
export const snapshotSchema = z.object({
  name: z.string().min(1),
  methodology: z.string().min(1),
  questions: z.array(questionSchema).min(1),
});

export type TemplateSnapshot = z.infer<typeof snapshotSchema>;

/**
 * Build a deep-cloned, validated snapshot from a live template. Ordered by
 * `order` ascending. Validates each question row (including anchors Json)
 * through `questionRowSchema` (the DB-side lenient variant), then validates
 * the assembled snapshot through `snapshotSchema` before returning. Throws a
 * ZodError if the template is malformed — callers should not write a broken
 * snapshot to the DB (FR-CYCLE-03).
 */
export function buildTemplateSnapshot(template: TemplateWithQuestions): TemplateSnapshot {
  // orderedQuestions returns a new sorted array; questionRowSchema.parse creates
  // fresh objects — mutation of the source after this call cannot affect the result.
  const sorted = orderedQuestions(template.questions);
  const questions = sorted.map((row) => questionRowSchema.parse(row));

  return snapshotSchema.parse({
    name: template.name,
    methodology: template.methodology,
    questions,
  });
}
