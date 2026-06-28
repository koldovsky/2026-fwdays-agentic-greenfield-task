// STUB — replaced wholesale by the form/ai-interview slices when
// mode === "form" / "interview" respectively. Do not extend this file with
// real answering UI; build it in the owning slice instead.
// @trace FR-RESP-01 FR-RESP-02

import { uk } from "@/lib/i18n/uk";
import { formatDaysRemaining } from "@/lib/i18n/format";
import type { TemplateSnapshot } from "@/lib/cycles/snapshot";

const t = uk.respondent;

type Props = {
  mode: "form" | "interview";
  subjectFirstName: string;
  methodology: string;
  deadline: Date;
  daysRemaining: number;
  questions: TemplateSnapshot["questions"];
};

/**
 * Placeholder screen shown once a respondent has chosen a mode (FR-RESP-02).
 * Reuses the existing intro/methodology/deadline/question-preview markup the
 * `link` slice built, adds the confidentiality note (FR-RESP-01) and one
 * line acknowledging the chosen mode. NOT the real form or chat UI.
 */
export function ModeStub({
  mode,
  subjectFirstName,
  methodology,
  deadline,
  daysRemaining,
  questions,
}: Props) {
  const deadlineDate = deadline.toISOString().slice(0, 10);
  const deadlineText = formatDaysRemaining(daysRemaining, uk.cycles.overdue);
  const greeting = t.greeting.replace("{name}", subjectFirstName);
  const modeChosenLabel = mode === "form" ? t.modeChosenForm : t.modeChosenInterview;

  return (
    <div className="mx-auto max-w-2xl px-[var(--space-9)] py-[var(--space-10)]">
      <h1 className="text-[var(--text-xl)] font-[var(--weight-semibold)] text-ink">
        {greeting}
      </h1>

      <p className="mt-[var(--space-3)] text-[var(--text-sm)] text-ink-muted">
        {t.confidentiality}
      </p>

      <p className="mt-[var(--space-5)] text-[var(--text-base)] font-[var(--weight-medium)] text-ink">
        {modeChosenLabel}
      </p>
      <p className="mt-[var(--space-2)] text-[var(--text-sm)] text-ink-muted">
        {t.modeStubBody}
      </p>

      {/* Meta */}
      <dl className="mt-[var(--space-8)] grid grid-cols-2 gap-x-[var(--space-9)] gap-y-[var(--space-6)] rounded-[var(--radius-lg)] border border-line-soft bg-surface p-[var(--space-8)]">
        <div>
          <dt className="text-[var(--text-xs)] font-[var(--weight-medium)] text-ink-muted uppercase tracking-wide">
            {t.methodology}
          </dt>
          <dd className="mt-[var(--space-2)] text-[var(--text-base)] text-ink">
            {methodology}
          </dd>
        </div>

        <div>
          <dt className="text-[var(--text-xs)] font-[var(--weight-medium)] text-ink-muted uppercase tracking-wide">
            {t.deadline}
          </dt>
          <dd className="mt-[var(--space-2)] text-[var(--text-base)] text-ink" title={deadlineDate}>
            {deadlineDate} — {deadlineText}
          </dd>
        </div>
      </dl>

      {/* Questions (read-only — answer capture is the form slice) */}
      <section className="mt-[var(--space-9)]">
        <h2 className="mb-[var(--space-6)] text-[var(--text-md)] font-[var(--weight-medium)] text-ink">
          {t.questions}{" "}
          <span className="font-[var(--weight-regular)] text-ink-muted">
            ({questions.length} {t.questionsCount})
          </span>
        </h2>
        <ol className="flex flex-col gap-[var(--space-5)]">
          {questions.map((question, index) => (
            <li
              key={question.id}
              className="rounded-[var(--radius-md)] border border-line-soft bg-surface p-[var(--space-7)]"
            >
              <p className="text-[var(--text-base)] font-[var(--weight-medium)] text-ink">
                {index + 1}. {question.text}
              </p>
              <p className="mt-[var(--space-3)] text-[var(--text-xs)] text-ink-muted">
                {question.type === "scale"
                  ? uk.templates.scaleHint
                  : uk.templates.openHint}
                {" · "}
                {question.required
                  ? uk.templates.requiredLabel
                  : uk.templates.optionalLabel}
              </p>
              {question.type === "scale" ? (
                <ul className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-4)]">
                  {question.anchors.map((anchor) => (
                    <li
                      key={anchor.value}
                      className="rounded-[var(--radius-sm)] border border-line-soft bg-paper px-[var(--space-5)] py-[var(--space-3)] text-[var(--text-xs)] text-ink-muted"
                    >
                      {anchor.value} — {anchor.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
