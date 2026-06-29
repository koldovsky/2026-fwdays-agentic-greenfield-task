// @trace FR-CYCLE-05 FR-LINK-02 FR-PROGRESS-01 FR-PROGRESS-02 FR-PROGRESS-03 NFR-A11Y-02
import type { ReactNode } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { ScaleDots } from "@/components/data/ScaleDots";
import { uk } from "@/lib/i18n/uk";
import { formatDaysRemaining } from "@/lib/i18n/format";
import { getCycleResults, getSummary, type CycleResults, type ResultAnswer } from "../queries";
import { isAnswerValid } from "@/lib/cycles/progress";
import { CopyLinkButton } from "./CopyLinkButton";
import { LiveProgress } from "./LiveProgress";
import { QuestionDialog } from "./QuestionDialog";
import { ReportSection } from "./ReportSection";
import { DeleteCycleButton } from "./DeleteCycleButton";

const t = uk.cycles;

type Props = {
  params: Promise<{ id: string }>;
};

type ResultQuestion = CycleResults["questions"][number];

/**
 * Cycle detail / results screen (FR-CYCLE-05, FR-PROGRESS-01..03). Server
 * component. Shows subject/methodology/deadline/status, live answered/total
 * progress (polled client-side), and each snapshot question with the
 * respondent's answer rendered by type — the five-dot scale with its numeral
 * for `scale`, full text for `open` — an explicit "not answered yet" state
 * otherwise, and an on-demand raw AI dialog for interview-answered questions.
 * Unknown id renders a calm not-found, never a 500.
 */
export default async function CycleDetailPage({ params }: Props) {
  const { id } = await params;
  const results = await getCycleResults(id);
  const summary = results !== null ? await getSummary(id) : null;

  if (results === null) {
    return (
      <>
        <PageHeader title={t.detail.subject} />
        <div className="px-[var(--space-9)] py-[var(--space-8)]">
          <p className="text-[var(--text-base)] text-ink-muted">{t.notFound}</p>
        </div>
      </>
    );
  }

  const statusLabel = t.status[results.status];
  const deadlineText = formatDaysRemaining(results.daysRemaining, t.overdue, t.lastDayToday);
  const deadlineDate = results.deadline.toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title={results.subjectFullName} />
      <div className="px-[var(--space-9)] py-[var(--space-8)] flex flex-col gap-[var(--space-8)]">
        <dl className="grid grid-cols-2 gap-x-[var(--space-9)] gap-y-[var(--space-6)] rounded-[var(--radius-lg)] border border-line-soft bg-surface p-[var(--space-8)] sm:grid-cols-4">
          <Meta label={t.detail.subject} value={results.subjectFullName} />
          <Meta label={t.detail.methodology} value={results.methodology} />
          <Meta label={t.detail.deadline} value={`${deadlineDate} — ${deadlineText}`} title={deadlineDate} />
          <Meta label={t.detail.status} value={statusLabel} />
        </dl>

        <LiveProgress
          cycleId={results.id}
          initial={results.progress}
          poll={results.status === "collecting"}
        />

        <div>
          <CopyLinkButton token={results.token} />
        </div>

        <section>
          <h2 className="mb-[var(--space-6)] text-[var(--text-md)] font-[var(--weight-medium)] text-ink">
            {t.results.answersTitle}
          </h2>
          {results.questions.length === 0 ? (
            <EmptyState title={t.results.emptyTitle} body={t.results.emptyBody} />
          ) : (
            <ol className="flex flex-col gap-[var(--space-5)]">
              {results.questions.map((question, index) => (
                <li
                  key={question.id}
                  className="rounded-[var(--radius-md)] border border-line-soft bg-surface p-[var(--space-7)]"
                >
                  <p className="text-[var(--text-base)] font-[var(--weight-medium)] text-ink">
                    {index + 1}. {question.text}
                  </p>
                  <AnswerView
                    cycleId={results.id}
                    question={question}
                    answer={results.answers[question.id]}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>

        <ReportSection cycleId={results.id} isDone={results.status === "done"} summary={summary} />

        <div className="border-t border-line-soft pt-[var(--space-7)]">
          <DeleteCycleButton cycleId={results.id} />
        </div>
      </div>
    </>
  );
}

function Meta({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div>
      <dt className="text-[var(--text-xs)] font-[var(--weight-medium)] text-ink-muted uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-[var(--space-2)] text-[var(--text-base)] text-ink" title={title}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Renders one question's recorded answer by type, or an explicit unanswered
 * state. A `scale` answer shows the five-dot scale with its numeral + label; an
 * `open` answer shows the full text (wrapped). A capped-out interview row that
 * holds no valid answer is shown as unanswered with an "answer not counted"
 * note, never a fabricated value.
 */
function AnswerView({
  cycleId,
  question,
  answer,
}: {
  cycleId: string;
  question: ResultQuestion;
  answer: ResultAnswer | undefined;
}) {
  const t2 = uk.cycles.results;
  const dialog = answer?.hasDialog === true ? <QuestionDialog cycleId={cycleId} questionId={question.id} /> : null;

  if (question.type === "scale") {
    const value = answer?.scaleValue ?? null;
    if (value !== null && isAnswerValid(question, value)) {
      const max = Math.max(...question.anchors.map((a) => a.value));
      const label = question.anchors.find((a) => a.value === value)?.label ?? "";
      return (
        <div className="mt-[var(--space-4)]">
          <div className="flex items-center gap-[var(--space-5)]">
            <ScaleDots value={value} max={max} />
            <span className="text-[var(--text-base)] text-ink">
              {value}
              {label.length > 0 ? ` — ${label}` : ""}
            </span>
          </div>
          {dialog}
        </div>
      );
    }
    return <Unanswered insufficient={answer?.insufficient === true} note={t2} dialog={dialog} />;
  }

  // open
  const text = answer?.text ?? null;
  if (text !== null && text.trim().length > 0) {
    return (
      <div className="mt-[var(--space-4)]">
        <p className="whitespace-pre-wrap break-words text-[var(--text-base)] text-ink">{text}</p>
        {dialog}
      </div>
    );
  }
  return <Unanswered insufficient={answer?.insufficient === true} note={t2} dialog={dialog} />;
}

function Unanswered({
  insufficient,
  note,
  dialog,
}: {
  insufficient: boolean;
  note: typeof uk.cycles.results;
  dialog: ReactNode;
}) {
  return (
    <div className="mt-[var(--space-4)]">
      <p className="text-[var(--text-sm)] text-ink-muted">
        {note.notAnswered}
        {insufficient ? ` · ${note.insufficient}` : ""}
      </p>
      {dialog}
    </div>
  );
}
