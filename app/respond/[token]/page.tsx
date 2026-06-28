// @trace FR-LINK-01 FR-LINK-02 FR-LINK-03
import { uk } from "@/lib/i18n/uk";
import { formatDaysRemaining } from "@/lib/i18n/format";
import { tokenBoundarySchema } from "./schemas";
import { getRespondentCycleByToken } from "./queries";

const t = uk.respondent;

type Props = {
  params: Promise<{ token: string }>;
};

function CalmMessagePage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-[var(--space-9)]">
      <div className="max-w-md text-center">
        <p className="font-[var(--weight-medium)] text-ink">{title}</p>
        <p className="mt-[var(--space-4)] text-ink-muted">{body}</p>
      </div>
    </div>
  );
}

/**
 * Public respondent landing page (FR-LINK-01, FR-LINK-03). No authentication.
 * All non-collecting states render the same calm page design — no leaking of
 * cycle existence via HTTP codes or distinct error messages (BC-PRIVACY-02).
 */
export default async function RespondentPage({ params }: Props) {
  const { token } = await params;

  // Validate token format before any DB call (TC-VALID-01, Decision 2).
  // Same calm page for malformed and unknown tokens — no oracle.
  const parseResult = tokenBoundarySchema.safeParse(token);
  if (!parseResult.success) {
    return <CalmMessagePage title={t.notFound} body={t.notFoundBody} />;
  }

  const cycle = await getRespondentCycleByToken(parseResult.data);

  if (cycle === null) {
    return <CalmMessagePage title={t.notFound} body={t.notFoundBody} />;
  }

  if (cycle.status === "done") {
    return <CalmMessagePage title={t.done} body={t.doneBody} />;
  }

  if (cycle.status === "expired") {
    return <CalmMessagePage title={t.expired} body={t.expiredBody} />;
  }

  // status === "collecting"
  const deadlineDate = cycle.deadline.toISOString().slice(0, 10);
  const deadlineText = formatDaysRemaining(cycle.daysRemaining, uk.cycles.overdue);
  const greeting = t.greeting.replace("{name}", cycle.subjectFirstName);

  return (
    <div className="mx-auto max-w-2xl px-[var(--space-9)] py-[var(--space-10)]">
      <h1 className="text-[var(--text-xl)] font-[var(--weight-semibold)] text-ink">
        {greeting}
      </h1>

      {/* Meta */}
      <dl className="mt-[var(--space-8)] grid grid-cols-2 gap-x-[var(--space-9)] gap-y-[var(--space-6)] rounded-[var(--radius-lg)] border border-line-soft bg-surface p-[var(--space-8)]">
        <div>
          <dt className="text-[var(--text-xs)] font-[var(--weight-medium)] text-ink-muted uppercase tracking-wide">
            {t.methodology}
          </dt>
          <dd className="mt-[var(--space-2)] text-[var(--text-base)] text-ink">
            {cycle.methodology}
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
            ({cycle.questions.length} {t.questionsCount})
          </span>
        </h2>
        <ol className="flex flex-col gap-[var(--space-5)]">
          {cycle.questions.map((question, index) => (
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
