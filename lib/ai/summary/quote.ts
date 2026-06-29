// @trace FR-REPORT-02 TC-PURE-01

/**
 * Quote-grounding helpers — pure, framework-free. A summary quote must be
 * verbatim text from a collected answer (FR-REPORT-02). Matching uses a defined
 * normalisation so it is deterministic for Ukrainian (non-Latin) text: Unicode
 * NFC, trimmed, internal whitespace collapsed to single spaces, CASE-SENSITIVE.
 */

export function normalizeForMatch(text: string): string {
  return text.normalize("NFC").trim().replace(/\s+/g, " ");
}

/**
 * True when `quote`, after normalisation, occurs within `answerText` after the
 * same normalisation. An empty normalised quote never matches (so a blank quote
 * cannot be passed off as grounded).
 */
export function quoteOccursInAnswer(quote: string, answerText: string): boolean {
  const normalizedQuote = normalizeForMatch(quote);
  if (normalizedQuote.length === 0) return false;
  return normalizeForMatch(answerText).includes(normalizedQuote);
}
