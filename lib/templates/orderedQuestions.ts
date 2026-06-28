/**
 * Return a template's questions sorted ascending by `order` (FR-TPL-01).
 *
 * Pure and deterministic: copies the input before sorting (never mutates the
 * caller's array) and produces an identical ordering on every call, so the
 * read order is stable and unambiguous. Framework-free.
 *
 * Generic over the element type — it only reads `order` — so callers keep their
 * concrete question type (e.g. the validated `Question` union) on the result
 * without a parallel type or a cast.
 */
export function orderedQuestions<T extends { order: number }>(questions: readonly T[]): T[] {
  return [...questions].sort((a, b) => a.order - b.order);
}
