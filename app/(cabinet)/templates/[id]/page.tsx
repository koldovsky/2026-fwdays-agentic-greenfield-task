import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { uk } from "@/lib/i18n/uk";
import type { Question } from "@/lib/schemas/template";
import { getTemplatePreview } from "../queries";

/**
 * Read-only template preview (FR-TPL-03, NFR-A11Y-01). Server component: loads
 * the template with its ordered questions and renders it exactly as the
 * respondent would see it — name, methodology tag, each question in order, with
 * `scale` questions showing their labelled anchors as a read-only option list
 * and `open` questions showing a read-only free-text prompt. Nothing is saved
 * (the preview persists no answers). An unknown id renders a calm Ukrainian
 * not-found state, never a raw 500. The route lives in the proxy-guarded
 * cabinet group, so an unauthenticated request redirects to sign-in.
 */
export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = uk.templates;
  const { id } = await params;
  const template = await getTemplatePreview(id);

  if (template === null) {
    return (
      <>
        <PageHeader title={t.previewTitle} />
        <div className="flex flex-col gap-[var(--space-7)] px-[var(--space-9)] py-[var(--space-8)]">
          <EmptyState title={t.notFoundTitle} body={t.notFoundBody} />
          <div className="flex justify-center">
            <BackToList />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={template.name} />
      <div className="flex flex-col gap-[var(--space-8)] px-[var(--space-9)] py-[var(--space-8)]">
        <div className="flex flex-col gap-[var(--space-4)]">
          <p className="text-[var(--text-base)] text-ink-muted">
            {t.methodologyLabel}: {template.methodology}
          </p>
          <p
            role="note"
            className="rounded-[var(--radius-md)] border border-line-soft bg-[var(--line-faint)] px-[var(--space-6)] py-[var(--space-5)] text-[var(--text-base)] text-ink-muted"
          >
            {t.previewNote}
          </p>
        </div>

        <ol className="flex flex-col gap-[var(--space-8)]">
          {template.questions.map((question, index) => (
            <li key={question.id} className="flex flex-col gap-[var(--space-5)]">
              <div className="flex flex-col gap-[var(--space-3)]">
                <span className="text-[var(--text-md)] font-[var(--weight-medium)] text-ink">
                  {index + 1}. {question.text}
                </span>
                <span className="text-[var(--text-xs)] text-ink-muted">
                  {question.required ? t.requiredLabel : t.optionalLabel}
                </span>
              </div>
              <QuestionPreview question={question} />
            </li>
          ))}
        </ol>

        <BackToList />
      </div>
    </>
  );
}

/** A back link to the templates list. */
function BackToList() {
  return (
    <Link
      href="/templates"
      className="focus-ring inline-flex w-fit items-center gap-[var(--space-3)] rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-3)] text-[var(--text-base)] text-ink-muted transition-colors duration-[var(--motion-fast)] hover:text-ink"
    >
      <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
      {uk.templates.backToList}
    </Link>
  );
}

/**
 * Render one question in respondent form, read-only. `scale` shows its labelled
 * anchors as a disabled radio option list; `open` shows a disabled free-text
 * area. Disabled controls submit nothing, so the preview saves nothing.
 */
function QuestionPreview({ question }: { question: Question }) {
  const t = uk.templates;

  if (question.type === "scale") {
    return (
      <fieldset
        disabled
        aria-describedby={`${question.id}-hint`}
        className="flex flex-col gap-[var(--space-4)]"
      >
        <span id={`${question.id}-hint`} className="text-[var(--text-xs)] text-ink-muted">
          {t.scaleHint}
        </span>
        {question.anchors.map((anchor) => (
          <label
            key={anchor.value}
            className="flex items-center gap-[var(--space-4)] text-[var(--text-base)] text-ink"
          >
            <input
              type="radio"
              name={question.id}
              value={anchor.value}
              disabled
              readOnly
              className="h-[var(--space-6)] w-[var(--space-6)] accent-[var(--accent)]"
            />
            <span>{anchor.label}</span>
          </label>
        ))}
      </fieldset>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <span className="text-[var(--text-xs)] text-ink-muted">{t.openHint}</span>
      <textarea
        rows={3}
        disabled
        readOnly
        placeholder={t.openPlaceholder}
        aria-label={question.text}
        className="w-full resize-none rounded-[var(--radius-md)] border border-line-soft bg-[var(--line-faint)] px-[var(--space-6)] py-[var(--space-5)] text-[var(--text-base)] text-ink-muted"
      />
    </div>
  );
}
