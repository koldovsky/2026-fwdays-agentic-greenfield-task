"use client";

// Clarify step UI (FR-WIZARD-02/03): renders the analysis phase's clarifying
// questions and lets the user answer, skip, or decline each one. Pure UI — it
// holds only local form state and emits the collected ClarifyingAnswer[] up to
// the view on submit; it never calls a route and imports no other feature (FSD:
// a feature is one user action). Unanswered questions NEVER block proceeding
// (FR-WIZARD-03): a blank, untouched question submits as `skipped`.
import { useState } from "react";
import type { ClarifyingAnswer, ClarifyingQuestion } from "@/entities/clarifying-question";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";

export interface ClarifyingQuestionsProps {
  readonly questions: readonly ClarifyingQuestion[];
  /** Fired with one answer per question when the user proceeds to generation. */
  readonly onSubmit: (answers: readonly ClarifyingAnswer[]) => void;
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

/** Local per-question form state. `choice` wins over `answerText` on submit. */
interface FormEntry {
  readonly answerText: string;
  readonly choice: "skipped" | "declined" | null;
}

const EMPTY: FormEntry = { answerText: "", choice: null };

const textareaClass =
  "mt-2 w-full rounded-sm border border-hairline bg-white px-3 py-2 text-base text-ink " +
  "placeholder:text-ink-faint focus:outline-2 focus:outline-offset-1 focus:outline-brand " +
  "disabled:bg-surface-warm disabled:text-ink-faint";

function toAnswer(question: ClarifyingQuestion, entry: FormEntry): ClarifyingAnswer {
  if (entry.choice === "declined") return { questionId: question.id, status: "declined" };
  const trimmed = entry.answerText.trim();
  // Explicit skip OR a blank/untouched question → skipped (never blocks, FR-WIZARD-03).
  if (entry.choice === "skipped" || trimmed === "") {
    return { questionId: question.id, status: "skipped" };
  }
  return { questionId: question.id, status: "answered", answerText: trimmed };
}

export function ClarifyingQuestions({ questions, onSubmit, locale = "ua" }: ClarifyingQuestionsProps) {
  const copy = t(locale).wizard;
  const [entries, setEntries] = useState<Record<string, FormEntry>>({});

  const entryFor = (id: string): FormEntry => entries[id] ?? EMPTY;
  const patch = (id: string, next: Partial<FormEntry>) =>
    setEntries((prev) => ({ ...prev, [id]: { ...entryFor(id), ...next } }));

  const setAnswer = (id: string, answerText: string) =>
    // Typing an answer clears any prior skip/decline — answering overrides.
    patch(id, { answerText, choice: null });
  const toggleChoice = (id: string, choice: "skipped" | "declined") =>
    patch(id, { choice: entryFor(id).choice === choice ? null : choice });

  const handleSubmit = () => onSubmit(questions.map((q) => toAnswer(q, entryFor(q.id))));

  return (
    <section aria-label={copy.clarifyRegionLabel} className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl tracking-tight text-ink">{copy.clarifyHeading}</h2>
        <p className="mt-2 max-w-2xl font-body text-base text-ink-soft">{copy.clarifyLead}</p>
      </div>

      <ol className="flex flex-col gap-5">
        {questions.map((question) => {
          const entry = entryFor(question.id);
          const inactive = entry.choice !== null;
          return (
            <li
              key={question.id}
              className="rounded-xl border border-hairline bg-white p-5 shadow-card"
            >
              <fieldset>
                <legend className="text-base font-semibold text-ink">{question.text}</legend>
                <textarea
                  rows={3}
                  className={textareaClass}
                  placeholder={copy.answerPlaceholder}
                  aria-label={question.text}
                  value={entry.answerText}
                  disabled={inactive}
                  onChange={(e) => setAnswer(question.id, e.target.value)}
                />
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleChoice(question.id, "skipped")}
                  >
                    {copy.skipAction}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleChoice(question.id, "declined")}
                  >
                    {copy.declineAction}
                  </Button>
                  {entry.choice !== null && (
                    <span className="text-sm text-ink-faint">
                      {entry.choice === "skipped" ? copy.skippedLabel : copy.declinedLabel}
                    </span>
                  )}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>

      {/* Never blocks: proceeding is always allowed regardless of answers (FR-WIZARD-03). */}
      <div>
        <Button type="button" size="md" onClick={handleSubmit}>
          {copy.clarifySubmitAction}
        </Button>
      </div>
    </section>
  );
}
