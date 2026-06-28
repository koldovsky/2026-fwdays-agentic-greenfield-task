// @trace FR-CYCLE-05
import { PageHeader } from "@/components/shell/PageHeader";
import { uk } from "@/lib/i18n/uk";
import { formatDaysRemaining } from "@/lib/i18n/format";
import { getCycleById } from "../queries";
import { deriveStatus, daysRemaining } from "@/lib/cycles/status";

const t = uk.cycles;

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Cycle detail page (FR-CYCLE-05). Server component. Shows subject, methodology,
 * deadline, status, and snapshot questions in order. Unknown id renders a calm
 * not-found message — never a 500. Copy-link and respondent flow are later slices.
 */
export default async function CycleDetailPage({ params }: Props) {
  const { id } = await params;
  const cycle = await getCycleById(id);

  if (cycle === null) {
    return (
      <>
        <PageHeader title={t.detail.subject} />
        <div className="px-[var(--space-9)] py-[var(--space-8)]">
          <p className="text-[var(--text-base)] text-ink-muted">{t.notFound}</p>
        </div>
      </>
    );
  }

  const now = new Date();
  const completedAt = cycle.status === "done" ? cycle.updatedAt : null;
  const status = deriveStatus(
    { completedAt, deadline: cycle.deadline },
    now,
  );
  const days = daysRemaining(cycle.deadline, now);
  const statusLabel = t.status[status];
  const deadlineText = formatDaysRemaining(days, t.overdue);
  const deadlineDate = cycle.deadline.toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title={cycle.subject.fullName} />
      <div className="px-[var(--space-9)] py-[var(--space-8)] flex flex-col gap-[var(--space-8)]">
        {/* Meta card */}
        <dl className="grid grid-cols-2 gap-x-[var(--space-9)] gap-y-[var(--space-6)] rounded-[var(--radius-lg)] border border-line-soft bg-surface p-[var(--space-8)] sm:grid-cols-4">
          <div>
            <dt className="text-[var(--text-xs)] font-[var(--weight-medium)] text-ink-muted uppercase tracking-wide">
              {t.detail.subject}
            </dt>
            <dd className="mt-[var(--space-2)] text-[var(--text-base)] text-ink">
              {cycle.subject.fullName}
            </dd>
          </div>

          <div>
            <dt className="text-[var(--text-xs)] font-[var(--weight-medium)] text-ink-muted uppercase tracking-wide">
              {t.detail.methodology}
            </dt>
            <dd className="mt-[var(--space-2)] text-[var(--text-base)] text-ink">
              {cycle.snapshot?.methodology ?? "—"}
            </dd>
          </div>

          <div>
            <dt className="text-[var(--text-xs)] font-[var(--weight-medium)] text-ink-muted uppercase tracking-wide">
              {t.detail.deadline}
            </dt>
            <dd className="mt-[var(--space-2)] text-[var(--text-base)] text-ink" title={deadlineDate}>
              {deadlineDate} — {deadlineText}
            </dd>
          </div>

          <div>
            <dt className="text-[var(--text-xs)] font-[var(--weight-medium)] text-ink-muted uppercase tracking-wide">
              {t.detail.status}
            </dt>
            <dd className="mt-[var(--space-2)] text-[var(--text-base)] text-ink">
              {statusLabel}
            </dd>
          </div>
        </dl>

        {/* Questions */}
        {cycle.snapshot !== null ? (
          <section>
            <h2 className="mb-[var(--space-6)] text-[var(--text-md)] font-[var(--weight-medium)] text-ink">
              {t.detail.questions}
            </h2>
            <ol className="flex flex-col gap-[var(--space-5)]">
              {cycle.snapshot.questions.map((question, index) => (
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
                    {" "}
                    {question.required
                      ? `· ${uk.templates.requiredLabel}`
                      : `· ${uk.templates.optionalLabel}`}
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
        ) : null}
      </div>
    </>
  );
}
