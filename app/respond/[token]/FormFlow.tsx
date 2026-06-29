"use client";
// @trace FR-FORM-01 FR-FORM-02 FR-FORM-03 FR-FORM-04 NFR-A11Y-02 NFR-I18N-01

import { useState, useTransition } from "react";
import { uk } from "@/lib/i18n/uk";
import { formatDaysRemaining } from "@/lib/i18n/format";
import { EmptyState } from "@/components/states/EmptyState";
import type { TemplateSnapshot } from "@/lib/cycles/snapshot";
import { ScaleAnswerField } from "./ScaleAnswerField";
import { OpenAnswerField } from "./OpenAnswerField";
import { saveAnswer } from "./form-actions";

const t = uk.respondent;

type Question = TemplateSnapshot["questions"][number];

type Props = {
  token: string;
  questions: TemplateSnapshot["questions"];
  savedAnswers: Record<string, number | string>;
  subjectFirstName: string;
  methodology: string;
  deadline: Date;
  daysRemaining: number;
};

/**
 * True when `answers[question.id]` is a valid, persisted answer for
 * `question` — same per-type rule `isResponseComplete` and
 * `firstUnansweredRequiredQuestion` use (scale: numeric anchor match; open:
 * non-empty trimmed string). Duplicated intentionally and independently
 * tested rather than shared, per design.md's documented ADR-worthy
 * follow-up (the three call sites are each ~6 lines and drift would surface
 * as a test mismatch, not a silent bug).
 */
function isValidAnswerForQuestion(
  question: Question,
  answer: number | string | undefined,
): boolean {
  if (question.type === "scale") {
    if (typeof answer !== "number") return false;
    return question.anchors.some((anchor) => anchor.value === answer);
  }
  return typeof answer === "string" && answer.trim().length > 0;
}

/**
 * Walks ALL questions (required and optional) in order and returns the
 * index of the first one lacking a valid saved answer — the resume
 * position for the sequential one-question-per-screen walk-through.
 * Unlike `firstUnansweredRequiredQuestion` (which deliberately skips
 * optional questions to find the completion-blocking gap), this walk never
 * skips a question, so an optional question is always shown once reached —
 * fixing the defect where optional questions were never rendered. Returns
 * `questions.length` when every question already has a valid answer.
 */
function findResumeIndex(
  questions: TemplateSnapshot["questions"],
  answers: Record<string, number | string>,
): number {
  for (let i = 0; i < questions.length; i += 1) {
    if (!isValidAnswerForQuestion(questions[i], answers[questions[i].id])) {
      return i;
    }
  }
  return questions.length;
}

/**
 * The real form-mode answering UI (FR-FORM-01..04). Replaces ModeStub for
 * `cycle.mode === "form"` only (design.md Decision 4) — ModeStub itself is
 * untouched. Owns local state for the current question index, the
 * in-progress value, the pending autosave transition, and inline
 * validation messages.
 *
 * Navigation walks every question in array order (`currentIndex` is a
 * plain incrementing index over ALL questions, required and optional
 * alike) — `firstUnansweredRequiredQuestion` is used ONLY to decide, once
 * on mount, whether the cycle is already fully complete (every required
 * question answered), never as the per-question selector.
 *
 * No client-visible loading state is reachable here on first paint: the
 * page is already server-rendered with `savedAnswers`/`questions` resolved
 * (design.md task 4.6) — LoadingState is reserved for a future slow
 * client-side re-fetch path, not used by this component today.
 */
export function FormFlow({
  token,
  questions,
  savedAnswers,
  subjectFirstName,
  methodology,
  deadline,
  daysRemaining,
}: Props) {
  const [answers, setAnswers] = useState(savedAnswers);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Walk EVERY question in order (required and optional). Completion is reaching
  // the end of the list, not "all required answered" — so a trailing optional
  // question is shown and answerable rather than skipped when the last required
  // answer auto-completes the cycle (FR-FORM-04).
  const [currentIndex, setCurrentIndex] = useState(() =>
    findResumeIndex(questions, savedAnswers),
  );

  const currentQuestion: Question | null =
    currentIndex < questions.length ? questions[currentIndex] : null;

  // Local, in-progress value for the current question (not yet saved). A
  // resumed scale answer hydrates from `answers`; `null` means "no
  // selection yet" — never a sentinel numeric value, so a legitimate
  // negative anchor value (e.g. -1) is never mistaken for "unanswered".
  const [localValue, setLocalValue] = useState<number | string | null>(() => {
    if (currentQuestion === null) return null;
    return answers[currentQuestion.id] ?? (currentQuestion.type === "scale" ? null : "");
  });
  const [hydratedQuestionId, setHydratedQuestionId] = useState(currentQuestion?.id ?? null);

  // Re-hydrate localValue and clear any stale inline error when the current
  // question changes (after a successful save/skip advances the index).
  // This is React's documented "store previous value" pattern — calling
  // setState conditionally during render (not in an effect) is explicitly
  // permitted when the update depends only on current props/state and causes
  // React to discard the current render and immediately re-render with the
  // new state. See: https://react.dev/learn/you-might-not-need-an-effect
  if (currentQuestion !== null && currentQuestion.id !== hydratedQuestionId) {
    setHydratedQuestionId(currentQuestion.id);
    setLocalValue(answers[currentQuestion.id] ?? (currentQuestion.type === "scale" ? null : ""));
    setError(null);
  }

  if (questions.length === 0) {
    return <EmptyState title={t.formEmptyTitle} body={t.formEmptyBody} />;
  }

  if (currentQuestion === null) {
    return <FormComplete />;
  }

  const position = t.questionPosition
    .replace("{n}", String(currentIndex + 1))
    .replace("{m}", String(questions.length));

  const isEmpty = currentQuestion.type === "scale"
    ? typeof localValue !== "number"
    : typeof localValue !== "string" || localValue.trim().length === 0;

  function handleAdvance() {
    if (currentQuestion === null) return;

    if (currentQuestion.required && isEmpty) {
      setError(t.formRequiredMissing);
      return;
    }

    setError(null);

    // An unanswered OPTIONAL question advances without writing any Answer
    // row — "blank optional answers recorded as unanswered" (FR-FORM-04),
    // not as an empty string/zero value.
    if (!currentQuestion.required && isEmpty) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    // Build a type-safe payload before entering the async transition.
    // Type narrowing on question.type gives TypeScript the discriminant it
    // needs — no `as` casts required.
    if (currentQuestion.type === "scale") {
      if (typeof localValue !== "number") {
        setError(t.formRequiredMissing);
        return;
      }
      const value = localValue;
      const questionId = currentQuestion.id;
      startTransition(async () => {
        const result = await saveAnswer({
          token,
          answer: { type: "scale", questionId, value },
        });
        if (!result.ok) { setError(result.error); return; }
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
        setCurrentIndex((index) => index + 1);
      });
    } else {
      if (typeof localValue !== "string") {
        setError(t.formRequiredMissing);
        return;
      }
      const text = localValue;
      const questionId = currentQuestion.id;
      startTransition(async () => {
        const result = await saveAnswer({
          token,
          answer: { type: "open", questionId, text },
        });
        if (!result.ok) { setError(result.error); return; }
        setAnswers((prev) => ({ ...prev, [questionId]: text }));
        setCurrentIndex((index) => index + 1);
      });
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-[var(--space-9)] py-[var(--space-10)]">
      <h1 className="text-[var(--text-xl)] font-[var(--weight-semibold)] text-ink">
        {t.greeting.replace("{name}", subjectFirstName)}
      </h1>

      <p className="mt-[var(--space-3)] text-[var(--text-sm)] text-ink-muted">
        {t.confidentiality}
      </p>

      <dl className="mt-[var(--space-6)] grid grid-cols-2 gap-x-[var(--space-9)] gap-y-[var(--space-4)] text-[var(--text-sm)]">
        <div>
          <dt className="text-ink-muted">{t.methodology}</dt>
          <dd className="mt-[var(--space-1)] text-ink">{methodology}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{t.deadline}</dt>
          <dd className="mt-[var(--space-1)] text-ink">
            {deadline.toISOString().slice(0, 10)} —{" "}
            {formatDaysRemaining(daysRemaining, uk.cycles.overdue, uk.cycles.lastDayToday)}
          </dd>
        </div>
      </dl>

      <p className="mt-[var(--space-8)] text-[var(--text-xs)] font-[var(--weight-medium)] uppercase tracking-wide text-ink-muted">
        {position}
      </p>

      <p className="mt-[var(--space-4)] text-[var(--text-md)] font-[var(--weight-medium)] text-ink">
        {currentQuestion.text}
      </p>

      <div className="mt-[var(--space-6)]">
        {currentQuestion.type === "scale" ? (
          <ScaleAnswerField
            questionId={currentQuestion.id}
            anchors={currentQuestion.anchors}
            value={typeof localValue === "number" ? localValue : null}
            onChange={(value) => setLocalValue(value)}
            error={error ?? undefined}
          />
        ) : (
          <OpenAnswerField
            questionId={currentQuestion.id}
            value={typeof localValue === "string" ? localValue : ""}
            onChange={(value) => setLocalValue(value)}
            error={error ?? undefined}
          />
        )}
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={handleAdvance}
        className="focus-ring mt-[var(--space-8)] rounded-[var(--radius-md)] border border-line-strong bg-[var(--accent)] px-[var(--space-7)] py-[var(--space-5)] text-[var(--text-base)] font-[var(--weight-medium)] text-white transition-colors duration-[var(--motion-fast)] disabled:opacity-60"
      >
        {pending ? t.formAdvancing : t.formNext}
      </button>
    </div>
  );
}

/**
 * The quiet completion confirmation (FR-FORM-04): exactly one calm
 * sentence, no confetti, no celebratory animation, no sound. Rendered both
 * when a save just completed the cycle and when the resume target is
 * already null on initial render (a reopened, already-completed link).
 */
function FormComplete() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-[var(--space-9)] py-[var(--space-10)]">
      <div className="text-center">
        <p className="text-[var(--text-xl)] font-[var(--weight-semibold)] text-ink">
          {t.formCompleteTitle}
        </p>
        <p className="mt-[var(--space-4)] text-[var(--text-base)] text-ink-muted">
          {t.formComplete}
        </p>
      </div>
    </div>
  );
}
