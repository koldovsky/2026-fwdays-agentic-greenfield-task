import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { uk } from "@/lib/i18n/uk";
import { listTemplates } from "./queries";

/**
 * Seeded templates list (FR-TPL-01, FR-SHELL-03). Server component: fetches the
 * seeded templates, then renders each as a link to its read-only preview. An
 * empty result shows the shared `EmptyState`; a fetch failure throws and is
 * caught by the cabinet `error.tsx` boundary — never a raw 500. There is no
 * nav entry (the cabinet shell lists only Cycles and Employees); this list is
 * reached by URL and, later, from cycle creation.
 */
export default async function TemplatesPage() {
  const t = uk.templates;
  const templates = await listTemplates();

  return (
    <>
      <PageHeader title={t.title} />
      <div className="flex flex-col gap-[var(--space-7)] px-[var(--space-9)] py-[var(--space-8)]">
        <p className="text-[var(--text-base)] text-ink-muted">{t.listSubtitle}</p>
        {templates.length === 0 ? (
          <EmptyState title={t.emptyTitle} body={t.emptyBody} icon={FileText} />
        ) : (
          <ul className="flex flex-col gap-[var(--space-5)]">
            {templates.map((template) => (
              <li key={template.id}>
                <Link
                  href={`/templates/${template.id}`}
                  className="focus-ring flex items-center gap-[var(--space-6)] rounded-[var(--radius-md)] border border-line-soft bg-surface px-[var(--space-7)] py-[var(--space-6)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--line-faint)]"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-[var(--space-3)]">
                    <span className="text-[var(--text-md)] font-[var(--weight-medium)] text-ink">
                      {template.name}
                    </span>
                    <span className="text-[var(--text-base)] text-ink-muted">
                      {t.methodologyLabel}: {template.methodology}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-[var(--space-3)] text-[var(--text-base)] font-[var(--weight-medium)] text-[var(--accent)]">
                    {t.preview}
                    <ChevronRight aria-hidden="true" size={16} strokeWidth={1.8} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
