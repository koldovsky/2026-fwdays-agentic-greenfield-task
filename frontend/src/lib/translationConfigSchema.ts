/**
 * Zod schema for TranslationConfigStep form validation (Phase 1 plan 01).
 *
 * Single source of truth for the 4-field translation config (provider +
 * model + source + target). The same schema is consumed by the
 * `TranslationConfigStep` component (gates the Start button) and is
 * stable enough to be reused as the `POST /api/v1/jobs` request-body
 * shape (D-05) when Plan 02 / Phase 2 wire the request body to the
 * backend.
 *
 * The schema enforces:
 *  - `provider` is one of the locked provider IDs (D-02).
 *  - `model` is non-empty (Pydantic `min_length=1` mirror).
 *  - `sourceLanguage` + `targetLanguage` are 2-5 char ISO codes.
 *  - The same-source cross-field check (`.refine`) returns a friendly
 *    error so the form surfaces the same-source warning as a hard
 *    gate (D-06: same-language warning is still rendered as a hint,
 *    but the schema refuses to submit).
 */
import { z } from "zod";

export const translationConfigSchema = z
  .object({
    provider: z.enum(["ollama", "openai-compatible"]),
    model: z.string().min(1, "Pick a model"),
    sourceLanguage: z.string().min(2).max(5),
    targetLanguage: z.string().min(2).max(5),
  })
  .refine((data) => data.sourceLanguage !== data.targetLanguage, {
    message: "Source and target languages must differ",
    path: ["targetLanguage"],
  });

export type TranslationConfigFormValues = z.infer<typeof translationConfigSchema>;
