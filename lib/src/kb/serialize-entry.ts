// TYPED THROWING STUB — red state for kb-learning tasks.md B.3/B.4. The
// types and `serializeKbEntry` signature below are the contract pinned by
// serialize-entry.test.ts; the body (including the private
// `escapeHeadingLines` helper design.md Decision 5 names) is implemented in
// B.4. No logic lives here yet — same "single Not-implemented throw"
// convention as this slice's validate-answer.ts red round.
//
// Framework-free pure core (TC-PURE-01): pure, synchronous, no I/O, no
// filesystem access — `lib/` never appends to `knowledge/school.md` itself
// (design.md Decision 5's pure/impure split); this module only produces the
// TEXT to append. `apps/dashboard/lib/kb-write.ts` (task E.1) owns the
// actual `fs.appendFileSync` call.
//
// CONTRACT (design.md Decision 5, step 3 — "One-action admin answer",
// baseline spec.md's "Heading-like answer lines are escaped on append"
// scenario). `serializeKbEntry` is called ONLY after `validateAnswerText`
// has already accepted the answer (this module performs no validation of
// its own and cannot fail — no error return).
//
// EXACT OUTPUT SHAPE this test file pins down (the implementer in B.4 MUST
// match this, not invent a different one):
//
//   serializeKbEntry({ question, answer }) ===
//     "\n## " + question + "\n\n" + escapeHeadingLines(answer) + "\n"
//
// i.e. a leading blank line (so simple string concatenation onto an
// existing `knowledge/school.md` file — regardless of whether that file
// already ends with a trailing newline — never runs the new entry's `##`
// heading onto the same line as the previous entry's last line), an ATX
// level-2 heading line containing the question VERBATIM, a blank line, the
// (heading-escaped) answer, and a trailing newline.
//
// `escapeHeadingLines` (PRIVATE — not exported, matching design.md
// Decision 5's own naming): splits the answer on "\n" and, for any line
// whose FIRST character(s) at column 0 are 1-6 `#` characters immediately
// followed by whitespace or end-of-line (i.e. would parse as a CommonMark
// ATX heading — covers the baseline spec's own examples `#`, `##`,
// `### ` verbatim), prefixes that run of `#` characters with a single
// backslash (`\`) — the standard CommonMark literal-character escape,
// e.g. "# Нова тема" -> "\# Нова тема". A line whose `#` characters are NOT
// at column 0, or are not followed by whitespace/EOL (e.g. a hashtag mid-
// sentence, or "#tag" with no space), is left untouched: only a genuine
// heading-marker-shaped line is escaped, per the baseline spec's own
// "Heading-like answer lines are escaped" wording. Every other line is
// returned byte-identical.

export interface KbEntryInput {
  question: string;
  answer: string;
}

/**
 * Escapes any line that would parse as a CommonMark ATX heading marker (1-6
 * `#` characters at column 0 immediately followed by whitespace or
 * end-of-line) by prefixing that `#` run with a literal backslash. Every
 * other line — mid-line `#`, "#tag" with no trailing whitespace, or a
 * normal line — is returned byte-identical. Private: not exported, matching
 * design.md Decision 5's own naming.
 */
function escapeHeadingLines(text: string): string {
  return text
    .split("\n")
    .map((line) => (/^#{1,6}(?:\s|$)/.test(line) ? `\\${line}` : line))
    .join("\n");
}

/**
 * Flattens a question to a single logical line before it is spliced into an
 * ATX heading line. `entry.question` is the model's verbatim quote of the
 * lead's free-text message (lead-controlled input) — it can contain
 * embedded `\r`/`\n`, and a raw splice of a question whose own lines start
 * with `#` would inject a SECOND heading into `knowledge/school.md`,
 * splitting one entry into two (a KB-poisoning vector). A question is
 * semantically one line, so any run of `\r`/`\n`/whitespace collapses to a
 * single space, and leading/trailing whitespace is trimmed.
 */
function flattenQuestionToOneLine(question: string): string {
  return question.replace(/\s+/g, " ").trim();
}

export function serializeKbEntry(entry: KbEntryInput): string {
  return `\n## ${flattenQuestionToOneLine(entry.question)}\n\n${escapeHeadingLines(entry.answer)}\n`;
}
