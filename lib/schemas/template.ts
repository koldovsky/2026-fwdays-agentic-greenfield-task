import { z } from "zod";

/**
 * Template / question / anchor boundary schemas (FR-TPL-01, FR-TPL-02,
 * TC-VALID-01, TC-PURE-01).
 *
 * One canonical set of Zod schemas defines the template shape; seed data is
 * validated against them at the seeding boundary, and the `anchors Json?`
 * column read from Prisma is parsed through `anchorSchema` (never cast). The
 * TypeScript types are inferred via `z.infer` — never hand-written parallel
 * types (TC-TS-01). Framework-free: no `next/*`, `react`, or DOM here, so the
 * rules stay 100% unit-testable.
 *
 * Templates are read-only in the MVP (FR-TPL-03): these schemas validate
 * inbound seed/DB data, they do not back any create/edit/delete path.
 */

/**
 * A single labelled scale anchor. `value` is a STRICT JSON integer — the
 * canonical answer value — with no coercion: the numeric string `"3"`, the
 * decimal `3.5`, the locale-formatted `"3,5"`, and the leading-zero `"03"` are
 * all rejected (FR-TPL-02). `label` is a non-empty trimmed string.
 */
export const anchorSchema = z.object({
  value: z.number().int(),
  label: z.string().trim().min(1),
});

export type Anchor = z.infer<typeof anchorSchema>;

/**
 * A non-empty anchor list whose `value`s are unique within the question. This
 * is the single canonical scale-anchor schema (TC-ARCH-01): both the seed
 * boundary (`questionSchema`) and the DB read side (`questionRowSchema`,
 * parsing the `anchors Json?` column for a `scale` row) parse through it, so
 * the uniqueness invariant is enforced once, everywhere.
 */
export const scaleAnchorsSchema = z
  .array(anchorSchema)
  .min(1)
  .refine(
    (anchors) => new Set(anchors.map((anchor) => anchor.value)).size === anchors.length,
    { message: "Anchor values must be unique within a question" },
  );

/**
 * A typed template question. A `scale` question REQUIRES a non-empty anchor
 * list with unique integer values; an `open` question carries NO anchors. The
 * discriminated shape on `type` encodes both rules so each variant is checked
 * exactly, with no leftover optional-anchor ambiguity.
 */
const baseQuestion = {
  id: z.string().min(1),
  order: z.number().int().positive(),
  text: z.string().trim().min(1).max(500),
  required: z.boolean(),
};

const scaleQuestionSchema = z.object({
  ...baseQuestion,
  type: z.literal("scale"),
  anchors: scaleAnchorsSchema,
});

const openQuestionSchema = z
  .object({
    ...baseQuestion,
    type: z.literal("open"),
  })
  // `open` questions carry NO anchors (FR-TPL-02): reject an unexpected
  // `anchors` key rather than silently stripping it.
  .strict();

export const questionSchema = z.discriminatedUnion("type", [
  scaleQuestionSchema,
  openQuestionSchema,
]);

export type Question = z.infer<typeof questionSchema>;

/**
 * Parse a Prisma `Question` row into the canonical `Question` shape, reusing
 * the SAME rules as the seed boundary (TC-ARCH-01): `scale` rows must carry a
 * non-empty unique-value anchor list (the `anchors Json?` column), `open` rows
 * carry none. A DB row stores `anchors` as `null` for an `open` question, so
 * the row variant tolerates (and drops) an explicit `null` anchors rather than
 * rejecting it the way the strict seed schema does. The output type is exactly
 * `Question`, so callers gain no parallel type and need no cast.
 *
 * A row that fails this parse is malformed; the read side degrades to a calm
 * not-found rather than rendering a broken question or throwing.
 */
export const questionRowSchema = z.discriminatedUnion("type", [
  z.object({
    ...baseQuestion,
    type: z.literal("scale"),
    anchors: scaleAnchorsSchema,
  }),
  // An `open` DB row stores SQL NULL in `anchors`; the non-strict object simply
  // strips that extra key, yielding the canonical anchor-less `open` shape.
  z.object({
    ...baseQuestion,
    type: z.literal("open"),
  }),
]);

/**
 * A read-only template: a trimmed 1–200 name, a non-empty methodology tag, and
 * a non-empty question list whose `order` values are exactly the unique
 * contiguous integers 1..N (so the read order is always unambiguous).
 */
export const templateSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    methodology: z.string().trim().min(1),
    questions: z.array(questionSchema).min(1),
  })
  .refine(
    (template) => {
      const orders = template.questions.map((question) => question.order);
      const unique = new Set(orders);
      if (unique.size !== orders.length) return false;
      for (let expected = 1; expected <= orders.length; expected += 1) {
        if (!unique.has(expected)) return false;
      }
      return true;
    },
    { message: "Question order values must be the unique contiguous integers 1..N" },
  );

export type Template = z.infer<typeof templateSchema>;
